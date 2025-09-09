import {
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';
import { searchModels } from './methods/loadModels';
import { getConnectionHintNoticeField } from './methods/sharedFields';
import {ChatOpenAI, type ClientOptions} from '@langchain/openai';

export class VolcengineAiChain implements INodeType {
	methods = {
		listSearch: {
			searchModels,
		},
	};

	description: INodeTypeDescription = {
		displayName: 'VolcengineAi Chat Model',

		name: 'volcengineAiChain',
		icon: { light: 'file:volcengine.logo.svg', dark: 'file:volcengine.logo.svg' },
		group: ['transform'],
		version: [1, 1.1, 1.2],
		description: 'For advanced usage with an AI chain',
		defaults: {
			name: 'VolcengineAi Chat Model',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Language Models', 'Root Nodes'],
				'Language Models': ['Chat Models (Recommended)'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.lmchatopenai/',
					},
				],
			},
		},

		inputs: [],

		outputs: [NodeConnectionTypes.AiLanguageModel],
		outputNames: ['Model'],
		credentials: [
			{
				name: 'volcengineAiApi',
				required: true,
			},
		],
		requestDefaults: {
			ignoreHttpStatusErrors: true,
			baseURL:
				'={{ $parameter.options?.baseURL?.split("/").slice(0,-1).join("/") || $credentials?.url?.split("/").slice(0,-1).join("/") || "https://ark.cn-beijing.volces.com/api/v3" }}',
		},
		properties: [
			getConnectionHintNoticeField([NodeConnectionTypes.AiChain, NodeConnectionTypes.AiAgent]),
			{
				displayName:
					'If using JSON response format, you must include word "json" in the prompt in your chain or agent. Also, make sure to select latest models released post November 2023.',
				name: 'notice',
				type: 'notice',
				default: '',
				displayOptions: {
					show: {
						'/options.responseFormat': ['json_object'],
					},
				},
			},
			{
				displayName: 'Model',
				name: 'model',
				type: 'options',
				description: '选择火山引擎AI模型',
				options: [
					{ name: '豆包 代码生成', value: 'doubao-code' },
					{ name: '豆包 对话', value: 'doubao-chat' },
					{ name: '豆包 多模态', value: 'doubao-multimodal' },
					{ name: '豆包 翻译', value: 'doubao-translate' },
					{ name: '豆包 内容审核', value: 'doubao-review' },
					{ name: '豆包 内容优化', value: 'doubao-optimize' },
					{ name: '豆包 数据分析', value: 'doubao-analysis' },
					{ name: '豆包 图像生成', value: 'doubao-image' },
					{ name: '豆包 文本改写', value: 'doubao-rewrite' },
					{ name: '豆包 文本嵌入', value: 'doubao-text-embedding' },
					{ name: '豆包 问答', value: 'doubao-qa' },
					{ name: '豆包 写作助手', value: 'doubao-writing' },
					{ name: '豆包 语音合成', value: 'doubao-speech' },
					{ name: '豆包 摘要', value: 'doubao-summary' },
					{ name: '豆包 Lite 128K', value: 'doubao-lite-128k' },
					{ name: '豆包 Lite 32K', value: 'doubao-lite-32k' },
					{ name: '豆包 Lite 4K', value: 'doubao-lite-4k' },
					{ name: '豆包 Pro 128K', value: 'doubao-pro-128k' },
					{ name: '豆包 Pro 32K', value: 'doubao-pro-32k' },
					{ name: '豆包 Pro 4K', value: 'doubao-pro-4k' }
				],
				routing: {
					send: {
						type: 'body',
						property: 'model',
					},
				},
				default: 'doubao-pro-4k',
				displayOptions: {
					hide: {
						'@version': [{ _cnd: { gte: 1.2 } }],
					},
				},
			},
			{
				displayName: 'Model',
				name: 'model',
				type: 'resourceLocator',
				default: { mode: 'list', value: 'doubao-pro-4k' },
				required: true,
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						placeholder: '选择模型...',
						typeOptions: {
							searchListMethod: 'searchModels',
							searchable: true,
						},
					},
					{
						displayName: 'ID',
						name: 'id',
						type: 'string',
						placeholder: 'doubao-pro-4k',
					},
				],
				description: '选择火山引擎AI模型，可以从列表中选择或直接输入模型ID。',
				displayOptions: {
					hide: {
						'@version': [{ _cnd: { lte: 1.1 } }],
					},
				},
			},
			{
				displayName:
					'When using non-OpenAI models via "Base URL" override, not all models might be chat-compatible or support other features, like tools calling or JSON response format',
				name: 'notice',
				type: 'notice',
				default: '',
				displayOptions: {
					show: {
						'/options.baseURL': [{ _cnd: { exists: true } }],
					},
				},
			},
			{
				displayName: 'Options',
				name: 'options',
				placeholder: 'Add Option',
				description: 'Additional options to add',
				type: 'collection',
				default: {},
				options: [
					{
						displayName: 'Base URL',
						name: 'baseURL',
						default: 'https://ark.cn-beijing.volces.com/api/v3',
						description: 'Override the default base URL for the API',
						type: 'string',
						displayOptions: {
							hide: {
								'@version': [{ _cnd: { gte: 1.1 } }],
							},
						},
					},
					{
						displayName: 'Frequency Penalty',
						name: 'frequencyPenalty',
						default: 0,
						typeOptions: { maxValue: 2, minValue: -2, numberPrecision: 1 },
						description:
							"Positive values penalize new tokens based on their existing frequency in the text so far, decreasing the model's likelihood to repeat the same line verbatim",
						type: 'number',
					},
					{
						displayName: 'Max Retries',
						name: 'maxRetries',
						default: 2,
						description: 'Maximum number of retries to attempt',
						type: 'number',
					},
					{
						displayName: 'Maximum Number of Tokens',
						name: 'maxTokens',
						default: -1,
						description:
							'The maximum number of tokens to generate in the completion. Most models have a context length of 2048 tokens (except for the newest models, which support 32,768).',
						type: 'number',
						typeOptions: {
							maxValue: 32768,
						},
					},
					{
						displayName: 'Presence Penalty',
						name: 'presencePenalty',
						default: 0,
						typeOptions: { maxValue: 2, minValue: -2, numberPrecision: 1 },
						description:
							"Positive values penalize new tokens based on whether they appear in the text so far, increasing the model's likelihood to talk about new topics",
						type: 'number',
					},
					{
						displayName: 'Reasoning Effort',
						name: 'reasoningEffort',
						default: 'medium',
						description:
							'Controls the amount of reasoning tokens to use. A value of "low" will favor speed and economical token usage, "high" will favor more complete reasoning at the cost of more tokens generated and slower responses.',
						type: 'options',
						options: [
							{
								name: 'Low',
								value: 'low',
								description: 'Favors speed and economical token usage',
							},
							{
								name: 'Medium',
								value: 'medium',
								description: 'Balance between speed and reasoning accuracy',
							},
							{
								name: 'High',
								value: 'high',
								description:
									'Favors more complete reasoning at the cost of more tokens generated and slower responses',
							},
						],
						displayOptions: {
							show: {
								// reasoning_effort is only available on o1, o1-versioned, or on o3-mini and beyond. Not on o1-mini or other GPT-models.
								'/model': [{ _cnd: { regex: '(^o1([-\\d]+)?$)|(^o[3-9].*)' } }],
							},
						},
					},
					{
						displayName: 'Response Format',
						name: 'responseFormat',
						default: 'text',
						type: 'options',
						options: [
							{
								name: 'Text',
								value: 'text',
								description: 'Regular text response',
							},
							{
								name: 'JSON',
								value: 'json_object',
								description:
									'Enables JSON mode, which should guarantee the message the model generates is valid JSON',
							},
						],
					},
					{
						displayName: 'Sampling Temperature',
						name: 'temperature',
						default: 0.7,
						typeOptions: { maxValue: 2, minValue: 0, numberPrecision: 1 },
						description:
							'Controls randomness: Lowering results in less random completions. As the temperature approaches zero, the model will become deterministic and repetitive.',
						type: 'number',
					},
					{
						displayName: 'Timeout',
						name: 'timeout',
						default: 60000,
						description: 'Maximum amount of time a request is allowed to take in milliseconds',
						type: 'number',
					},
					{
						displayName: 'Top P',
						name: 'topP',
						default: 1,
						typeOptions: { maxValue: 1, minValue: 0, numberPrecision: 1 },
						description:
							'Controls diversity via nucleus sampling: 0.5 means half of all likelihood-weighted options are considered. We generally recommend altering this or temperature but not both.',
						type: 'number',
					},
				],
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const credentials = await this.getCredentials('volcengineAiApi');

		const version = this.getNode().typeVersion;
		const modelName =
			version >= 1.2
				? (this.getNodeParameter('model.value', itemIndex) as string)
				: (this.getNodeParameter('model', itemIndex) as string);

		const options = this.getNodeParameter('options', itemIndex, {}) as {
			baseURL?: string;
			frequencyPenalty?: number;
			maxTokens?: number;
			maxRetries: number;
			timeout: number;
			presencePenalty?: number;
			temperature?: number;
			topP?: number;
			responseFormat?: 'text' | 'json_object';
			reasoningEffort?: 'low' | 'medium' | 'high';
		};

		const configuration: ClientOptions = {
			baseURL: options.baseURL || 'https://ark.cn-beijing.volces.com/api/v3',
		};

		const model = new ChatOpenAI({
			apiKey: credentials.apiKey as string,
			model: modelName,
			...options,
			timeout: options.timeout ?? 60000,
			maxRetries: options.maxRetries ?? 2,
			configuration,

			modelKwargs: options.responseFormat
				? {
						response_format: { type: options.responseFormat },
					}
				: undefined,

		});

		return {
			response: model,
		};
	}
}
