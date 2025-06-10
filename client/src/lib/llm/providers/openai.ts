import OpenAI from 'openai';
import { BaseLLMProvider, LLMConfig, LLMMessage, LLMResponse, StreamingOptions } from '../types';

export class OpenAIProvider extends BaseLLMProvider {
  private client: OpenAI;

  constructor(config: LLMConfig) {
    super(config);
    if (!config.apiKey) {
      throw new Error('OpenAI API key is required');
    }
    
    this.client = new OpenAI({
      apiKey: config.apiKey,
      dangerouslyAllowBrowser: true // Note: In production, API calls should go through your backend
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

      const formattedMessages = this.formatMessages(messages);
      
      const requestConfig: OpenAI.Chat.ChatCompletionCreateParams = {
        model: this.config.model,
        messages: formattedMessages,
        temperature: options?.temperature ?? this.config.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? this.config.maxTokens ?? 1000,
        top_p: this.config.topP,
        frequency_penalty: this.config.frequencyPenalty,
        presence_penalty: this.config.presencePenalty,
        stream: options?.stream ?? false
      };

      if (options?.stream && options?.streamingOptions) {
        return this.handleStreamingResponse(requestConfig, options.streamingOptions);
      }

      const response = await this.client.chat.completions.create(requestConfig);
      
      const choice = response.choices[0];
      if (!choice?.message?.content) {
        throw new Error('No response content received from OpenAI');
      }

      return {
        content: choice.message.content,
        model: response.model,
        usage: response.usage ? {
          prompt_tokens: response.usage.prompt_tokens,
          completion_tokens: response.usage.completion_tokens,
          total_tokens: response.usage.total_tokens
        } : undefined,
        finish_reason: choice.finish_reason || undefined
      };

    } catch (error) {
      console.error('OpenAI API Error:', error);
      throw new Error(`OpenAI request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async handleStreamingResponse(
    requestConfig: OpenAI.Chat.ChatCompletionCreateParams,
    streamingOptions: StreamingOptions
  ): Promise<LLMResponse> {
    try {
      const stream = await this.client.chat.completions.create({
        ...requestConfig,
        stream: true
      });

      let fullContent = '';
      let usage: any = undefined;
      let model = '';
      let finishReason = '';

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        
        if (delta?.content) {
          fullContent += delta.content;
          streamingOptions.onToken?.(delta.content);
        }

        if (chunk.model) {
          model = chunk.model;
        }

        if (chunk.choices[0]?.finish_reason) {
          finishReason = chunk.choices[0].finish_reason;
        }

        // Usage is typically in the last chunk
        if (chunk.usage) {
          usage = {
            prompt_tokens: chunk.usage.prompt_tokens,
            completion_tokens: chunk.usage.completion_tokens,
            total_tokens: chunk.usage.total_tokens
          };
        }
      }

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

  validateConfig(): boolean {
    return !!(this.config.apiKey && this.config.model);
  }

  getSupportedModels(): string[] {
    return [
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4-turbo',
      'gpt-4',
      'gpt-3.5-turbo',
      'gpt-3.5-turbo-16k'
    ];
  }

  private validateMessages(messages: LLMMessage[]): boolean {
    return messages.every(msg => this.validateMessage(msg));
  }

  // Static method to test API key validity
  static async testApiKey(apiKey: string): Promise<boolean> {
    try {
      const client = new OpenAI({
        apiKey,
        dangerouslyAllowBrowser: true
      });

      await client.models.list();
      return true;
    } catch {
      return false;
    }
  }
}
