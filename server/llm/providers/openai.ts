import { BaseLLMProvider, LLMMessage, LLMResponse } from '../types';

export class OpenAIProvider extends BaseLLMProvider {
  async generateResponse(messages: LLMMessage[]): Promise<LLMResponse> {
    // Enhanced error handling with detailed logging
    console.log('🤖 OpenAI Provider - Starting generateResponse');
    console.log('🔑 Config check:', {
      hasApiKey: !!this.config.apiKey,
      apiKeyLength: this.config.apiKey?.length || 0,
      apiKeyStart: this.config.apiKey?.substring(0, 10) || 'N/A',
      model: this.config.model,
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens
    });

    if (!this.config.apiKey) {
      const error = new Error('OpenAI API key is required but not found in configuration');
      console.error('❌ OpenAI API key missing:', error.message);
      throw error;
    }

    if (!this.config.apiKey.startsWith('sk-')) {
      const error = new Error('Invalid OpenAI API key format (should start with sk-)');
      console.error('❌ Invalid API key format:', error.message);
      throw error;
    }

    const url = this.config.baseURL || 'https://api.openai.com/v1/chat/completions';
    
    const requestBody = {
      model: this.config.model,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      ...this.getBaseConfig()
    };

    console.log('📤 Sending request to OpenAI:', {
      url,
      model: requestBody.model,
      messageCount: requestBody.messages.length,
      temperature: requestBody.temperature,
      max_tokens: requestBody.max_tokens
    });

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify(requestBody)
      });

      console.log('📥 OpenAI response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('❌ OpenAI API error:', {
          status: response.status,
          statusText: response.statusText,
          errorData,
          url,
          model: this.config.model
        });

        // Provide specific error messages based on status codes
        let userFriendlyMessage = 'OpenAI API request failed';
        if (response.status === 401) {
          userFriendlyMessage = 'Invalid OpenAI API key. Please check your API key in settings.';
        } else if (response.status === 429) {
          userFriendlyMessage = 'OpenAI API rate limit exceeded. Please try again in a moment.';
        } else if (response.status === 500) {
          userFriendlyMessage = 'OpenAI API is experiencing issues. Please try again later.';
        } else if (response.status === 400) {
          userFriendlyMessage = 'Invalid request to OpenAI API. Please check your message format.';
        }

        throw new Error(`${userFriendlyMessage} (Status: ${response.status})`);
      }

      const data = await response.json();
      console.log('✅ OpenAI response parsed successfully:', {
        model: data.model,
        usage: data.usage,
        choicesCount: data.choices?.length || 0,
        finishReason: data.choices?.[0]?.finish_reason
      });
      
      return {
        content: data.choices[0]?.message?.content || '',
        model: data.model,
        usage: data.usage,
        finish_reason: data.choices[0]?.finish_reason
      };
    } catch (error) {
      console.error('💥 OpenAI API error (catch block):', {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : typeof error
      });
      
      // Re-throw with enhanced error information
      if (error instanceof Error) {
        throw new Error(`OpenAI API Error: ${error.message}`);
      } else {
        throw new Error(`OpenAI API Error: Unknown error occurred`);
      }
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
