# n8n-nodes-volcengine-ai

[![English](https://img.shields.io/badge/English-Click-yellow)](README.md)
[![中文文档](https://img.shields.io/badge/中文文档-点击查看-orange)](README-zh.md)

这是一个n8n社区节点，让您可以在n8n工作流中使用火山引擎（VolcEngine）的AI服务，包括聊天完成和代码补全功能。

本节点支持以下火山引擎AI服务：
- **聊天完成（Chat Completion）**: 提供智能对话能力，支持多轮对话和丰富的参数配置
- **FIM完成（Fill-In-the-Middle）**: 提供代码补全和填充功能，支持代码中的中间部分填充
- **语音合成（Speech Synthesis）**: 将文本转换为自然语音，支持多种音色和音频格式
- **图像生成（Image Generation）**: 根据文本描述生成高质量图像，支持多种模型和输出格式

通过这个节点，您可以轻松将火山引擎的AI能力集成到您的自动化工作流中，实现智能对话、内容生成、代码辅助、语音合成、图像生成等功能。

[n8n](https://n8n.io/) 是一个[公平代码许可](https://docs.n8n.io/reference/license/)的工作流自动化平台。

[安装](#安装)  
[操作](#操作)  
[凭据](#凭据)  
[兼容性](#兼容性)  
[使用说明](#使用说明)  
[资源](#资源)  

## 安装

按照n8n社区节点文档中的[安装指南](https://docs.n8n.io/integrations/community-nodes/installation/)进行安装。

另外，你也可以参考使用这些[n8n工作流模板](https://github.com/crazyyanchao/n8n-workflow-template)。

## 操作

此节点支持以下资源类型和操作：

### 聊天完成（Chat Completion）
- **完成对话**: 创建模型响应，支持多轮对话
  - 支持系统消息、用户消息和助手消息
  - 动态加载可用的AI模型
  - 丰富的参数配置选项
  - 支持简化输出模式

### FIM完成（Fill-In-the-Middle Completion）
- **代码补全**: 创建代码填充完成
  - 支持代码中的中间部分填充
  - 可配置前缀和后缀文本
  - 支持多种代码补全场景
  - 提供代码生成和编辑功能

### 语音合成（Speech Synthesis）
- **文本转语音**: 将文本转换为自然语音
  - 支持多种音色和语言
  - 可配置语速、音量、情感等参数
  - 支持多种音频格式（MP3、OGG、PCM）
  - 提供本地缓存功能

### 图像生成（Image Generation）
- **AI图像生成**: 根据文本描述生成高质量图像
  - 支持多种生成模型（doubao-seedream系列）
  - 可配置图像尺寸、格式、水印等
  - 支持单图和多图生成
  - 提供多种输出格式（URL、Base64、文件等）

### 高级参数配置
- **温度控制**: 控制生成内容的随机性（0-1）
- **最大令牌数**: 设置生成内容的最大长度（最多32768）
- **频率惩罚**: 减少重复内容的生成（-2到2）
- **存在惩罚**: 鼓励模型讨论新话题（-2到2）
- **Top-P采样**: 控制核采样多样性（0-1）
- **响应格式**: 自定义输出格式
- **日志概率**: 返回输出令牌的概率信息

## 凭据

要使用此节点，您需要：

1. **注册火山引擎账户**: 访问 [火山引擎官网](https://www.volcengine.com/) 注册账户
2. **开通AI服务**: 在火山引擎控制台开通AI相关服务
3. **获取API密钥**: 在火山引擎控制台创建API Key
4. **配置凭据**: 在n8n中配置火山引擎AI凭据

### 认证方法
- **API Key认证**: 使用火山引擎API Key进行API调用，选择 X-Api-Access-Key 或 Authorization
- **自动认证**: 节点会自动在请求头中添加认证信息
- **备注**: 目前音频使用 X-Api-Access-Key，其它使用 Authorization 认证

## 使用说明

### 基本使用流程

1. **安装节点**: 按照安装指南安装此社区节点
2. **配置凭据**: 在n8n中配置火山引擎AI API凭据
3. **创建工作流**: 在n8n工作流中添加VolcEngine AI节点
4. **选择资源类型**: 选择"Chat"或"FIM"资源类型
5. **配置参数**: 根据需求配置模型、提示词等参数
6. **执行工作流**: 运行工作流获取AI响应

## 兼容性

- **最低n8n版本**: 1.0.0
- **Node.js版本**: >=22.16
- **测试版本**: n8n 1.0.0+

## 资源

* [n8n社区节点文档](https://docs.n8n.io/integrations/#community-nodes)
* [火山引擎AI服务文档](https://www.volcengine.com/docs/82379/1099475)
* [火山引擎AI API参考](https://www.volcengine.com/docs/82379/1099475)
* [火山引擎官网](https://www.volcengine.com/)
* [n8n工作流模板](https://github.com/crazyyanchao/n8n-workflow-template)

**注意**: 使用此节点需要有效的火山引擎账户和AI服务权限。请确保遵守火山引擎的使用条款和API调用限制。请根据实际使用情况配置相应的访问权限。
