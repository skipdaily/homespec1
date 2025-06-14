import Anthropic from '@anthropic-ai/sdk';
import { BaseLLMProvider, LLMConfig, LLMMessage, LLMResponse, StreamingOptions } from '../types';

export class AnthropicProvider extends BaseLLMProvider {
  private client: Anthropic;

  constructor(config: LLMConfig) {
    super(config);
    if (!config.apiKey) {
      throw new Error('Anthropic API key is required');
    }
    
    this.client = new Anthropic({
      apiKey: config.apiKey,
      // Note: In production, API calls should go through your backend
    });
  }

  async generateResponse(
    messages: LLMMessage[],
    options?: {
      temperature?: number;
      maxTokens?: number;
      stream?: boolean;
      streamingOptions?: StreamingOptions;
    }
  ): Promise<LLMResponse> {
    try {
      if (!this.validateMessages(messages)) {
        throw new Error('Invalid messages format');
      }

      // Anthropic requires system message to be separate
      const { systemMessage, conversationMessages } = this.formatAnthropicMessages(messages);
      
      const requestConfig: Anthropic.MessageCreateParams = {
        model: this.config.model,
        messages: conversationMessages,
        max_tokens: options?.maxTokens ?? this.config.maxTokens ?? 1000,
        temperature: options?.temperature ?? this.config.temperature ?? 0.7,
        stream: options?.stream ?? false
      };

      // Add system message if present
      if (systemMessage) {
        requestConfig.system = systemMessage;
      }

      if (options?.stream && options?.streamingOptions) {
        return this.handleStreamingResponse(requestConfig, options.streamingOptions);
      }

      const response = await this.client.messages.create(requestConfig);
      
      if (response.content.length === 0 || response.content[0].type !== 'text') {
        throw new Error('No text content received from Anthropic');
      }

      return {
        content: response.content[0].text,
        model: response.model,
        usage: {
          prompt_tokens: response.usage.input_tokens,
          completion_tokens: response.usage.output_tokens,
          total_tokens: response.usage.input_tokens + response.usage.output_tokens
        },
        finish_reason: response.stop_reason || undefined
      };

    } catch (error) {
      console.error('Anthropic API Error:', error);
      throw new Error(`Anthropic request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async handleStreamingResponse(
    requestConfig: Anthropic.MessageCreateParams,
    streamingOptions: StreamingOptions
  ): Promise<LLMResponse> {
    try {
      const stream = this.client.messages.stream({
        ...requestConfig,
        stream: true
      });

      let fullContent = '';
      let usage: any = undefined;
      let model = '';
      let finishReason = '';

      stream.on('text', (text) => {
        fullContent += text;
        streamingOptions.onToken?.(text);
      });

      stream.on('message', (message) => {
        model = message.model;
        if (message.usage) {
          usage = {
            prompt_tokens: message.usage.input_tokens,
            completion_tokens: message.usage.output_tokens,
            total_tokens: message.usage.input_tokens + message.usage.output_tokens
          };
        }
        finishReason = message.stop_reason || '';
      });

      await stream.finalMessage();

      const response: LLMResponse = {
        content: fullContent,
        model,
        usage,
        finish_reason: finishReason
      };

      streamingOptions.onComplete?.(response);
      return response;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown streaming error';
      streamingOptions.onError?.(new Error(errorMessage));
      throw error;
    }
  }

  private formatAnthropicMessages(messages: LLMMessage[]): {
    systemMessage?: string;
    conversationMessages: Array<{ role: 'user' | 'assistant'; content: string }>;
  } {
    const systemMessages = messages.filter(msg => msg.role === 'system');
    const conversationMessages = messages.filter(msg => msg.role !== 'system');

    // Combine system messages
    const systemMessage = systemMessages.length > 0 
      ? systemMessages.map(msg => msg.content).join('\n\n')
      : undefined;

    // Format conversation messages for Anthropic
    const formattedMessages = conversationMessages.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content
    }));

    return {
      systemMessage,
      conversationMessages: formattedMessages
    };
  }

  validateConfig(): boolean {
    return !!(this.config.apiKey && this.config.model);
  }

  getSupportedModels(): string[] {
    return [
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307'
    ];
  }

  private validateMessages(messages: LLMMessage[]): boolean {
    return messages.every(msg => this.validateMessage(msg));
  }

  // Static method to test API key validity
  static async testApiKey(apiKey: string): Promise<boolean> {
    try {
      const client = new Anthropic({
        apiKey
      });

      // Test with a minimal request
      await client.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'Hi' }]
      });
      
      return true;
    } catch {
      return false;
    }
  }
}
