/*
 * n8n Custom Node: VolcEngine AI
 * =====================================================================
 * Dependencies
 * ---------------------------------------------------------------------
 * - Depends on VolcEngine AI API for chat completions
 * ---------------------------------------------------------------------
 * Supported Operations
 *   • Chat Completions (Complete)
 * ---------------------------------------------------------------------
 * Author: Yanchao Ma — 2025‑01‑06
 */

/* -------------------------------------------------------------------
 * Dependencies Import
 * ---------------------------------------------------------------- */
import {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

// Import helper utilities
import ResourceBuilder from './help/builder/ResourceBuilder';
import ModuleLoadUtils from './help/utils/ModuleLoadUtils';
import { ResourceOperations } from './help/type/IResource';
import { searchModels } from './methods/loadModels';

/* -------------------------------------------------------------------
 * Resource Builder Setup
 * ---------------------------------------------------------------- */
const resourceBuilder = new ResourceBuilder();
ModuleLoadUtils.loadModules(__dirname, 'resource/*.js').forEach((resource) => {
	resourceBuilder.addResource(resource);
	ModuleLoadUtils.loadModules(__dirname, `resource/${resource.value}/*.js`).forEach((operate: ResourceOperations) => {
		resourceBuilder.addOperate(resource.value, operate);
	})
});

/* -------------------------------------------------------------------
 * Node Implementation
 * ---------------------------------------------------------------- */
export class VolcengineAi implements INodeType {
	methods = {
		listSearch: {
			searchModels,
		},
	};

	description: INodeTypeDescription = {
		displayName: 'VolcEngine AI',
		name: 'volcengineAi',
		icon: { light: 'file:volcengine.logo.svg', dark: 'file:volcengine.logo.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume VolcEngine AI within n8n workflows,[more info](https://www.volcengine.com/docs/82379).',
		defaults: {
			name: 'VolcEngine AI',
		},
		inputs: ['main'],
		outputs: ['main'],
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
		properties: resourceBuilder.build(),
	};

	/* ------------------------------ Execution Entry ------------------------------ */
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		let responseData: IDataObject = {};
		let returnData = [];

		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);

		const callFunc = resourceBuilder.getCall(resource, operation);

		if (!callFunc) {
			throw new NodeOperationError(this.getNode(), 'Method not implemented: ' + resource + '.' + operation);
		}

		// Iterate through all input items and execute corresponding operations
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				this.logger.debug('Calling function', {
					resource,
					operation,
					itemIndex,
				});

				responseData = await callFunc.call(this, itemIndex);
			} catch (error) {
				this.logger.error('Function call error', {
					resource,
					operation,
					itemIndex,
					errorMessage: error.message,
					stack: error.stack,
				});

				// If continue on fail is set, log error and continue
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: error.message
						},
						pairedItem: itemIndex,
					});
					continue
				} else {
					throw new NodeOperationError(this.getNode(), error, {
						message: error.message,
						itemIndex,
					});
				}
			}
			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(responseData as IDataObject),
				{ itemData: { item: itemIndex } },
			);
			returnData.push(...executionData);
		}

		return [returnData];
	}
}
