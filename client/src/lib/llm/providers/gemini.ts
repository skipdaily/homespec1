import { BaseLLMProvider, LLMConfig, LLMMessage, LLMResponse, StreamingOptions } from '../types';

export class GeminiProvider extends BaseLLMProvider {
  private apiKey: string;

  constructor(config: LLMConfig) {
    super(config);
    this.apiKey = this.getApiKey();
  }

  private getApiKey(): string {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || 
                   (typeof window !== 'undefined' && (window as any).env?.VITE_GEMINI_API_KEY);
    
    if (!apiKey) {
      throw new Error('Gemini API key not found. Please set VITE_GEMINI_API_KEY in your environment variables.');
    }
    
    return apiKey;
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
      // Convert messages to Gemini format
      const contents = this.formatMessages(messages);
      
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.config.model}:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents,
            generationConfig: {
              temperature: options?.temperature || this.config.temperature || 0.7,
              maxOutputTokens: options?.maxTokens || this.config.maxTokens || 1000,
              topP: 0.95,
              topK: 64,
            },
            safetySettings: [
              {
                category: "HARM_CATEGORY_HARASSMENT",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
              },
              {
                category: "HARM_CATEGORY_HATE_SPEECH",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
              },
              {
                category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
              },
              {
                category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
              }
            ]
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Gemini API error: ${response.status} - ${error}`);
      }

      const data = await response.json();
      
      if (!data.candidates || data.candidates.length === 0) {
        throw new Error('No response from Gemini');
      }

      const candidate = data.candidates[0];
      
      if (candidate.finishReason === 'SAFETY') {
        throw new Error('Response blocked by Gemini safety filters');
      }

      const content = candidate.content?.parts?.[0]?.text || '';
      
      return {
        content,
        model: this.config.model,
        usage: data.usageMetadata ? {
          prompt_tokens: data.usageMetadata.promptTokenCount || 0,
          completion_tokens: data.usageMetadata.candidatesTokenCount || 0,
          total_tokens: data.usageMetadata.totalTokenCount || 0,
        } : undefined,
        finish_reason: candidate.finishReason,
      };
    } catch (error) {
      throw new Error(`Gemini provider error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  protected formatMessages(messages: LLMMessage[]) {
    return messages
      .filter(msg => msg.role !== 'system') // Gemini doesn't support system messages directly
      .map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }));
  }

  validateConfig(): boolean {
    try {
      if (!this.apiKey) {
        return false;
      }
      return true;
    } catch (error) {
      console.error('Gemini configuration validation failed:', error);
      return false;
    }
  }

  getSupportedModels(): string[] {
    return [
      'gemini-1.5-pro',
      'gemini-1.5-flash',
      'gemini-1.0-pro',
    ];
  }

  getModelLimits(model: string): { maxTokens: number; contextWindow: number } {
    const limits: Record<string, { maxTokens: number; contextWindow: number }> = {
      'gemini-1.5-pro': { maxTokens: 8192, contextWindow: 2000000 },
      'gemini-1.5-flash': { maxTokens: 8192, contextWindow: 1000000 },
      'gemini-1.0-pro': { maxTokens: 2048, contextWindow: 30720 },
    };

    return limits[model] || { maxTokens: 2048, contextWindow: 30720 };
  }
}
