import { BaseLLMProvider, LLMMessage, LLMResponse } from '../types';

export class OpenAIProvider extends BaseLLMProvider {
  async generateResponse(messages: LLMMessage[]): Promise<LLMResponse> {
    // Always require an API key, regardless of environment
    if (!this.config.apiKey) {
      throw new Error('OpenAI API key is required');
    }

    // Always use the real API, no more mock responses
    // Development mode will use the API key from the .env file

    const url = this.config.baseURL || 'https://api.openai.com/v1/chat/completions';
    
    const requestBody = {
      model: this.config.model,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      ...this.getBaseConfig()
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        content: data.choices[0]?.message?.content || '',
        model: data.model,
        usage: data.usage,
        finish_reason: data.choices[0]?.finish_reason
      };
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw error;
    }
  }

  async validateConfig(): Promise<boolean> {
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`
        }
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
