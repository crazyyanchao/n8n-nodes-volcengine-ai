import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import { chatFields, chatOperations } from './ChatDescription';
import { searchModels } from './methods/loadModels';

export class VolcengineAi implements INodeType {
	methods = {
		listSearch: {
			searchModels,
		},
	};

	description: INodeTypeDescription = {
		displayName: 'VolcEngine AI',
		name: 'volcengineAi',
		// hidden: true,
		icon: { light: 'file:volcengine.logo.svg', dark: 'file:volcengine.logo.svg' },
		group: ['transform'],
		version: [1, 1.1],
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume VolcEngine AI',
		defaults: {
			name: 'VolcEngine AI',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'volcengineAiApi',
				required: true,
			},
		],
		requestDefaults: {
			ignoreHttpStatusErrors: true,
			baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Chat',
						value: 'chat'
					}
				],
				default: 'chat',
			},

			...chatOperations,
			...chatFields
		],
	};
}
