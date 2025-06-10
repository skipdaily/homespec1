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
   * Get supported models for a provider
   */
  static getSupportedModels(provider: LLMProvider): string[] {
    const dummyConfig: LLMConfig = {
      provider,
      model: 'dummy',
      apiKey: 'dummy'
    };

    try {
      const providerInstance = this.createProvider(dummyConfig);
      return providerInstance.getSupportedModels();
    } catch {
      return [];
    }
  }

  /**
   * Validate provider configuration
   */
  static async validateConfig(config: LLMConfig): Promise<boolean> {
    try {
      const provider = this.createProvider(config);
      return provider.validateConfig();
    } catch {
      return false;
    }
  }

  /**
   * Test API key for a specific provider
   */
  static async testApiKey(provider: LLMProvider, apiKey: string): Promise<boolean> {
    try {
      switch (provider) {
        case 'openai':
          return await OpenAIProvider.testApiKey(apiKey);
        
        case 'anthropic':
          return await AnthropicProvider.testApiKey(apiKey);
        
        case 'gemini':
          // TODO: Implement Gemini API key test
          return false;
        
        case 'ollama':
          // Ollama typically doesn't require API keys
          return true;
        
        default:
          return false;
      }
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
   * Remove specific provider from cache
   */
  static removeCachedProvider(config: LLMConfig): void {
    const cacheKey = this.generateCacheKey(config);
    this.providers.delete(cacheKey);
  }

  /**
   * Generate cache key for provider configuration
   */
  private static generateCacheKey(config: LLMConfig): string {
    const keyParts = [
      config.provider,
      config.model,
      config.apiKey?.substring(0, 8) || 'no-key', // Only use first 8 chars for security
      config.baseURL || 'default-url',
      config.temperature?.toString() || '0.7',
      config.maxTokens?.toString() || '1000'
    ];
    
    return keyParts.join('|');
  }

  /**
   * Get default configurations for each provider
   */
  static getDefaultConfigs(): Record<LLMProvider, Partial<LLMConfig>> {
    return {
      openai: {
        provider: 'openai',
        model: 'gpt-4o-mini',
        temperature: 0.7,
        maxTokens: 1000
      },
      anthropic: {
        provider: 'anthropic',
        model: 'claude-3-5-haiku-20241022',
        temperature: 0.7,
        maxTokens: 1000
      },
      gemini: {
        provider: 'gemini',
        model: 'gemini-pro',
        temperature: 0.7,
        maxTokens: 1000
      },
      ollama: {
        provider: 'ollama',
        model: 'llama2',
        baseURL: 'http://localhost:11434',
        temperature: 0.7,
        maxTokens: 1000
      }
    };
  }
}

// Convenience functions for common use cases
export const createOpenAIProvider = (apiKey: string, model = 'gpt-4o-mini') => {
  return LLMFactory.getProvider({
    provider: 'openai',
    model,
    apiKey,
    temperature: 0.7,
    maxTokens: 1000
  });
};

export const createAnthropicProvider = (apiKey: string, model = 'claude-3-5-haiku-20241022') => {
  return LLMFactory.getProvider({
    provider: 'anthropic',
    model,
    apiKey,
    temperature: 0.7,
    maxTokens: 1000
  });
};
