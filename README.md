# n8n-nodes-volcengine-ai

[![English](https://img.shields.io/badge/English-Click-yellow)](README.md)
[![中文文档](https://img.shields.io/badge/中文文档-点击查看-orange)](README-zh.md)

This is an n8n community node that allows you to use VolcEngine AI services in n8n workflows, including chat completion and code completion functionality.

This node supports the following VolcEngine AI services:
- **Chat Completion**: Provides intelligent conversation capabilities with support for multi-turn conversations and rich parameter configuration
- **FIM Completion (Fill-In-the-Middle)**: Provides code completion and filling functionality, supporting middle-part filling in code

Through this node, you can easily integrate VolcEngine's AI capabilities into your automation workflows to achieve intelligent conversations, content generation, code assistance, and more.

[n8n](https://n8n.io/) is a workflow automation platform with a [fair-code license](https://docs.n8n.io/reference/license/).

[Installation](#installation)  
[Operations](#operations)  
[Credentials](#credentials)  
[Compatibility](#compatibility)  
[Usage Instructions](#usage-instructions)  
[Resources](#resources)  
[Version History](#version-history)  

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

Alternatively, you can also refer to these [n8n workflow templates](https://github.com/crazyyanchao/n8n-workflow-template).

## Operations

This node supports the following resource types and operations:

### Chat Completion
- **Complete Conversation**: Create model responses with support for multi-turn conversations
  - Support for system messages, user messages, and assistant messages
  - Dynamic loading of available AI models
  - Rich parameter configuration options
  - Support for simplified output mode

### FIM Completion (Fill-In-the-Middle Completion)
- **Code Completion**: Create code filling completions
  - Support for middle-part filling in code
  - Configurable prefix and suffix text
  - Support for various code completion scenarios
  - Provides code generation and editing capabilities

### Advanced Parameter Configuration
- **Temperature Control**: Control randomness of generated content (0-1)
- **Max Tokens**: Set maximum length of generated content (up to 32768)
- **Frequency Penalty**: Reduce generation of repetitive content (-2 to 2)
- **Presence Penalty**: Encourage model to discuss new topics (-2 to 2)
- **Top-P Sampling**: Control nucleus sampling diversity (0-1)
- **Response Format**: Customize output format
- **Log Probabilities**: Return probability information for output tokens

## Credentials

To use this node, you need:

1. **Register VolcEngine Account**: Visit [VolcEngine Official Website](https://www.volcengine.com/) to register an account
2. **Enable AI Services**: Enable AI-related services in the VolcEngine console
3. **Obtain API Key**: Create an API Key in the VolcEngine console
4. **Configure Credentials**: Configure VolcEngine AI credentials in n8n

### Authentication Methods
- **API Key Authentication**: Use VolcEngine API Key for API calls
- **Automatic Authentication**: The node automatically adds Authorization information to request headers

## Usage Instructions

### Basic Usage Workflow

1. **Install Node**: Follow the installation guide to install this community node
2. **Configure Credentials**: Configure VolcEngine AI API credentials in n8n
3. **Create Workflow**: Add VolcEngine AI node to your n8n workflow
4. **Select Resource Type**: Choose "Chat" or "FIM" resource type
5. **Configure Parameters**: Configure model, prompts, and other parameters as needed
6. **Execute Workflow**: Run the workflow to get AI responses

### Chat Completion Usage Examples

- **Single-turn Conversation**: Directly input user messages
- **Multi-turn Conversation**: Add multiple messages including system, user, and assistant messages
- **Parameter Tuning**: Adjust temperature, max tokens, and other parameters as needed

### FIM Completion Usage Examples

- **Code Completion**: Input code prefix and let AI complete the subsequent code
- **Code Filling**: Provide code prefix and suffix, let AI fill the middle part
- **Code Generation**: Generate complete code snippets based on descriptions

## Compatibility

- **Minimum n8n Version**: 1.0.0
- **Node.js Version**: >=22.16
- **Tested Version**: n8n 1.0.0+

## Resources

* [n8n Community Nodes Documentation](https://docs.n8n.io/integrations/#community-nodes)
* [VolcEngine AI Service Documentation](https://www.volcengine.com/docs/82379/1099475)
* [VolcEngine AI API Reference](https://www.volcengine.com/docs/82379/1099475)
* [VolcEngine Official Website](https://www.volcengine.com/)
* [n8n Workflow Templates](https://github.com/crazyyanchao/n8n-workflow-template)

## Version History

### v0.1.0 (Current Version)
- **Initial Version Release**
- **Chat Completion Features**
  - Support for multi-turn conversations including system, user, and assistant messages
  - Dynamic loading of available AI model lists
  - Rich parameter configuration: temperature, max tokens, frequency penalty, etc.
  - Support for simplified output mode
  - Complete error handling mechanism
- **FIM Completion Features**
  - Support for code completion and filling functionality
  - Configurable prefix and suffix text
  - Support for middle-part filling in code
  - Provides code generation and editing capabilities
- **Advanced Features**
  - Unified API authentication mechanism
  - Automatic error handling and status code checking
  - Response data formatting
  - Support for multiple output formats

---

**Note**: Using this node requires a valid VolcEngine account and AI service permissions. Please ensure compliance with VolcEngine's terms of use and API call limits. Please configure appropriate access permissions based on actual usage.
