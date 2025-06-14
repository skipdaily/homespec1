// LLM Provider Types and Interfaces
export type LLMProvider = 'openai' | 'anthropic' | 'gemini' | 'ollama';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

export interface LLMResponse {
  content: string;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  finish_reason?: string;
}

export interface LLMConfig {
  provider: LLMProvider;
  model: string;
  apiKey?: string;
  baseURL?: string; // For Ollama or custom endpoints
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

export abstract class BaseLLMProvider {
  protected config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;
  }

  abstract generateResponse(messages: LLMMessage[]): Promise<LLMResponse>;
  abstract validateConfig(): Promise<boolean>;
  
  protected getBaseConfig() {
    return {
      temperature: this.config.temperature || 0.7,
      max_tokens: this.config.maxTokens || 1000,
    };
  }
}
