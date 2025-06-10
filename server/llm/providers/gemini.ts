import { BaseLLMProvider, LLMMessage, LLMResponse } from '../types';

export class GeminiProvider extends BaseLLMProvider {
  async generateResponse(messages: LLMMessage[]): Promise<LLMResponse> {
    if (!this.config.apiKey) {
      throw new Error('Gemini API key is required');
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.config.model}:generateContent?key=${this.config.apiKey}`;
    
    // Convert messages to Gemini format
    const contents = messages
      .filter(m => m.role !== 'system')
      .map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));

    // Add system instruction if present
    const systemMessage = messages.find(m => m.role === 'system')?.content;
    
    const requestBody: any = {
      contents,
      generationConfig: {
        temperature: this.config.temperature || 0.7,
        maxOutputTokens: this.config.maxTokens || 1000,
      }
    };

    if (systemMessage) {
      requestBody.systemInstruction = {
        parts: [{ text: systemMessage }]
      };
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        content: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
        model: this.config.model,
        usage: data.usageMetadata ? {
          prompt_tokens: data.usageMetadata.promptTokenCount || 0,
          completion_tokens: data.usageMetadata.candidatesTokenCount || 0,
          total_tokens: data.usageMetadata.totalTokenCount || 0
        } : undefined,
        finish_reason: data.candidates?.[0]?.finishReason
      };
    } catch (error) {
      console.error('Gemini API error:', error);
      throw error;
    }
  }

  async validateConfig(): Promise<boolean> {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${this.config.apiKey}`;
      const response = await fetch(url);
      return response.ok;
    } catch {
      return false;
    }
  }
}
