import type {
	IAuthenticateGeneric,
	ICredentialType,
	INodeProperties,
	Icon,
} from 'n8n-workflow';

export class VolcEngineAiApi implements ICredentialType {
	name = 'volcEngineAiApi';

	displayName = 'VolcEngine AI API';

	icon: Icon = { light: 'file:volcengine.logo.svg', dark: 'file:volcengine.logo.svg' };

	documentationUrl = 'https://www.volcengine.com/docs/82379/1099475';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
		}
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '={{$credentials.apiKey}}'
			},
		},
	};

}
