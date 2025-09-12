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
		},
		{
			displayName: 'Auth Type',
			name: 'authType',
			type: 'options',
			default: 'bearer',
			description: 'Select which HTTP header to use for authentication',
			options: [
				{ name: 'Authorization: Bearer <token>', value: 'bearer' },
				{ name: 'X-Api-Access-Key: <token>', value: 'x-api-key' },
			],
		}
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '={{$credentials.authType === "bearer" ? ("Bearer " + $credentials.accessToken) : undefined}}',
				'X-Api-Access-Key': '={{$credentials.authType === "x-api-key" ? $credentials.accessToken : undefined}}',
			},
		},
	};

}
