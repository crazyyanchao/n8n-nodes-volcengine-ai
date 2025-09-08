import type { INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { sendErrorPostReceive } from './GenericFunctions';

export const fimOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['fim'],
			},
		},
		options: [
			{
				name: 'Complete',
				value: 'complete',
				action: 'Create fim completion beta',
				description: 'The FIM (Fill-In-the-Middle) Completion API',
				routing: {
					request: {
						method: 'POST',
						url: '/beta/completions',
					},
					output: { postReceive: [sendErrorPostReceive] },
				}
			},
		],
		default: 'complete',
	},
];

const completeOperations: INodeProperties[] = [
	{
		displayName: 'Model',
		name: 'model',
		type: 'string',
		description:
			'The model which will generate the completion. Optional models include doubao-seed-1-6-250715, deepseek-v3-1-250821, etc. See documentation for details. <a href="https://www.volcengine.com/docs/82379/1099475">Learn more</a>.',
		displayOptions: {
			show: {
				resource: ['fim'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'model',
			},
		},
		default: 'doubao-seed-1-6-250715',
	},
	{
		displayName: 'Prompt',
		name: 'prompt',
		type: 'string',
		required: true,
		typeOptions: {
			rows: 3,
		},
		default: '',
		description: 'The prompt to generate completions for',
		displayOptions: {
			show: {
				resource: ['fim']
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'prompt',
			},
		},
	}
];

const sharedOperations: INodeProperties[] = [
	// Simplify
	{
		displayName: 'Simplify',
		name: 'simplifyOutput',
		type: 'boolean',
		default: true,
		displayOptions: {
			show: {
				resource: ['fim'],
			},
		},
		routing: {
			output: {
				postReceive: [
					{
						type: 'set',
						enabled: '={{$value}}',
						properties: {
							value: '={{ { "data": $response.body.choices } }}',
						},
					},
					{
						type: 'rootProperty',
						enabled: '={{$value}}',
						properties: {
							property: 'data',
						},
					},
					async function (items: INodeExecutionData[]): Promise<INodeExecutionData[]> {
						if (this.getNode().parameters.simplifyOutput === false) {
							return items;
						}
						return items.map((item) => {
							return {
								json: {
									...item.json,
									message: item.json.message,
								},
							};
						});
					},
				],
			},
		},
		description: 'Whether to return a simplified version of the response instead of the raw data',
	},
	// Options
	{
		displayName: 'Options',
		name: 'options',
		placeholder: 'Add Option',
		description: 'Additional options to add',
		type: 'collection',
		default: {},
		displayOptions: {
			show: {
				resource: ['fim']
			},
		},
		options: [
			{
				displayName: 'Echo Prompt',
				name: 'echo',
				type: 'boolean',
				description: 'Whether the prompt should be echo back in addition to the completion',
				default: false,
				displayOptions: {
					show: {
						'/operation': ['complete'],
					},
				},
				routing: {
					send: {
						type: 'body',
						property: 'echo',
					},
				},
			},
			{
				displayName: 'Frequency Penalty',
				name: 'frequency_penalty',
				default: 0,
				typeOptions: { maxValue: 2, minValue: -2, numberPrecision: 1 },
				description:
					"Positive values penalize new tokens based on their existing frequency in the text so far, decreasing the model's likelihood to repeat the same line verbatim",
				type: 'number',
				routing: {
					send: {
						type: 'body',
						property: 'frequency_penalty',
					},
				},
			},
			{
				displayName: 'Logprobs',
				name: 'logprobs',
				type: 'boolean',
				description: 'Whether to return log probabilities of the output tokens or not. If true, returns the log probabilities of each output token returned in the content of message.',
				default: false,
				displayOptions: {
					show: {
						'/operation': ['complete'],
					},
				},
				routing: {
					send: {
						type: 'body',
						property: 'logprobs',
					},
				},
			},
			{
				displayName: 'Maximum Number of Tokens',
				name: 'maxTokens',
				default: 16,
				description:
					'The maximum number of tokens to generate in the completion. Most models have a context length of 2048 tokens (except for the newest models, which support 32,768).',
				type: 'number',
				displayOptions: {
					show: {
						'/operation': ['complete'],
					},
				},
				typeOptions: {
					maxValue: 32768,
				},
				routing: {
					send: {
						type: 'body',
						property: 'max_tokens',
					},
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
				routing: {
					send: {
						type: 'body',
						property: 'presence_penalty',
					},
				},
			},
			{
				displayName: 'Sampling Temperature',
				name: 'temperature',
				default: 1,
				typeOptions: { maxValue: 1, minValue: 0, numberPrecision: 1 },
				description:
					'Controls randomness: Lowering results in less random completions. As the temperature approaches zero, the model will become deterministic and repetitive.',
				type: 'number',
				routing: {
					send: {
						type: 'body',
						property: 'temperature',
					},
				},
			},
			{
				displayName: 'Suffix',
				name: 'suffix',
				type: 'string',
				default: '',
				description: 'The suffix that comes after a completion of inserted text',
				displayOptions: {
					show: {
						'/operation': ['complete'],
					},
				},
				routing: {
					send: {
						type: 'body',
						property: 'suffix',
					},
				}
			},
			{
				displayName: 'Top P',
				name: 'topP',
				default: 1,
				typeOptions: { maxValue: 1, minValue: 0, numberPrecision: 1 },
				description:
					'Controls diversity via nucleus sampling: 0.5 means half of all likelihood-weighted options are considered. We generally recommend altering this or temperature but not both.',
				type: 'number',
				routing: {
					send: {
						type: 'body',
						property: 'top_p',
					},
				},
			},
		],
	},
];

export const FIMFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                               chat:complete                        */
	/* -------------------------------------------------------------------------- */
	...completeOperations,

	/* -------------------------------------------------------------------------- */
	/*                                chat:ALL                                    */
	/* -------------------------------------------------------------------------- */
	...sharedOperations,
];
