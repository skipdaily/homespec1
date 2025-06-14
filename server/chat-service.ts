import { LLMFactory } from "./llm/factory";
import { LLMMessage, LLMConfig } from "./llm/types";
import { storage } from "./storage";

export class ChatService {
  /**
   * Process a chat message and generate AI response
   */
  static async processMessage(
    conversationId: string,
    userMessage: string,
    userId: string,
    projectId: string
  ) {
    try {
      // Get chat settings for the user/project, create default if none exist
      let settings = await storage.getChatSettings(projectId, userId);
      if (!settings) {
        console.log(`🔧 Creating default chat settings for user ${userId} in project ${projectId}`);          // Create default chat settings
        const defaultSettings = {
          project_id: projectId,
          user_id: userId,
          provider: 'openai' as const,
          model: 'gpt-4o-mini',
          temperature: '0.7',
          max_tokens: 1000,
          system_prompt: 'You are a helpful AI assistant for home construction and renovation projects. Use the project context provided to answer questions about specific items, materials, and rooms in the user\'s project. When asked about specific items like "what kind of countertops do I have?", refer to the project data to give accurate, detailed answers including brands, specifications, suppliers, and status information.',
          restrict_to_project_data: true,
          enable_web_search: false,
          max_conversation_length: 50
        };
        
        try {
          settings = await storage.createChatSettings(defaultSettings);
          console.log('✅ Default chat settings created successfully');
        } catch (error) {
          console.error('❌ Failed to create default chat settings:', error);
          throw new Error('Failed to initialize chat settings. Please try again.');
        }
      }

      // Get conversation history - use unified storage
      const messages = await storage.getConversationMessages(conversationId);
      
      // Limit conversation history based on settings
      const limitedMessages = messages.slice(-settings.max_conversation_length);

      // Build LLM configuration
      const llmConfig: LLMConfig = {
        provider: settings.provider,
        model: settings.model,
        apiKey: this.getApiKeyForProvider(settings.provider),
        temperature: parseFloat(settings.temperature),
        maxTokens: settings.max_tokens
      };

      // Build conversation context
      const conversationMessages: LLMMessage[] = [];

      // Add system prompt if configured
      if (settings.system_prompt) {
        conversationMessages.push({
          role: 'system',
          content: settings.system_prompt
        });
      }

      // Add project context if enabled
      if (settings.restrict_to_project_data) {
        const projectContext = await this.getProjectContext(projectId, userMessage);
        if (projectContext) {
          conversationMessages.push({
            role: 'system',
            content: `Project Context:\n${projectContext}`
          });
        }
      }

      // Add conversation history
      limitedMessages.forEach(msg => {
        conversationMessages.push({
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content
        });
      });

      // Add current user message
      conversationMessages.push({
        role: 'user',
        content: userMessage
      });

      // Save user message to database - use unified storage
      await storage.createMessage({
        conversation_id: conversationId,
        role: 'user',
        content: userMessage,
        token_count: this.estimateTokens(userMessage)
      });

      // Generate AI response
      const provider = LLMFactory.getProvider(llmConfig);
      const response = await provider.generateResponse(conversationMessages);

      // Save AI response to database - use unified storage
      const assistantMessage = await storage.createMessage({
        conversation_id: conversationId,
        role: 'assistant',
        content: response.content,
        token_count: response.usage?.completion_tokens || this.estimateTokens(response.content),
        metadata: {
          model: response.model,
          usage: response.usage,
          finish_reason: response.finish_reason
        }
      });

      // Update conversation timestamp
      // TODO: Fix this TypeScript error in schema
      // await storage.updateConversation(conversationId, {
      //   updated_at: new Date().toISOString()
      // });

      return {
        message: assistantMessage,
        usage: response.usage
      };

    } catch (error) {
      console.error('Chat service error:', error);
      throw error;
    }
  }

  /**
   * Create a new conversation
   */
  static async createConversation(projectId: string, userId: string, title: string) {
    return await storage.createConversation({
      project_id: projectId,
      user_id: userId,
      title: title || 'New Conversation'
    });
  }

  /**
   * Get project context for AI responses
   */
  private static async getProjectContext(projectId: string, query: string): Promise<string | null> {
    try {
      console.log(`🔍 Getting project context for project ${projectId} with query: "${query}"`);
      
      // Get comprehensive project data with error handling
      let project;
      try {
        project = await storage.getProject(projectId);
      } catch (error) {
        console.warn('Error fetching project, using basic info:', error);
        project = { id: projectId, name: 'Unknown Project' };
      }
      
      if (!project) return null;

      // Get rooms for this project
      let rooms: any[] = [];
      try {
        rooms = await storage.getRoomsByProjectId(projectId);
        console.log(`📍 Found ${rooms.length} rooms`);
      } catch (error) {
        console.warn('Error fetching rooms:', error);
      }
      
      // Get all items for the project (we use items instead of finishes)
      const allItems: any[] = [];
      
      for (const room of rooms) {
        try {
          const roomItems = await storage.getItemsByRoomId(room.id);
          
          console.log(`🏠 Room "${room.name}": ${roomItems.length} items`);
          
          // Add room context to items
          roomItems.forEach(item => {
            allItems.push({
              ...item,
              room_name: room.name
            });
          });
        } catch (roomError) {
          console.warn(`Error fetching data for room ${room.id}:`, roomError);
        }
      }

      console.log(`📋 Total items: ${allItems.length}`);

      // Build comprehensive context
      let context = `Project: ${project.name || projectId}\n`;
      if (project.address) {
        context += `Address: ${project.address}\n`;
      }
      if (project.builder_name) {
        context += `Builder: ${project.builder_name}\n`;
      }

      // Add rooms information
      if (rooms.length > 0) {
        context += `\nRooms (${rooms.length}):\n`;
        rooms.forEach(room => {
          context += `- ${room.name}`;
          if (room.description) context += ` - ${room.description}`;
          if (room.dimensions) context += ` (${room.dimensions})`;
          if (room.floor_number) context += ` - Floor ${room.floor_number}`;
          context += `\n`;
        });
      }

      // Add items information with intelligent filtering based on query
      if (allItems.length > 0) {
        context += `\nItems and Materials:\n`;
        
        // Filter items relevant to the query if possible
        const relevantItems = this.filterRelevantData(allItems, query);
        const itemsToShow = relevantItems.length > 0 ? relevantItems : allItems.slice(0, 10); // Show max 10 if no filtering
        
        console.log(`🎯 Filtered to ${itemsToShow.length} relevant items`);
        
        itemsToShow.forEach(item => {
          context += `- ${item.name}`;
          if (item.room_name) context += ` (in ${item.room_name})`;
          if (item.brand) context += ` - Brand: ${item.brand}`;
          if (item.specifications) context += ` - Specs: ${item.specifications}`;
          if (item.category) context += ` - Category: ${item.category}`;
          if (item.status) context += ` - Status: ${item.status}`;
          if (item.supplier) context += ` - Supplier: ${item.supplier}`;
          if (item.notes) context += ` - Notes: ${item.notes}`;
          context += `\n`;
        });
      }

      // Limit context size to prevent token overflow
      if (context.length > 3000) {
        context = context.substring(0, 3000) + '...\n[Context truncated for length]';
      }

      console.log(`📝 Final context length: ${context.length} characters`);
      console.log(`📋 Context preview:\n${context.substring(0, 500)}...`);

      return context;
    } catch (error) {
      console.error('Error getting project context:', error);
      return `Project: ${projectId} (Error loading details: ${error instanceof Error ? error.message : 'Unknown error'})`;
    }
  }

  /**
   * Filter data based on query relevance
   */
  private static filterRelevantData(data: any[], query: string): any[] {
    if (!query || query.length < 3) return [];
    
    const queryLower = query.toLowerCase();
    const keywords = queryLower.split(' ').filter(word => word.length > 2);
    
    return data.filter(item => {
      const searchText = [
        item.name,
        item.brand,
        item.category,
        item.specifications,
        item.notes,
        item.room_name,
        item.supplier,
        item.warranty_info,
        item.maintenance_notes,
        item.status
      ].join(' ').toLowerCase();
      
      return keywords.some(keyword => searchText.includes(keyword));
    });
  }

  /**
   * Get API key for the specified provider from environment
   */
  private static getApiKeyForProvider(provider: string): string {
    switch (provider) {
      case 'openai':
        const openaiKey = process.env.OPENAI_API_KEY;
        if (!openaiKey) {
          console.error('OpenAI API key is missing in environment variables');
          throw new Error('OpenAI API key not configured');
        }
        console.log(`Found OpenAI API key (${openaiKey.substring(0, 10)}...)`);
        return openaiKey;
      
      case 'anthropic':
        const anthropicKey = process.env.ANTHROPIC_API_KEY;
        if (!anthropicKey) {
          throw new Error('Anthropic API key not configured');
        }
        return anthropicKey;
      
      case 'gemini':
        const geminiKey = process.env.GEMINI_API_KEY;
        if (!geminiKey) {
          throw new Error('Gemini API key not configured');
        }
        return geminiKey;
      
      case 'ollama':
        // Ollama typically doesn't require API keys
        return '';
      
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  /**
   * Estimate token count for a text string
   * This is a rough approximation - for production use a proper tokenizer
   */
  private static estimateTokens(text: string): number {
    // Rough approximation: 1 token ≈ 4 characters for English text
    return Math.ceil(text.length / 4);
  }

  /**
   * Validate chat settings
   */
  static async validateChatSettings(settings: any): Promise<boolean> {
    try {
      const llmConfig: LLMConfig = {
        provider: settings.provider,
        model: settings.model,
        apiKey: this.getApiKeyForProvider(settings.provider),
        temperature: settings.temperature,
        maxTokens: settings.max_tokens
      };

      return await LLMFactory.validateConfig(llmConfig);
    } catch {
      return false;
    }
  }
}
