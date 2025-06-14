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

export interface ChatSettings {
  id: string;
  project_id: string;
  user_id: string;
  provider: LLMProvider;
  model: string;
  temperature: number;
  max_tokens: number;
  system_prompt?: string;
  restrict_to_project_data: boolean;
  enable_web_search: boolean;
  max_conversation_length: number;
  created_at: string;
  updated_at: string;
}

export interface StreamingOptions {
  onToken?: (token: string) => void;
  onComplete?: (response: LLMResponse) => void;
  onError?: (error: Error) => void;
}

export abstract class BaseLLMProvider {
  protected config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;
  }

  abstract generateResponse(
    messages: LLMMessage[],
    options?: {
      temperature?: number;
      maxTokens?: number;
      stream?: boolean;
      streamingOptions?: StreamingOptions;
    }
  ): Promise<LLMResponse>;

  abstract validateConfig(): boolean;
  abstract getSupportedModels(): string[];

  // Common utility methods
  protected formatMessages(messages: LLMMessage[]): any[] {
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
  }

  protected validateMessage(message: LLMMessage): boolean {
    return !!(message.role && message.content && 
             ['system', 'user', 'assistant'].includes(message.role));
  }
}
