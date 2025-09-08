import type { ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';

export async function searchModels(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {

	// 模拟火山引擎AI模型数据
	const mockModels = [
		{ id: 'doubao-pro-4k', name: '豆包 Pro 4K' },
		{ id: 'doubao-pro-32k', name: '豆包 Pro 32K' },
		{ id: 'doubao-pro-128k', name: '豆包 Pro 128K' },
		{ id: 'doubao-lite-4k', name: '豆包 Lite 4K' },
		{ id: 'doubao-lite-32k', name: '豆包 Lite 32K' },
		{ id: 'doubao-lite-128k', name: '豆包 Lite 128K' },
		{ id: 'doubao-multimodal', name: '豆包 多模态' },
		{ id: 'doubao-text-embedding', name: '豆包 文本嵌入' },
		{ id: 'doubao-speech', name: '豆包 语音合成' },
		{ id: 'doubao-image', name: '豆包 图像生成' },
		{ id: 'doubao-translate', name: '豆包 翻译' },
		{ id: 'doubao-summary', name: '豆包 摘要' },
		{ id: 'doubao-qa', name: '豆包 问答' },
		{ id: 'doubao-chat', name: '豆包 对话' },
		{ id: 'doubao-code', name: '豆包 代码生成' },
		{ id: 'doubao-analysis', name: '豆包 数据分析' },
		{ id: 'doubao-writing', name: '豆包 写作助手' },
		{ id: 'doubao-rewrite', name: '豆包 文本改写' },
		{ id: 'doubao-optimize', name: '豆包 内容优化' },
		{ id: 'doubao-review', name: '豆包 内容审核' }
	];

	// 根据过滤条件筛选模型
	const filteredModels = mockModels.filter((model) => {
		if (!filter) return true;
		return model.id.toLowerCase().includes(filter.toLowerCase()) ||
			   model.name.toLowerCase().includes(filter.toLowerCase());
	});

	// 按名称排序
	filteredModels.sort((a, b) => a.name.localeCompare(b.name));

	return {
		results: filteredModels.map((model) => ({
			name: model.name,
			value: model.id,
		})),
	};
}
