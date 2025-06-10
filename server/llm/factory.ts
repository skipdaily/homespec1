import { BaseLLMProvider, LLMConfig, LLMProvider } from './types';
import { OpenAIProvider } from './providers/openai';
import { AnthropicProvider } from './providers/anthropic';
import { GeminiProvider } from './providers/gemini';
import { OllamaProvider } from './providers/ollama';

export class LLMFactory {
  private static providers: Map<string, BaseLLMProvider> = new Map();

  /**
   * Creates or retrieves a cached LLM provider instance
   */
  static getProvider(config: LLMConfig): BaseLLMProvider {
    const cacheKey = this.generateCacheKey(config);
    
    if (this.providers.has(cacheKey)) {
      return this.providers.get(cacheKey)!;
    }

    const provider = this.createProvider(config);
    this.providers.set(cacheKey, provider);
    return provider;
  }

  /**
   * Creates a new provider instance without caching
   */
  static createProvider(config: LLMConfig): BaseLLMProvider {
    switch (config.provider) {
      case 'openai':
        return new OpenAIProvider(config);
      
      case 'anthropic':
        return new AnthropicProvider(config);
      
      case 'gemini':
        return new GeminiProvider(config);
      
      case 'ollama':
        return new OllamaProvider(config);
      
      default:
        throw new Error(`Unsupported LLM provider: ${config.provider}`);
    }
  }

  /**
   * Get available providers
   */
  static getAvailableProviders(): LLMProvider[] {
    return ['openai', 'anthropic', 'gemini', 'ollama'];
  }

  /**
   * Validate a configuration
   */
  static async validateConfig(config: LLMConfig): Promise<boolean> {
    try {
      const provider = this.createProvider(config);
      return await provider.validateConfig();
    } catch {
      return false;
    }
  }

  /**
   * Clear provider cache
   */
  static clearCache(): void {
    this.providers.clear();
  }

  /**
   * Generate cache key for provider instances
   */
  private static generateCacheKey(config: LLMConfig): string {
    return `${config.provider}:${config.model}:${config.apiKey?.slice(0, 8)}`;
  }

  /**
   * Get default models for each provider
   */
  static getDefaultModels(): Record<LLMProvider, string[]> {
    return {
      openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
      anthropic: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'],
      gemini: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-pro'],
      ollama: ['llama3.2', 'llama3.1', 'codellama', 'mistral']
    };
  }
}
