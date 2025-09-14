import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { ResourceOperations } from '../../help/type/IResource';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import {
	MsgType,
	EventType,
	ReceiveMessage,
	FullClientRequest
} from '../../utils/protocols';

// WebSocket import - will be dynamically imported
let WebSocket: any;

// Helper function to generate UUID
function generateUUID(): string {
	return crypto.randomUUID();
}

// Helper function to generate MD5 hash for caching
function generateMD5(text: string, speaker: string, audioParams: any): string {
	const content = JSON.stringify({ text, speaker, audioParams });
	return crypto.createHash('md5').update(content).digest('hex');
}

// Helper function to generate cache key based on settings
function generateCacheKey(
	text: string,
	speaker: string,
	audioParams: any,
	cacheKeySettings: any
): string {
	const cacheKeyMode = cacheKeySettings?.cacheKeyMode || 'auto';

	if (cacheKeyMode === 'custom') {
		const customCacheKey = (cacheKeySettings?.customCacheKey as string) || '';
		const calculateMD5 = cacheKeySettings?.calculateMD5 !== false;
		return calculateMD5 ? crypto.createHash('md5').update(customCacheKey).digest('hex') : customCacheKey;
	} else {
		// Auto mode - use existing logic with additional parameters
		const additionalParams = cacheKeySettings?.additionalParams || '';
		const content = JSON.stringify({ text, speaker, audioParams, additionalParams });
		return crypto.createHash('md5').update(content).digest('hex');
	}
}

// Helper function to check if cached file exists
function getCachedFilePath(md5: string, format: string, cacheDir: string): string {
	return path.join(cacheDir, `${md5}.${format}`);
}

// Helper function to ensure cache directory exists
function ensureCacheDir(cacheDir: string): void {
	if (!fs.existsSync(cacheDir)) {
		fs.mkdirSync(cacheDir, { recursive: true });
	}
}

// Helper function to process audio output based on format
function processAudioOutput(
	result: IDataObject,
	audioBuffer: Buffer,
	outputFormat: string,
	format: string,
	index: number,
	executeFunctions: IExecuteFunctions
): IDataObject {
	switch (outputFormat) {
		case 'base64':
			return {
				...result,
				audioData: audioBuffer.toString('base64'),
			};

		case 'buffer':
			return {
				...result,
				audioBuffer: {
					length: audioBuffer.length,
					type: format,
					sampleRate: result.sampleRate,
				},
			};

		case 'binary':
			const outputBinary = 'audio';
			const outputFileName = `synthesized_audio.${format}`;
			const fileSize = audioBuffer.length;

			// Set appropriate MIME type based on format
			let mimeType = `audio/${format}`;
			if (format === 'wav') {
				mimeType = 'audio/wav';
			} else if (format === 'ogg_opus') {
				mimeType = 'audio/ogg';
			}

			return {
				json: result,
				binary: {
					[outputBinary]: {
						data: audioBuffer.toString('base64'),
						mimeType: mimeType,
						fileName: outputFileName,
						fileSize: fileSize.toString(),
					},
				},
				pairedItem: {
					item: index,
				},
			};

		case 'file':
			const outputFilePath = executeFunctions.getNodeParameter('outputFilePath', index) as string;

			try {
				// Ensure directory exists
				const dir = path.dirname(outputFilePath);
				if (!fs.existsSync(dir)) {
					fs.mkdirSync(dir, { recursive: true });
				}

				// Write file
				fs.writeFileSync(outputFilePath, audioBuffer);
				return {
					...result,
					filePath: outputFilePath,
				};
			} catch (fileError: any) {
				executeFunctions.logger.error('Failed to save audio file', {
					filePath: outputFilePath,
					error: fileError.message
				});
				throw new Error(`Failed to save audio file: ${fileError.message}`);
			}

		default:
			return result;
	}
}

const SpeechSynthesizerOperate: ResourceOperations = {
	name: 'Synthesize Speech',
	value: 'speechSynthesizer',
	description: 'Convert text to speech using VolcEngine AI Speech Synthesizer',
	options: [
		{
			displayName: 'App ID',
			name: 'appId',
			type: 'string',
			default: '',
			description: 'VolcEngine AI App ID for authentication',
			required: true,
		},
		{
			displayName: 'Resource ID',
			name: 'resourceId',
			type: 'string',
			default: 'volc.service_type.10029',
			description: 'VolcEngine AI Resource ID for speech synthesis service',
			required: true,
		},
		{
			displayName: 'Text to Synthesize',
			name: 'text',
			type: 'string',
			default: '',
			description: 'Text content to be synthesized into speech',
			required: true,
		},
		{
			displayName: 'Speaker',
			name: 'speaker',
			type: 'string',
			default: 'zh_female_shuangkuaisisi_moon_bigtts',
			description: 'Voice speaker for speech synthesis. See: https://www.volcengine.com/docs/6561/1257544.',
			required: true,
		},
		{
			displayName: 'Audio Format',
			name: 'format',
			type: 'options',
			options: [
				{ name: 'MP3', value: 'mp3' },
				{ name: 'OGG Opus', value: 'ogg_opus' },
				{ name: 'PCM', value: 'pcm' },
				{ name: 'WAV', value: 'wav' },
			],
			default: 'mp3',
			description: 'Audio encoding format',
		},
		{
			displayName: 'Sample Rate',
			name: 'sampleRate',
			type: 'options',
			options: [
				{ name: '8000 Hz', value: 8000 },
				{ name: '16000 Hz', value: 16000 },
				{ name: '22050 Hz', value: 22050 },
				{ name: '24000 Hz', value: 24000 },
				{ name: '32000 Hz', value: 32000 },
				{ name: '44100 Hz', value: 44100 },
				{ name: '48000 Hz', value: 48000 },
			],
			default: 24000,
			description: 'Audio sample rate in Hz',
		},
		{
			displayName: 'Bit Rate',
			name: 'bitRate',
			type: 'number',
			default: 128000,
			description: 'Audio bit rate (only for MP3 format)',
			typeOptions: {
				minValue: 16000,
				maxValue: 320000,
			},
		},
		{
			displayName: 'Speech Rate',
			name: 'speechRate',
			type: 'number',
			default: 0,
			description: 'Speech rate (-50 to 100, where 100 is 2.0x speed, -50 is 0.5x speed)',
			typeOptions: {
				minValue: -50,
				maxValue: 100,
			},
		},
		{
			displayName: 'Volume',
			name: 'volume',
			type: 'number',
			default: 0,
			description: 'Volume level (-50 to 100, where 100 is 2.0x volume, -50 is 0.5x volume)',
			typeOptions: {
				minValue: -50,
				maxValue: 100,
			},
		},
		{
			displayName: 'Emotion',
			name: 'emotion',
			type: 'string',
			default: '',
			description: 'Set voice emotion (e.g., "angry", "happy"). Only supported by some voices.',
		},
		{
			displayName: 'Emotion Scale',
			name: 'emotionScale',
			type: 'number',
			default: 4,
			description: 'Emotion intensity (1-5, only used when emotion is set)',
			typeOptions: {
				minValue: 1,
				maxValue: 5,
			},
		},
		{
			displayName: 'Enable Timestamp',
			name: 'enableTimestamp',
			type: 'boolean',
			default: false,
			description: 'Whether to enable word-level timestamp',
		},
		{
			displayName: 'Model Version',
			name: 'model',
			type: 'string',
			default: 'seed-tts-1.1',
			description: 'Model version (seed-tts-1.1 for better quality and lower latency)',
		},
		{
			displayName: 'Output Format',
			name: 'outputFormat',
			type: 'options',
			options: [
				{ name: 'Binary Data', value: 'binary' },
				{ name: 'Base64 Encoded Audio', value: 'base64' },
				{ name: 'Audio Buffer Info', value: 'buffer' },
				{ name: 'Audio File Path', value: 'file' },
			],
			default: 'binary',
			description: 'How to return the synthesized audio data',
		},
		{
			displayName: 'Output File Path',
			name: 'outputFilePath',
			type: 'string',
			default: './synthesized_audio.mp3',
			description: 'File path to save the synthesized audio (only used when Output Format is "Audio File Path")',
			displayOptions: {
				show: {
					outputFormat: ['file'],
				},
			},
		},
		{
			displayName: 'Enable Local Cache',
			name: 'enableCache',
			type: 'boolean',
			default: false,
			description: 'Whether to enable local audio file caching based on text MD5',
		},
		{
			displayName: 'Cache Directory',
			name: 'cacheDir',
			type: 'string',
			default: './cache/audio',
			description: 'Directory to store cached audio files',
			displayOptions: {
				show: {
					enableCache: [true],
				},
			},
		},
		{
			displayName: 'Cache Key Settings',
			name: 'cacheKeySettings',
			type: 'collection',
			default: {},
			description: 'Settings for cache key generation',
			displayOptions: {
				show: {
					enableCache: [true],
				},
			},
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
					displayOptions: {
						show: {
							cacheKeyMode: ['custom'],
						},
					},
				},
				{
					displayName: 'Calculate MD5 Hash',
					name: 'calculateMD5',
					type: 'boolean',
					default: true,
					description: 'Whether to calculate MD5 hash of the custom cache key (only for "Custom String")',
					displayOptions: {
						show: {
							cacheKeyMode: ['custom'],
						},
					},
				},
				{
					displayName: 'Additional Parameters',
					name: 'additionalParams',
					type: 'string',
					default: '',
					description: 'Additional parameters to include in auto-generated cache key (optional)',
					displayOptions: {
						show: {
							cacheKeyMode: ['auto'],
						},
					},
				},
			],
		},
		{
			displayName: 'Additional Options',
			name: 'additionalOptions',
			type: 'collection',
			default: {},
			placeholder: 'Add Option',
			options: [
				{
					displayName: 'Context Language',
					name: 'contextLanguage',
					type: 'string',
					default: '',
					description: 'Reference language for Western languages (e.g., "ID", "es", "pt")',
				},
				{
					displayName: 'Disable Emoji Filter',
					name: 'disableEmojiFilter',
					type: 'boolean',
					default: false,
					description: 'Whether to disable emoji filtering',
				},
				{
					displayName: 'Disable Markdown Filter',
					name: 'disableMarkdownFilter',
					type: 'boolean',
					default: false,
					description: 'Whether to disable markdown parsing and filtering',
				},
				{
					displayName: 'Enable Language Detector',
					name: 'enableLanguageDetector',
					type: 'boolean',
					default: false,
					description: 'Whether to enable automatic language detection',
				},
				{
					displayName: 'Explicit Language',
					name: 'explicitLanguage',
					type: 'string',
					default: '',
					description: 'Specify language for synthesis (e.g., "zh", "en", "ja")',
				},
				{
					displayName: 'Silence Duration',
					name: 'silenceDuration',
					type: 'number',
					default: 0,
					description: 'Add silence duration at the end (0-30000ms)',
					typeOptions: {
						minValue: 0,
						maxValue: 30000,
					},
				},
			],
		},
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		// Dynamically import WebSocket
		if (!WebSocket) {
			try {
				WebSocket = (await import('ws')).default;
			} catch (error) {
				throw new Error('WebSocket library not found. Please install ws package: npm install ws');
			}
		}

		// Get all required parameters
		const appId = this.getNodeParameter('appId', index) as string;
		const resourceId = this.getNodeParameter('resourceId', index) as string;
		const text = this.getNodeParameter('text', index) as string;
		const speaker = this.getNodeParameter('speaker', index) as string;
		const format = this.getNodeParameter('format', index) as string;
		const sampleRate = this.getNodeParameter('sampleRate', index) as number;
		const bitRate = this.getNodeParameter('bitRate', index) as number;
		const speechRate = this.getNodeParameter('speechRate', index) as number;
		const volume = this.getNodeParameter('volume', index) as number;
		const emotion = this.getNodeParameter('emotion', index) as string;
		const emotionScale = this.getNodeParameter('emotionScale', index) as number;
		const enableTimestamp = this.getNodeParameter('enableTimestamp', index) as boolean;
		const model = this.getNodeParameter('model', index) as string;
		const outputFormat = this.getNodeParameter('outputFormat', index) as string;
		const enableCache = this.getNodeParameter('enableCache', index) as boolean;
		const cacheDir = enableCache ? (this.getNodeParameter('cacheDir', index) as string) : './cache/audio';
		const cacheKeySettings = enableCache ? (this.getNodeParameter('cacheKeySettings', index, {}) as IDataObject) : {};
		const additionalOptions = this.getNodeParameter('additionalOptions', index, {}) as IDataObject;

		// Get credentials
		const credentials = await this.getCredentials('volcengineAiApi') as {
			accessToken: string;
		};

		// Generate MD5 for caching
		const audioParams = {
			format,
			sample_rate: sampleRate,
			bit_rate: bitRate,
			speech_rate: speechRate,
			loudness_rate: volume,
			emotion,
			emotion_scale: emotionScale,
			enable_timestamp: enableTimestamp,
			model,
			...additionalOptions
		};

		const cacheKey = enableCache ? generateCacheKey(text, speaker, audioParams, cacheKeySettings) : generateMD5(text, speaker, audioParams);

		// Check cache if enabled
		if (enableCache) {
			ensureCacheDir(cacheDir);
			const cachedFilePath = getCachedFilePath(cacheKey, format, cacheDir);

			if (fs.existsSync(cachedFilePath)) {
				this.logger.info('Using cached audio file', { filePath: cachedFilePath });

				const cachedAudioData = fs.readFileSync(cachedFilePath);
				const result: IDataObject = {
					success: true,
					message: 'Audio generated from cache',
					text: text,
					speaker: speaker,
					format: format,
					sampleRate: sampleRate,
					audioSize: cachedAudioData.length,
					cached: true,
					cacheFilePath: cachedFilePath,
				};

				return processAudioOutput(result, cachedAudioData, outputFormat, format, index, this);
			}
		}

		// Create WebSocket connection
		const wsUrl = 'wss://openspeech.bytedance.com/api/v3/tts/unidirectional/stream';

		return new Promise(async (resolve, reject) => {
			try {
				const ws = new WebSocket(wsUrl, {
					headers: {
						'X-Api-App-Key': appId,
						'X-Api-Access-Key': credentials.accessToken,
						'X-Api-Resource-Id': resourceId,
						'X-Api-Connect-Id': generateUUID(),
					}
				});

				// Wait for connection to open
				await new Promise<void>((resolve, reject) => {
					ws.on('open', resolve);
					ws.on('error', reject);
				});

				this.logger.debug('WebSocket connection opened');

				// Prepare request payload according to official documentation
				const requestPayload = {
					user: {
						uid: generateUUID()
					},
					req_params: {
						text: text,
						speaker: speaker,
						audio_params: {
							format: format,
							sample_rate: sampleRate,
							bit_rate: bitRate,
							speech_rate: speechRate,
							loudness_rate: volume,
							enable_timestamp: enableTimestamp,
							...(emotion && { emotion: emotion, emotion_scale: emotionScale }),
						},
						...(model && { model: model }),
						additions: JSON.stringify({
							...(additionalOptions.silenceDuration && { silence_duration: additionalOptions.silenceDuration }),
							...(additionalOptions.enableLanguageDetector && { enable_language_detector: additionalOptions.enableLanguageDetector }),
							...(additionalOptions.disableMarkdownFilter && { disable_markdown_filter: additionalOptions.disableMarkdownFilter }),
							...(additionalOptions.disableEmojiFilter && { disable_emoji_filter: additionalOptions.disableEmojiFilter }),
							...(additionalOptions.explicitLanguage && { explicit_language: additionalOptions.explicitLanguage }),
							...(additionalOptions.contextLanguage && { context_language: additionalOptions.contextLanguage }),
						})
					}
				};

				// Send text request using official protocol
				await FullClientRequest(ws, new TextEncoder().encode(JSON.stringify(requestPayload)));

				let audioData: Buffer[] = [];
				let isCompleted = false;

				// Process messages
				while (true) {
					const msg = await ReceiveMessage(ws);
					this.logger.debug(`Received message: ${msg.toString()}`);

					switch (msg.type) {
						case MsgType.FullServerResponse:
							if (msg.event === EventType.SessionFinished) {
								isCompleted = true;
								this.logger.debug('TTS session finished');

								// Process audio data
								const fullAudioBuffer = Buffer.concat(audioData);

								// Save to cache if enabled
								if (enableCache && fullAudioBuffer.length > 0) {
									ensureCacheDir(cacheDir);
									const cachedFilePath = getCachedFilePath(cacheKey, format, cacheDir);
									fs.writeFileSync(cachedFilePath, fullAudioBuffer);
									this.logger.info('Audio saved to cache', { filePath: cachedFilePath });
								}

								const result: IDataObject = {
									success: true,
									message: 'Speech synthesis completed successfully',
									text: text,
									speaker: speaker,
									format: format,
									sampleRate: sampleRate,
									audioSize: fullAudioBuffer.length,
									cached: false,
								};

								// Process output based on format
								const output = processAudioOutput(result, fullAudioBuffer, outputFormat, format, index, this);
								ws.close();
								resolve(output);
								return;
							}
							break;

						case MsgType.AudioOnlyServer:
							// Audio data
							audioData.push(Buffer.from(msg.payload));
							this.logger.debug(`Received audio data chunk: ${msg.payload.length} bytes`);
							break;

						default:
							this.logger.debug(`Unknown message type: ${msg.type}`);
					}

					if (isCompleted) {
						break;
					}
				}

			} catch (error: any) {
				this.logger.error('WebSocket error', { error: error.message });
				reject(new Error(`WebSocket error: ${error.message}`));
			}
		});
	},
};

export default SpeechSynthesizerOperate;
