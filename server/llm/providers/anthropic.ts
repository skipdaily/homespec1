import { BaseLLMProvider, LLMMessage, LLMResponse } from '../types';

export class AnthropicProvider extends BaseLLMProvider {
  async generateResponse(messages: LLMMessage[]): Promise<LLMResponse> {
    if (!this.config.apiKey) {
      throw new Error('Anthropic API key is required');
    }

    const url = this.config.baseURL || 'https://api.anthropic.com/v1/messages';
    
    // Convert messages format for Anthropic
    const systemMessage = messages.find(m => m.role === 'system')?.content || '';
    const conversationMessages = messages
      .filter(m => m.role !== 'system')
      .map(msg => ({
        role: msg.role,
        content: msg.content
      }));

    const requestBody = {
      model: this.config.model,
      max_tokens: this.config.maxTokens || 1000,
      temperature: this.config.temperature || 0.7,
      system: systemMessage,
      messages: conversationMessages
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        content: data.content[0]?.text || '',
        model: data.model,
        usage: data.usage,
        finish_reason: data.stop_reason
      };
    } catch (error) {
      console.error('Anthropic API error:', error);
      throw error;
    }
  }

  async validateConfig(): Promise<boolean> {
    try {
      // Simple validation request to Anthropic
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: this.config.model,
          max_tokens: 1,
          messages: [{ role: 'user', content: 'test' }]
        })
      });
      return response.status === 200 || response.status === 400; // 400 is also valid (means API key works)
    } catch {
      return false;
    }
  }
}
