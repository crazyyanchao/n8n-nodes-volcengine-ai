import { IExecuteFunctions, NodeOperationError, IRequestOptions } from 'n8n-workflow';

class VolcengineAiRequestUtils {
	static async request(this: IExecuteFunctions, options: IRequestOptions) {

		// Set basic configuration for VolcEngine AI API
		options.headers = {
			...options.headers,
			'Content-Type': 'application/json',
			'User-Agent': 'n8n-volcengine-ai-node/1.0.0',
		};

		try {
			const response = await this.helpers.requestWithAuthentication.call(
				this,
				'volcengineAiApi',
				options
			);

			// Check for errors in VolcEngine AI API response
			if (response && typeof response === 'object') {
				if (response.error && response.error.code) {
					throw new NodeOperationError(
						this.getNode(),
						`VolcEngine AI API error: ${response.error.code} - ${response.error.message || 'Unknown error'}`
					);
				}
			}

			return response;
		} catch (error) {
			if (error instanceof NodeOperationError) {
				throw error;
			}

			throw new NodeOperationError(
				this.getNode(),
				`Request failed: ${error.message}`
			);
		}
	}
}

export default VolcengineAiRequestUtils;
