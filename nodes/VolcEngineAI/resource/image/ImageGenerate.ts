import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { ResourceOperations } from '../../help/type/IResource';
import VolcengineAiRequestUtils from '../../utils/VolcengineAiRequestUtils';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';

function generateMD5FromParams(params: any): string {
	const content = JSON.stringify(params || {});
	return crypto.createHash('md5').update(content).digest('hex');
}

function ensureCacheDir(cacheDir: string): void {
	if (!fs.existsSync(cacheDir)) {
		fs.mkdirSync(cacheDir, { recursive: true });
	}
}

function getCachedFilePath(cacheKey: string, index: number, format: string, cacheDir: string): string {
	return path.join(cacheDir, `${cacheKey}_${index}.${format}`);
}

function downloadImage(imageUrl: string): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		const isHttps = imageUrl.startsWith('https');
		const lib = isHttps ? https : http;
		const req = lib.get(imageUrl, { headers: { 'User-Agent': 'n8n-volcengine-ai-node/1.0.0' } }, (res) => {
			if (!res || (res.statusCode && res.statusCode >= 400)) {
				reject(new Error(`Failed to download image. Status: ${res?.statusCode}`));
				return;
			}
			const chunks: Buffer[] = [];
			res.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
			res.on('end', () => resolve(Buffer.concat(chunks)));
		});
		req.on('error', reject);
		req.setTimeout(300000, () => {
			req.destroy(new Error('Image download timeout after 300s'));
		});
	});
}

const ImageGenerate: ResourceOperations = {
	name: 'Image Generate',
	value: 'imageGenerate',
	description: 'Call Volcengine Ark Images API (/images/generations) to generate images',
	options: [
		{
			displayName: 'Model',
			name: 'model',
			type: 'options',
			default: 'doubao-seedream-4-0-250828',
			options: [
				{ name: 'doubao-seedream-4.0', value: 'doubao-seedream-4-0-250828' },
				{ name: 'doubao-seedream-3.0-t2i', value: 'doubao-seedream-3-0-t2i-250415' },
				{ name: 'doubao-seededit-3.0-i2i', value: 'doubao-seededit-3-0-i2i-250628' },
			],
			description: 'Model ID (you can replace with the latest version)',
		},
		{
			displayName: 'Prompt',
			name: 'prompt',
			type: 'string',
			default: '',
			description: 'Text prompt for image generation (<=300 Chinese chars or <=600 English words recommended)',
			required: true,
		},
		{
			displayName: 'Image (URL or Data URL, Comma-Separated)',
			name: 'image',
			type: 'string',
			default: '',
			description: 'Image-to-image/multi-image fusion/multi-reference. Leave empty for text-to-image. Up to 10 images',
		},
		{
			displayName: 'Size',
			name: 'size',
			type: 'string',
			default: '2048x2048',
			description: 'Use 1K/2K/4K or widthxheight (e.g. 2048x2048). Do not mix the two modes.',
		},
		{
			displayName: 'Sequential Image Generation',
			name: 'sequential_image_generation',
			type: 'options',
			default: 'disabled',
			options: [
				{ name: 'Disabled', value: 'disabled' },
				{ name: 'Auto', value: 'auto' },
			],
			description: 'Only supported by doubao-seedream-4.0',
		},
		{
			displayName: 'Max Images',
			name: 'max_images',
			type: 'number',
			default: 3,
			description: 'Max number of images for sequential generation (1-15)',
			typeOptions: { minValue: 1, maxValue: 15 },
			displayOptions: { show: { sequential_image_generation: ['auto'] } },
		},
		// Stream option removed per requirement
		{
			displayName: 'Watermark',
			name: 'watermark',
			type: 'boolean',
			default: true,
			description: 'Whether to add "AI Generated" watermark',
		},
		{
			displayName: 'Seed',
			name: 'seed',
			type: 'number',
			default: -1,
			description: 'Only supported by doubao-seedream-3.0-t2i and doubao-seededit-3.0-i2i (-1 for random)',
			displayOptions: { show: { model: ['doubao-seedream-3-0-t2i-250415', 'doubao-seededit-3-0-i2i-250628'] } },
		},
		{
			displayName: 'Guidance Scale',
			name: 'guidance_scale',
			type: 'number',
			default: 0,
			description: 'How closely the output follows the prompt (1-10; 0 uses model default)',
			typeOptions: { minValue: 0, maxValue: 10 },
			displayOptions: { show: { model: ['doubao-seedream-3-0-t2i-250415', 'doubao-seededit-3-0-i2i-250628'] } },
		},
		{
			displayName: 'Output Format',
			name: 'outputFormat',
			type: 'options',
			options: [
				{ name: 'Base64 Encoded Image', value: 'base64' },
				{ name: 'Binary Data', value: 'binary' },
				{ name: 'Complete JSON', value: 'json' },
				{ name: 'Image Buffer Info', value: 'buffer' },
				{ name: 'Image File Path', value: 'file' },
				{ name: 'URL Only', value: 'url' },
			],
			default: 'url',
			description: 'How to return the generated image data',
		},
		{
			displayName: 'Output File Path',
			name: 'outputFilePath',
			type: 'string',
			default: './output/image.jpg',
			description: 'File path to save the generated images (used when Output Format is "Image File Path")',
			displayOptions: { show: { outputFormat: ['file'] } },
		},
		{
			displayName: 'Enable Local Cache',
			name: 'enableCache',
			type: 'boolean',
			default: false,
			description: 'Whether to enable local image file caching based on request parameters',
		},
		{
			displayName: 'Cache Directory',
			name: 'cacheDir',
			type: 'string',
			default: './cache/image',
			description: 'Directory to store cached image files (relative to n8n working directory)',
			displayOptions: { show: { enableCache: [true] } },
		},
		{
			displayName: 'Cache Key Settings',
			name: 'cacheKeySettings',
			type: 'collection',
			default: {},
			description: 'Settings for cache key generation',
			displayOptions: { show: { enableCache: [true] } },
			options: [
				{
					displayName: 'Cache Key Mode',
					name: 'cacheKeyMode',
					type: 'options',
					options: [
						{ name: 'Auto Generate (Params)', value: 'auto', description: 'Automatically generate cache key based on request parameters' },
						{ name: 'Custom String', value: 'custom', description: 'Use a custom string as cache key' },
					],
					default: 'auto',
					description: 'How to generate the cache key',
				},
				{
					displayName: 'Custom Cache Key',
					name: 'customCacheKey',
					type: 'string',
					default: '',
					description: 'Custom string as cache key (only when Cache Key Mode is "Custom String")',
					displayOptions: { show: { cacheKeyMode: ['custom'] } },
				},
				{
					displayName: 'Calculate MD5 Hash',
					name: 'calculateMD5',
					type: 'boolean',
					default: true,
					description: 'Whether to calculate MD5 hash of the custom cache key (only for "Custom String")',
					displayOptions: { show: { cacheKeyMode: ['custom'] } },
				},
				{
					displayName: 'Additional Parameters',
					name: 'additionalParams',
					type: 'string',
					default: '',
					description: 'Additional parameters to include in auto-generated cache key (optional)',
					displayOptions: { show: { cacheKeyMode: ['auto'] } },
				},
			],
		},
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		this.logger.info('Starting image generation process', { index });

		const model = this.getNodeParameter('model', index) as string;
		const prompt = this.getNodeParameter('prompt', index) as string;
		const imageInput = (this.getNodeParameter('image', index) as string || '').trim();
		const size = this.getNodeParameter('size', index) as string;

		this.logger.debug('Image generation parameters', {
			model,
			prompt: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''),
			imageInput: imageInput ? 'provided' : 'empty',
			size
		});
		// Safe getters to avoid "Could not find property" when fields are hidden/not present
		const getParam = <T>(name: string, def: T): T => {
			try { return this.getNodeParameter(name, index) as T; } catch { return def; }
		};
		const getParamExtract = <T>(name: string, def: T): T => {
			try { return this.getNodeParameter(name, index, def as any, { extractValue: true }) as T; } catch { return def; }
		};

		const sequentialImageGeneration = getParam<string>('sequential_image_generation', 'disabled');
		const maxImages = sequentialImageGeneration === 'auto' ? getParamExtract<number>('max_images', 3) : undefined;
		// stream removed
		const watermark = getParam<boolean>('watermark', true);
		const seed = getParamExtract<number>('seed', -1);
		const guidanceScale = getParamExtract<number>('guidance_scale', 0);
		const outputFormat = getParam<string>('outputFormat', 'url');
		const enableCache = getParam<boolean>('enableCache', false);
		const cacheKeySettings = getParam<IDataObject>('cacheKeySettings', {});
		const cacheDir = enableCache ? getParam<string>('cacheDir', './cache/image') : './cache/image';
		const outputFilePath = outputFormat === 'file' ? getParam<string>('outputFilePath', './output/image.jpg') : './output/image.jpg';

		this.logger.debug('Output configuration', {
			outputFormat,
			enableCache,
			cacheDir,
			outputFilePath
		});

		let image: string | string[] | undefined = undefined;
		if (imageInput) {
			const list = imageInput.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
			image = list.length > 1 ? list : list[0];
		}

		const body: IDataObject = {
			model,
			prompt,
			watermark,
		};
		if (image !== undefined) body.image = image as any;
		if (size) body.size = size;

		if (['doubao-seedream-3-0-t2i-250415', 'doubao-seededit-3-0-i2i-250628'].includes(model)) {
			if (typeof seed === 'number' && seed !== -1) body.seed = seed;
			if (typeof guidanceScale === 'number' && guidanceScale > 0) body.guidance_scale = guidanceScale;
		}
		if (model.startsWith('doubao-seedream-4-0')) {
			if (sequentialImageGeneration) body.sequential_image_generation = sequentialImageGeneration;
			if (sequentialImageGeneration === 'auto' && typeof maxImages === 'number') {
				body.sequential_image_generation_options = { max_images: maxImages };
			}
			// stream removed
		}

		// Cache pre-check (skip API if cached and output is not URL)
		if (enableCache && outputFormat !== 'url') {
			ensureCacheDir(cacheDir);
			const cacheKeyMode = cacheKeySettings?.cacheKeyMode || 'auto';
			let cacheKey = '';
			if (cacheKeyMode === 'custom') {
				const customCacheKey = (cacheKeySettings?.customCacheKey as string) || '';
				const calculateMD5 = cacheKeySettings?.calculateMD5 !== false;
				cacheKey = calculateMD5 ? crypto.createHash('md5').update(customCacheKey).digest('hex') : customCacheKey;
			} else {
				const additionalParams = cacheKeySettings?.additionalParams || '';
				cacheKey = generateMD5FromParams({ model, prompt, image, size, sequentialImageGeneration, maxImages, watermark, seed, guidanceScale, additionalParams });
			}
			// try to read cached files (continuous indices)
			const cachedBuffers: Buffer[] = [];
			for (let i = 0; i < 100; i++) {
				const filePath = getCachedFilePath(cacheKey, i, 'jpg', cacheDir);
				if (fs.existsSync(filePath)) {
					cachedBuffers.push(fs.readFileSync(filePath));
				} else {
					break;
				}
			}
			if (cachedBuffers.length > 0) {
				// Return from cache
				if (outputFormat === 'base64' || outputFormat === 'json') {
					const imagesBase64 = cachedBuffers.map((b) => b.toString('base64'));
					return { model, created: undefined, imagesBase64, usage: undefined, raw: { cached: true }};
				}
				if (outputFormat === 'buffer') {
					const imagesBufferInfo = cachedBuffers.map((b) => ({ length: b.length, type: 'jpg' }));
					return { model, created: undefined, imagesBufferInfo, usage: undefined, raw: { cached: true }};
				}
				if (outputFormat === 'binary') {
					const binary: Record<string, any> = {};
					cachedBuffers.forEach((buf, idx) => {
						binary[`image${idx}`] = {
							data: buf.toString('base64'),
							mimeType: 'image/jpeg',
							fileName: `cached_image_${idx}.jpg`,
							fileSize: String(buf.length),
						};
					});
					return { json: { model, cached: true }, binary, pairedItem: { item: index } } as unknown as IDataObject;
				}
				if (outputFormat === 'file') {
					const outPath = outputFilePath;
					const parsed = path.parse(outPath);
					if (parsed.dir && !fs.existsSync(parsed.dir)) fs.mkdirSync(parsed.dir, { recursive: true });
					const filePaths: string[] = [];
					cachedBuffers.forEach((buf, idx) => {
						const numberedName = cachedBuffers.length > 1 ? `${parsed.name}_${idx}${parsed.ext || '.jpg'}` : `${parsed.name}${parsed.ext || '.jpg'}`;
						const fullPath = parsed.dir ? path.join(parsed.dir, numberedName) : numberedName;
						fs.writeFileSync(fullPath, buf);
						filePaths.push(fullPath);
					});
					return { model, filePaths, raw: { cached: true }};
				}
			}
		}

		// Choose response_format based on output requirement
		const effectiveResponseFormat: 'url' | 'b64_json' = outputFormat === 'url' ? 'url' : 'b64_json';
		body.response_format = effectiveResponseFormat;

		this.logger.info('Making API request to Volcengine AI', {
			url: 'https://ark.cn-beijing.volces.com/api/v3/images/generations',
			responseFormat: effectiveResponseFormat,
			bodyKeys: Object.keys(body)
		});

		const res = await VolcengineAiRequestUtils.request.call(this, {
			method: 'POST',
			url: 'https://ark.cn-beijing.volces.com/api/v3/images/generations',
			body,
		});

		this.logger.debug('API response received', {
			hasData: !!(res as any)?.data,
			dataLength: Array.isArray((res as any)?.data) ? (res as any).data.length : 0,
			model: (res as any)?.model,
			created: (res as any)?.created
		});

		const dataArray: any[] = Array.isArray((res as any)?.data) ? (res as any).data : [];
		const modelId = (res as any)?.model;
		const created = (res as any)?.created;
		const usage = (res as any)?.usage;

		if (outputFormat === 'url') {
			const images = dataArray.filter((d) => d && d.url).map((d) => ({ url: d.url, size: d.size }));
			this.logger.info('Returning URL format result', { imageCount: images.length });
			return { model: modelId, created, images, usage, raw: res};
		}

		// For Complete JSON mode, return the raw response directly
		if (outputFormat === 'json') {
			this.logger.info('Returning complete JSON response', {
				hasData: !!(res as any)?.data,
				dataLength: dataArray.length
			});
			return res as IDataObject;
		}

		// Build buffers for all images
		this.logger.info('Processing images', { totalImages: dataArray.length });
		const imageBuffers: Buffer[] = [];
		for (let i = 0; i < dataArray.length; i++) {
			const item = dataArray[i];
			this.logger.debug(`Processing image ${i + 1}/${dataArray.length}`, {
				hasB64: !!item?.b64_json,
				hasUrl: !!item?.url,
				size: item?.size
			});

			if (item?.b64_json) {
				this.logger.debug(`Using base64 data for image ${i + 1}`);
				imageBuffers.push(Buffer.from(item.b64_json, 'base64'));
			} else if (item?.url) {
				this.logger.info(`Downloading image ${i + 1} from URL`, { url: item.url });
				try {
					const buf = await downloadImage(item.url);
					this.logger.debug(`Downloaded image ${i + 1}`, { size: buf.length });
					imageBuffers.push(buf);
				} catch (error: any) {
					this.logger.error(`Failed to download image ${i + 1}`, {
						url: item.url,
						error: error.message
					});
					throw new Error(`Failed to download image ${i + 1}: ${error.message}`);
				}
			} else {
				this.logger.warn(`Image ${i + 1} has no valid data`, { item });
			}
		}

		this.logger.info('Image processing completed', {
			processedImages: imageBuffers.length,
			totalImages: dataArray.length
		});

		// Save to cache if enabled
		if (enableCache && imageBuffers.length > 0) {
			this.logger.info('Saving images to cache', { imageCount: imageBuffers.length });
			const cacheKeyMode = cacheKeySettings?.cacheKeyMode || 'auto';
			let cacheKey = '';
			if (cacheKeyMode === 'custom') {
				const customCacheKey = (cacheKeySettings?.customCacheKey as string) || '';
				const calculateMD5 = cacheKeySettings?.calculateMD5 !== false;
				cacheKey = calculateMD5 ? crypto.createHash('md5').update(customCacheKey).digest('hex') : customCacheKey;
			} else {
				const additionalParams = cacheKeySettings?.additionalParams || '';
				cacheKey = generateMD5FromParams({ model, prompt, image, size, sequentialImageGeneration, maxImages, watermark, seed, guidanceScale, additionalParams });
			}

			this.logger.debug('Cache configuration', { cacheKey, cacheDir });
			ensureCacheDir(cacheDir);

			imageBuffers.forEach((buf, idx) => {
				const cachedFilePath = getCachedFilePath(cacheKey, idx, 'jpg', cacheDir);
				try {
					fs.writeFileSync(cachedFilePath, buf);
					this.logger.debug(`Cached image ${idx + 1}`, {
						filePath: cachedFilePath,
						size: buf.length
					});
				} catch (error: any) {
					this.logger.error(`Failed to cache image ${idx + 1}`, {
						filePath: cachedFilePath,
						error: error.message
					});
				}
			});
			this.logger.info('Cache save completed', { cachedImages: imageBuffers.length });
		}

		const baseResult: IDataObject = { model: modelId, created, usage };
		const imageFormat = 'jpg';

		if (outputFormat === 'base64') {
			const imagesBase64 = imageBuffers.map((b) => b.toString('base64'));
			return { ...baseResult, imagesBase64, raw: res};
		}

		if (outputFormat === 'buffer') {
			const imagesBufferInfo = imageBuffers.map((b) => ({ length: b.length, type: imageFormat }));
			return { ...baseResult, imagesBufferInfo, raw: res};
		}

		if (outputFormat === 'binary') {
			const binary: Record<string, any> = {};
			imageBuffers.forEach((buf, idx) => {
				binary[`image${idx}`] = {
					data: buf.toString('base64'),
					mimeType: `image/${imageFormat}`,
					fileName: `generated_image_${idx}.${imageFormat}`,
					fileSize: String(buf.length),
				};
			});
			return { json: baseResult, binary, pairedItem: { item: index } } as unknown as IDataObject;
		}

		if (outputFormat === 'file') {
			this.logger.info('Saving images to files', {
				outputPath: outputFilePath,
				imageCount: imageBuffers.length
			});
			const outPath = outputFilePath;
			const parsed = path.parse(outPath);

			// Ensure output directory exists
			if (parsed.dir && !fs.existsSync(parsed.dir)) {
				this.logger.debug('Creating output directory', { dir: parsed.dir });
				fs.mkdirSync(parsed.dir, { recursive: true });
			}

			const filePaths: string[] = [];
			imageBuffers.forEach((buf, idx) => {
				const numberedName = imageBuffers.length > 1 ?
					`${parsed.name}_${idx}${parsed.ext || `.${imageFormat}`}` :
					`${parsed.name}${parsed.ext || `.${imageFormat}`}`;
				const fullPath = parsed.dir ? path.join(parsed.dir, numberedName) : numberedName;

				try {
					fs.writeFileSync(fullPath, buf);
					this.logger.debug(`Saved image ${idx + 1}`, {
						filePath: fullPath,
						size: buf.length
					});
					filePaths.push(fullPath);
				} catch (error: any) {
					this.logger.error(`Failed to save image ${idx + 1}`, {
						filePath: fullPath,
						error: error.message
					});
					throw new Error(`Failed to save image ${idx + 1}: ${error.message}`);
				}
			});

			this.logger.info('File save completed', { savedFiles: filePaths.length });
			return { ...baseResult, filePaths, raw: res};
		}

		// json
		const imagesBase64 = imageBuffers.map((b) => b.toString('base64'));
		return { ...baseResult, imagesBase64, raw: res};
	},
};

export default ImageGenerate;
