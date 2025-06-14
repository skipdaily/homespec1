import { BaseLLMProvider, LLMMessage, LLMResponse } from '../types';

export class OpenAIProvider extends BaseLLMProvider {
  async generateResponse(messages: LLMMessage[]): Promise<LLMResponse> {
    // Always require an API key, regardless of environment
    if (!this.config.apiKey) {
      throw new Error('OpenAI API key is required');
    }

    console.log(`Using OpenAI API key starting with: ${this.config.apiKey.substring(0, 10)}...`);
    console.log(`Using model: ${this.config.model}`);

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
      console.log(`Sending request to OpenAI API at ${url}`);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error(`OpenAI API error: ${response.status} ${response.statusText}`);
        console.error(`Error details: ${errorData}`);
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorData}`);
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
      
      if (!response.ok) {
        console.error(`OpenAI validation failed: ${response.status} ${response.statusText}`);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('OpenAI validation error:', error);
      return false;
    }
  }
}
