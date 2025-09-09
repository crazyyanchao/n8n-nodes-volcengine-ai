import type { ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';

export async function searchModels(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {

	// VolcEngine AI model data
	const mockModels = [
		{ id: 'deepseek-v3-1-250821', name: 'DeepSeek V3.1 (250821)' },
		{ id: 'doubao-seed-1-6-vision-250815', name: 'Doubao Seed 1.6 Vision (250815)' },
		{ id: 'doubao-seed-1-6-250615', name: 'Doubao Seed 1.6 (250615)' },
		{ id: 'doubao-1-5-pro-32k-character-250715', name: 'Doubao 1.5 Pro 32K Character (250715)' },
		{ id: 'doubao-seed-1-6-flash-250828', name: 'Doubao Seed 1.6 Flash (250828)' },
		{ id: 'doubao-seed-1-6-flash-250715', name: 'Doubao Seed 1.6 Flash (250715)' },
		{ id: 'doubao-seed-1-6-flash-250615', name: 'Doubao Seed 1.6 Flash (250615)' },
		{ id: 'kimi-k2-250711', name: 'Kimi K2 (250711)' },
		{ id: 'deepseek-v3-250324', name: 'DeepSeek V3 (250324)' }
	];

	// Filter models based on filter conditions
	const filteredModels = mockModels.filter((model) => {
		if (!filter) return true;
		return model.id.toLowerCase().includes(filter.toLowerCase()) ||
			   model.name.toLowerCase().includes(filter.toLowerCase());
	});

	// Sort by name
	filteredModels.sort((a, b) => a.name.localeCompare(b.name));

	return {
		results: filteredModels.map((model) => ({
			name: model.name,
			value: model.id,
		})),
	};
}
