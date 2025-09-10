import type {
	IAuthenticateGeneric,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class VolcengineAiApi implements ICredentialType {
	name = 'volcengineAiApi';

	displayName = 'VolcEngine AI API';

	documentationUrl = 'https://www.volcengine.com/docs/82379/1099475';

	properties: INodeProperties[] = [
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			description: 'VolcEngine AI Access Token for authentication',
		}
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'X-Api-Access-Key': '={{$credentials.accessToken}}'
			},
		},
	};

}
