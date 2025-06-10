import { BaseLLMProvider, LLMMessage, LLMResponse } from '../types';

export class OllamaProvider extends BaseLLMProvider {
  async generateResponse(messages: LLMMessage[]): Promise<LLMResponse> {
    const url = `${this.config.baseURL || 'http://localhost:11434'}/api/chat`;
    
    const requestBody = {
      model: this.config.model,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      stream: false,
      options: {
        temperature: this.config.temperature || 0.7,
        num_predict: this.config.maxTokens || 1000,
      }
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        content: data.message?.content || '',
        model: data.model || this.config.model,
        usage: data.prompt_eval_count ? {
          prompt_tokens: data.prompt_eval_count || 0,
          completion_tokens: data.eval_count || 0,
          total_tokens: (data.prompt_eval_count || 0) + (data.eval_count || 0)
        } : undefined,
        finish_reason: data.done ? 'stop' : 'length'
      };
    } catch (error) {
      console.error('Ollama API error:', error);
      throw error;
    }
  }

  async validateConfig(): Promise<boolean> {
    try {
      const url = `${this.config.baseURL || 'http://localhost:11434'}/api/tags`;
      const response = await fetch(url);
      return response.ok;
    } catch {
      return false;
    }
  }
}
