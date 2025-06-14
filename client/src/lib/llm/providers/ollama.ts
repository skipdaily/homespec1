import { BaseLLMProvider, LLMConfig, LLMMessage, LLMResponse, StreamingOptions } from '../types';

export class OllamaProvider extends BaseLLMProvider {
  private baseUrl: string;

  constructor(config: LLMConfig) {
    super(config);
    this.baseUrl = this.getBaseUrl();
  }

  private getBaseUrl(): string {
    // Default Ollama local server URL, can be overridden with environment variable
    return import.meta.env.VITE_OLLAMA_BASE_URL || 
           (typeof window !== 'undefined' && (window as any).env?.VITE_OLLAMA_BASE_URL) ||
           'http://localhost:11434';
  }

  async generateResponse(messages: LLMMessage[]): Promise<LLMResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: this.convertMessagesToOllamaFormat(messages),
          stream: false,
          options: {
            temperature: this.config.temperature || 0.7,
            num_predict: this.config.maxTokens || 1000,
            top_p: 0.9,
            top_k: 40,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Ollama API error: ${response.status} - ${error}`);
      }

      const data = await response.json();
      
      if (!data.message || !data.message.content) {
        throw new Error('No response content from Ollama');
      }

      return {
        content: data.message.content,
        model: this.config.model,
        usage: {
          prompt_tokens: data.prompt_eval_count || 0,
          completion_tokens: data.eval_count || 0,
          total_tokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
        },
        finish_reason: data.done ? 'stop' : 'length',
      };
    } catch (error) {
      throw new Error(`Ollama provider error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async generateStreamResponse(messages: LLMMessage[]): Promise<ReadableStream<string>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: this.convertMessagesToOllamaFormat(messages),
          stream: true,
          options: {
            temperature: this.config.temperature || 0.7,
            num_predict: this.config.maxTokens || 1000,
            top_p: 0.9,
            top_k: 40,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Ollama API error: ${response.status} - ${error}`);
      }

      const stream = response.body;
      if (!stream) {
        throw new Error('No stream received from Ollama');
      }

      return new ReadableStream({
        start(controller) {
          const reader = stream.getReader();
          const decoder = new TextDecoder();

          function push(): Promise<void> {
            return reader.read().then(({ done, value }) => {
              if (done) {
                controller.close();
                return;
              }

              const chunk = decoder.decode(value);
              const lines = chunk.split('\n');

              for (const line of lines) {
                if (line.trim()) {
                  try {
                    const data = JSON.parse(line);
                    if (data.message && data.message.content) {
                      controller.enqueue(data.message.content);
                    }
                    
                    // Check if streaming is done
                    if (data.done) {
                      controller.close();
                      return;
                    }
                  } catch (e) {
                    // Skip invalid JSON lines
                  }
                }
              }

              return push();
            });
          }

          return push();
        },
      });
    } catch (error) {
      throw new Error(`Ollama streaming error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private convertMessagesToOllamaFormat(messages: LLMMessage[]) {
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));
  }

  private estimateTokenCount(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  async validateConfiguration(): Promise<boolean> {
    try {
      // First check if Ollama server is running
      const healthResponse = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
      });

      if (!healthResponse.ok) {
        console.error('Ollama server is not running or not accessible');
        return false;
      }

      // Check if the specified model is available
      const modelsData = await healthResponse.json();
      const availableModels = modelsData.models?.map((m: any) => m.name) || [];
      
      if (!availableModels.includes(this.config.model)) {
        console.error(`Model ${this.config.model} is not available. Available models:`, availableModels);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Ollama configuration validation failed:', error);
      return false;
    }
  }

  validateConfig(): boolean {
    try {
      // For Ollama, we mainly need to check if baseUrl is accessible
      // Since it's a local service, we can't validate without making a request
      // Return true if basic config is present
      return !!(this.config.model && this.baseUrl);
    } catch (error) {
      console.error('Ollama configuration validation failed:', error);
      return false;
    }
  }

  getSupportedModels(): string[] {
    return this.getDefaultModels();
  }

  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) {
        throw new Error('Failed to fetch available models');
      }
      
      const data = await response.json();
      return data.models?.map((m: any) => m.name) || [];
    } catch (error) {
      console.error('Failed to get available Ollama models:', error);
      return this.getDefaultModels();
    }
  }

  getDefaultModels(): string[] {
    return [
      'llama3.1:8b',
      'llama3.1:70b',
      'llama3.2:3b',
      'mistral:7b',
      'codellama:7b',
      'qwen2.5:7b',
      'phi3:mini',
    ];
  }

  getModelLimits(model: string): { maxTokens: number; contextWindow: number } {
    // Default limits for Ollama models (varies by model)
    const limits: Record<string, { maxTokens: number; contextWindow: number }> = {
      'llama3.1:8b': { maxTokens: 4096, contextWindow: 131072 },
      'llama3.1:70b': { maxTokens: 4096, contextWindow: 131072 },
      'llama3.2:3b': { maxTokens: 2048, contextWindow: 131072 },
      'mistral:7b': { maxTokens: 4096, contextWindow: 32768 },
      'codellama:7b': { maxTokens: 4096, contextWindow: 16384 },
      'qwen2.5:7b': { maxTokens: 4096, contextWindow: 32768 },
      'phi3:mini': { maxTokens: 2048, contextWindow: 128000 },
    };

    return limits[model] || { maxTokens: 2048, contextWindow: 4096 };
  }

  async pullModel(modelName: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/pull`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: modelName,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to pull model: ${response.statusText}`);
      }

      // Note: This is a streaming response, but for simplicity we're not handling the stream
      // In a real implementation, you might want to show download progress
      console.log(`Model ${modelName} pulled successfully`);
    } catch (error) {
      throw new Error(`Failed to pull Ollama model: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
