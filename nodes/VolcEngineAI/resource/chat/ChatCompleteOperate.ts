import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { ResourceOperations } from '../../../help/type/IResource';
import VolcengineAiRequestUtils from '../../utils/VolcengineAiRequestUtils';

const ChatCompleteOperate: ResourceOperations = {
	name: 'Complete',
	value: 'chat:complete',
	description: 'Creates a model response for the given chat conversation',
	options: [
		{
			displayName: 'Model',
			name: 'model',
			type: 'options',
			description: 'Select VolcEngine AI model',
			options: [
				{ name: 'DeepSeek V3 (250324)', value: 'deepseek-v3-250324' },
				{ name: 'DeepSeek V3.1 (250821)', value: 'deepseek-v3-1-250821' },
				{ name: 'Doubao 1.5 Pro 32K Character (250715)', value: 'doubao-1-5-pro-32k-character-250715' },
				{ name: 'Doubao Seed 1.6 (250615)', value: 'doubao-seed-1-6-250615' },
				{ name: 'Doubao Seed 1.6 Flash (250615)', value: 'doubao-seed-1-6-flash-250615' },
				{ name: 'Doubao Seed 1.6 Flash (250715)', value: 'doubao-seed-1-6-flash-250715' },
				{ name: 'Doubao Seed 1.6 Flash (250828)', value: 'doubao-seed-1-6-flash-250828' },
				{ name: 'Doubao Seed 1.6 Vision (250815)', value: 'doubao-seed-1-6-vision-250815' },
				{ name: 'Kimi K2 (250711)', value: 'kimi-k2-250711' }
			],
			default: 'doubao-seed-1-6-250615',
			required: true,
		},
		{
			displayName: 'Messages',
			name: 'messages',
			type: 'fixedCollection',
			typeOptions: {
				sortable: true,
				multipleValues: true,
			},
			placeholder: 'Add Message',
			default: {},
			required: true,
			options: [
				{
					displayName: 'Messages',
					name: 'messages',
					values: [
						{
							displayName: 'Role',
							name: 'role',
							type: 'options',
							options: [
								{
									name: 'Assistant',
									value: 'assistant',
								},
								{
									name: 'System',
									value: 'system',
								},
								{
									name: 'User',
									value: 'user',
								},
							],
							default: 'user',
						},
						{
							displayName: 'Content',
							name: 'content',
							type: 'string',
							default: '',
						},
					],
				},
			],
		},
		{
			displayName: 'Simplify Output',
			name: 'simplifyOutput',
			type: 'boolean',
			default: true,
			description: 'Whether to return a simplified version of the response instead of the raw data',
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
					displayName: 'Frequency Penalty',
					name: 'frequency_penalty',
					default: 0,
					typeOptions: { maxValue: 2, minValue: -2, numberPrecision: 1 },
					description:
						"Positive values penalize new tokens based on their existing frequency in the text so far, decreasing the model's likelihood to repeat the same line verbatim",
					type: 'number',
				},
				{
					displayName: 'Logprobs',
					name: 'logprobs',
					type: 'boolean',
					description: 'Whether to return log probabilities of the output tokens or not. If true, returns the log probabilities of each output token returned in the content of message.',
					default: false,
				},
				{
					displayName: 'Maximum Number of Tokens',
					name: 'maxTokens',
					default: 16,
					description:
						'The maximum number of tokens to generate in the completion. Most models have a context length of 2048 tokens (except for the newest models, which support 32,768).',
					type: 'number',
					typeOptions: {
						maxValue: 32768,
					},
				},
				{
					displayName: 'Presence Penalty',
					name: 'presence_penalty',
					default: 0,
					typeOptions: { maxValue: 2, minValue: -2, numberPrecision: 1 },
					description:
						"Positive values penalize new tokens based on whether they appear in the text so far, increasing the model's likelihood to talk about new topics",
					type: 'number',
				},
				{
					displayName: 'Response Format',
					name: 'response_format',
					type: 'json',
					default: '',
					description: 'An object specifying the format that the model must output',
				},
				{
					displayName: 'Sampling Temperature',
					name: 'temperature',
					default: 1,
					typeOptions: { maxValue: 1, minValue: 0, numberPrecision: 1 },
					description:
						'Controls randomness: Lowering results in less random completions. As the temperature approaches zero, the model will become deterministic and repetitive.',
					type: 'number',
				},
				{
					displayName: 'Top Logprobs',
					name: 'top_logprobs',
					type: 'number',
					default: null,
					typeOptions: { maxValue: 20, minValue: 0, numberPrecision: 1 },
					description: 'An integer between 0 and 20 specifying the number of most likely tokens to return at each token position, each with an associated log probability. logprobs must be set to true if this parameter is used.',
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
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const model = this.getNodeParameter('model', index) as string;
		const messages = this.getNodeParameter('messages', index) as IDataObject;
		const simplifyOutput = this.getNodeParameter('simplifyOutput', index) as boolean;
		const options = this.getNodeParameter('options', index, {}) as IDataObject;

		// Prepare request body
		const requestBody: IDataObject = {
			model,
			messages: messages.messages || [],
		};

		// Add options to request body
		Object.keys(options).forEach(key => {
			if (options[key] !== null && options[key] !== undefined && options[key] !== '') {
				requestBody[key] = options[key];
			}
		});

		// Make API request
		const response = await VolcengineAiRequestUtils.request.call(this, {
			method: 'POST',
			url: '/chat/completions',
			body: requestBody,
		});

		// Process response based on simplifyOutput setting
		if (simplifyOutput && response.choices) {
			return {
				success: true,
				data: response.choices,
				model: response.model,
				usage: response.usage,
			};
		}

		return response;
	},
};

export default ChatCompleteOperate;
