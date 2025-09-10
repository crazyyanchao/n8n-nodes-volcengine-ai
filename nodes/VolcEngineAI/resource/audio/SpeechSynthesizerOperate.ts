import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { ResourceOperations } from '../../help/type/IResource';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// WebSocket import - will be dynamically imported
let WebSocket: any;

// WebSocket binary protocol constants
const PROTOCOL_VERSION = 0b0001;
const HEADER_SIZE = 0b0001;
const MESSAGE_TYPE_SEND_TEXT = 0b0001;
const SERIALIZATION_JSON = 0b0001;
const COMPRESSION_NONE = 0b0000;
const MESSAGE_FLAGS_WITH_EVENT = 0b0100;

// Event codes
const EVENT_TTS_SENTENCE_START = 350;
const EVENT_TTS_SENTENCE_END = 351;
const EVENT_TTS_RESPONSE = 352;
const EVENT_SESSION_FINISHED = 152;

// Helper function to create binary frame
function createBinaryFrame(messageType: number, serialization: number, compression: number, eventCode: number, payload: Buffer): Buffer {
	const header = Buffer.alloc(4);
	header[0] = (PROTOCOL_VERSION << 4) | HEADER_SIZE;
	header[1] = (messageType << 4) | MESSAGE_FLAGS_WITH_EVENT;
	header[2] = (serialization << 4) | compression;
	header[3] = 0; // Reserved

	const eventBuffer = Buffer.alloc(4);
	eventBuffer.writeUInt32BE(eventCode, 0);

	const payloadSizeBuffer = Buffer.alloc(4);
	payloadSizeBuffer.writeUInt32BE(payload.length, 0);

	return Buffer.concat([header, eventBuffer, payloadSizeBuffer, payload]);
}

// Helper function to parse binary frame
function parseBinaryFrame(buffer: Buffer): { eventCode: number; payload: Buffer } {
	if (buffer.length < 8) {
		throw new Error('Invalid frame: too short');
	}

	const eventCode = buffer.readUInt32BE(4);
	const payloadSize = buffer.readUInt32BE(8);
	const payload = buffer.slice(12, 12 + payloadSize);

	return { eventCode, payload };
}

// Helper function to generate MD5 hash for caching
function generateMD5(text: string, speaker: string, audioParams: any): string {
	const content = JSON.stringify({ text, speaker, audioParams });
	return crypto.createHash('md5').update(content).digest('hex');
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

			return {
				json: result,
				binary: {
					[outputBinary]: {
						data: audioBuffer.toString('base64'),
						mimeType: `audio/${format}`,
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
		const additionalOptions = this.getNodeParameter('additionalOptions', index, {}) as IDataObject;

		// Get credentials
		const credentials = await this.getCredentials('volcengineAiApi') as {
			accessKey: string;
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

		const md5Hash = generateMD5(text, speaker, audioParams);

		// Check cache if enabled
		if (enableCache) {
			ensureCacheDir(cacheDir);
			const cachedFilePath = getCachedFilePath(md5Hash, format, cacheDir);

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

		return new Promise((resolve, reject) => {
			const ws = new WebSocket(wsUrl, {
				headers: {
					'X-Api-App-Id': appId,
					'X-Api-Access-Key': credentials.accessKey,
					'X-Api-Resource-Id': resourceId,
					'X-Api-Request-Id': crypto.randomUUID(),
				}
			});

			let audioData: Buffer[] = [];
			let isCompleted = false;
			let hasError = false;

			ws.on('open', () => {
				this.logger.debug('WebSocket connection opened');

				// Prepare request payload
				const requestPayload = {
					user: {
						uid: 'n8n-user'
					},
					event: 'SendText',
					namespace: 'BidirectionalTTS',
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
						additions: {
							...(additionalOptions.silenceDuration && { silence_duration: additionalOptions.silenceDuration }),
							...(additionalOptions.enableLanguageDetector && { enable_language_detector: additionalOptions.enableLanguageDetector }),
							...(additionalOptions.disableMarkdownFilter && { disable_markdown_filter: additionalOptions.disableMarkdownFilter }),
							...(additionalOptions.disableEmojiFilter && { disable_emoji_filter: additionalOptions.disableEmojiFilter }),
							...(additionalOptions.explicitLanguage && { explicit_language: additionalOptions.explicitLanguage }),
							...(additionalOptions.contextLanguage && { context_language: additionalOptions.contextLanguage }),
						}
					}
				};

				// Send text request
				const payload = Buffer.from(JSON.stringify(requestPayload));
				const frame = createBinaryFrame(
					MESSAGE_TYPE_SEND_TEXT,
					SERIALIZATION_JSON,
					COMPRESSION_NONE,
					0, // No event code for SendText
					payload
				);

				ws.send(frame);
			});

			ws.on('message', (data: Buffer) => {
				try {
					const { eventCode, payload } = parseBinaryFrame(data);

					switch (eventCode) {
						case EVENT_TTS_SENTENCE_START:
							this.logger.debug('TTS sentence start');
							break;

						case EVENT_TTS_RESPONSE:
							// Audio data
							audioData.push(payload);
							this.logger.debug(`Received audio data chunk: ${payload.length} bytes`);
							break;

						case EVENT_TTS_SENTENCE_END:
							this.logger.debug('TTS sentence end');
							break;

						case EVENT_SESSION_FINISHED:
							isCompleted = true;
							this.logger.debug('TTS session finished');

							// Process audio data
							const fullAudioBuffer = Buffer.concat(audioData);

							// Save to cache if enabled
							if (enableCache && fullAudioBuffer.length > 0) {
								const cachedFilePath = getCachedFilePath(md5Hash, format, cacheDir);
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
							resolve(output);
							break;

						default:
							this.logger.debug(`Unknown event code: ${eventCode}`);
					}
				} catch (error: any) {
					this.logger.error('Error parsing WebSocket message', { error: error.message });
					hasError = true;
					reject(new Error(`Failed to parse WebSocket message: ${error.message}`));
				}
			});

			ws.on('close', () => {
				this.logger.debug('WebSocket connection closed');
				if (!isCompleted && !hasError) {
					reject(new Error('WebSocket connection closed unexpectedly'));
				}
			});

			ws.on('error', (error: any) => {
				hasError = true;
				this.logger.error('WebSocket error', { error: error.message });
				reject(new Error(`WebSocket error: ${error.message}`));
			});

			// Set timeout
			setTimeout(() => {
				if (!isCompleted && !hasError) {
					hasError = true;
					ws.close();
					reject(new Error('Speech synthesis timeout'));
				}
			}, 30000); // 30 seconds timeout
		});
	},
};

export default SpeechSynthesizerOperate;
