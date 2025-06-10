import { db, initializeDatabase, testDatabaseConnection, connectionState } from "./db";
import { eq, and, sql } from "drizzle-orm";
import crypto from "crypto";
import { projects, rooms, finishes, finishHistory, items, conversations, messages, chatSettings, knowledgeBase } from "@shared/schema";
import type { Project, InsertProject, Room, InsertRoom, Finish, InsertFinish, FinishHistory, Item, InsertItem, Conversation, InsertConversation, Message, InsertMessage, ChatSettings, InsertChatSettings, KnowledgeBase, InsertKnowledgeBase } from "@shared/schema";

// Storage mode - force database only
export const storageMode: 'database' = 'database';

// Interface for storage operations
export interface IStorage {
  // Project operations
  getProject(id: string): Promise<Project | undefined>;
  getProjectsByUserId(userId: string): Promise<Project[]>;
  getProjectByAccessCode(accessCode: string): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;

  // Room operations
  getRoom(id: string): Promise<Room | undefined>;
  getRoomsByProjectId(projectId: string): Promise<Room[]>;
  createRoom(room: InsertRoom): Promise<Room>;

  // Item operations
  getItemsByRoomId(roomId: string): Promise<Item[]>;
  createItem(item: InsertItem): Promise<Item>;

  // Finish operations
  getFinish(id: string): Promise<Finish | undefined>;
  getFinishesByProjectId(projectId: string): Promise<Finish[]>;
  getFinishesByRoomId(roomId: string): Promise<Finish[]>;
  createFinish(finish: InsertFinish): Promise<Finish>;
  updateFinish(id: string, finish: Partial<InsertFinish>, userId: string): Promise<Finish>;

  // Finish History operations
  getFinishHistory(finishId: string): Promise<FinishHistory[]>;

  // Chat operations
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  getConversation(id: string): Promise<Conversation | undefined>;
  getConversationsByProjectId(projectId: string, userId: string): Promise<Conversation[]>;
  updateConversation(id: string, updates: Partial<InsertConversation>): Promise<Conversation>;
  deleteConversation(id: string): Promise<void>;

  // Message operations
  createMessage(message: InsertMessage): Promise<Message>;
  getConversationMessages(conversationId: string): Promise<Message[]>;
  deleteMessage(id: string): Promise<void>;

  // Chat settings operations
  getChatSettings(projectId: string, userId: string): Promise<ChatSettings | undefined>;
  createChatSettings(settings: InsertChatSettings): Promise<ChatSettings>;
  updateChatSettings(projectId: string, userId: string, settings: Partial<InsertChatSettings>): Promise<ChatSettings>;

  // Knowledge base operations
  createKnowledgeBaseEntry(entry: InsertKnowledgeBase): Promise<KnowledgeBase>;
  getKnowledgeBaseByProjectId(projectId: string): Promise<KnowledgeBase[]>;
  updateKnowledgeBaseEntry(id: string, updates: Partial<InsertKnowledgeBase>): Promise<KnowledgeBase>;
  deleteKnowledgeBaseEntry(id: string): Promise<void>;
}

// Database implementation - the only storage we use
export class DatabaseStorage implements IStorage {
  async getProject(id: string): Promise<Project | undefined> {
    try {
      const [project] = await db.select().from(projects).where(eq(projects.id, id));
      return project;
    } catch (error: any) {
      // Handle case where columns don't exist in the database yet
      if (error.message && error.message.includes('column "require_pin" does not exist')) {
        console.warn('⚠️ require_pin column not found in database. Migration needed.');
        
        // Fallback query without the missing columns
        const result = await db.execute(
          `SELECT id, user_id, name, address, builder_name, access_code, completion_date, created_at 
           FROM projects 
           WHERE id = $1`,
          [id]
        );
        
        if (result.rows.length === 0) return undefined;
        
        // Map to Project type with default values for missing columns
        return {
          ...result.rows[0],
          require_pin: false, // Default value
          edit_pin: null      // Default value
        };
      }
      // If any other error, rethrow it
      throw error;
    }
  }

  async getProjectsByUserId(userId: string): Promise<Project[]> {
    try {
      return await db.select().from(projects).where(eq(projects.user_id, userId));
    } catch (error: any) {
      // Handle case where columns don't exist in the database yet
      if (error.message && error.message.includes('column "require_pin" does not exist')) {
        console.warn('⚠️ require_pin column not found in database. Migration needed.');
        
        // Fallback query without the missing columns
        const rawProjects = await db.execute(
          `SELECT id, user_id, name, address, builder_name, access_code, completion_date, created_at 
           FROM projects 
           WHERE user_id = $1`,
          [userId]
        );
        
        // Map to Project type with default values for missing columns
        return rawProjects.rows.map((row: Record<string, any>) => ({
          ...row,
          require_pin: false, // Default value
          edit_pin: null      // Default value
        }));
      }
      // If any other error, rethrow it
      throw error;
    }
  }

  async getProjectByAccessCode(accessCode: string): Promise<Project | undefined> {
    try {
      const [project] = await db.select().from(projects).where(eq(projects.access_code, accessCode));
      return project;
    } catch (error: any) {
      // Handle case where columns don't exist in the database yet
      if (error.message && error.message.includes('column "require_pin" does not exist')) {
        console.warn('⚠️ require_pin column not found in database. Migration needed.');
        
        // Fallback query without the missing columns
        const result = await db.execute(
          `SELECT id, user_id, name, address, builder_name, access_code, completion_date, created_at 
           FROM projects 
           WHERE access_code = $1`,
          [accessCode]
        );
        
        if (result.rows.length === 0) return undefined;
        
        // Map to Project type with default values for missing columns
        return {
          ...result.rows[0],
          require_pin: false, // Default value
          edit_pin: null      // Default value
        };
      }
      // If any other error, rethrow it
      throw error;
    }
  }

  async createProject(project: InsertProject): Promise<Project> {
    try {
      const [created] = await db.insert(projects).values(project).returning();
      return created;
    } catch (error: any) {
      // Handle case where columns don't exist in the database yet
      if (error.message && error.message.includes('column "require_pin" does not exist')) {
        console.warn('⚠️ require_pin column not found in database. Migration needed.');
        
        // Create a simplified version of the project object without the missing columns
        const projectId = crypto.randomUUID();
        
        const columnsQuery = `
          INSERT INTO projects (
            id, user_id, name, address, builder_name, access_code, completion_date, created_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, NOW()
          ) RETURNING id, user_id, name, address, builder_name, access_code, completion_date, created_at
        `;
        
        const values = [
          projectId,
          project.user_id,
          project.name,
          project.address,
          project.builder_name,
          project.access_code,
          project.completion_date
        ];
        
        const result = await db.execute(columnsQuery, values);
        
        // Add the missing fields with default values
        return {
          ...result.rows[0],
          require_pin: false,
          edit_pin: null
        };
      }
      // If any other error, rethrow it
      throw error;
    }
  }

  async getRoom(id: string): Promise<Room | undefined> {
    const [room] = await db.select().from(rooms).where(eq(rooms.id, id));
    return room;
  }

  async getRoomsByProjectId(projectId: string): Promise<Room[]> {
    try {
      return await db.select().from(rooms).where(eq(rooms.project_id, projectId));
    } catch (error: any) {
      // Handle case where columns don't exist in the database yet
      if (error.message && error.message.includes('column "updated_at" does not exist')) {
        console.warn('⚠️ updated_at column not found in rooms table. Migration needed.');
        
        // Fallback query without the missing columns
        const result = await db.execute(
          `SELECT id, project_id, name, floor_number, description, dimensions, created_at
           FROM rooms
           WHERE project_id = $1`,
          [projectId]
        );
        
        // Add default value for missing column
        return result.rows.map((row: Record<string, any>) => ({
          ...row,
          updated_at: row.created_at // Use created_at as fallback
        }));
      }
      // If any other error, rethrow it
      throw error;
    }
  }

  async createRoom(room: InsertRoom): Promise<Room> {
    const [created] = await db.insert(rooms).values(room).returning();
    return created;
  }

  async getItemsByRoomId(roomId: string): Promise<Item[]> {
    return await db.select().from(items).where(eq(items.room_id, roomId));
  }

  async createItem(item: InsertItem): Promise<Item> {
    const [created] = await db.insert(items).values(item).returning();
    return created;
  }

  async getFinish(id: string): Promise<Finish | undefined> {
    try {
      // Look up item by ID
      const [item] = await db.select().from(items).where(eq(items.id, id));
      
      if (!item) {
        return undefined;
      }
      
      // Convert item to finish format
      const finish: Finish = {
        id: item.id,
        room_id: item.room_id,
        project_id: "", // No direct mapping
        name: item.name,
        category: item.category || "Unknown",
        manufacturer: item.brand || null,
        supplier: item.supplier || null,
        color: null,
        material: null,
        dimensions: null,
        model_number: null,
        specifications: item.specifications || null,
        warranty_info: item.warranty_info || null,
        maintenance_instructions: item.maintenance_notes || null,
        installation_date: item.installation_date || null,
        cost: item.cost || null,
        image_url: null,
        document_urls: item.document_urls || [],
        version: item.version || 1,
        created_at: item.created_at,
        updated_at: item.updated_at
      };
      
      return finish;
    } catch (error) {
      console.error('Error in getFinish:', error);
      return undefined;
    }
  }

  async getFinishesByProjectId(projectId: string): Promise<Finish[]> {
    try {
      // First, get all rooms for this project
      const projectRooms = await this.getRoomsByProjectId(projectId);
      
      // Then get all items for these rooms and convert them to Finish objects
      const allFinishes: Finish[] = [];
      
      for (const room of projectRooms) {
        const roomFinishes = await this.getFinishesByRoomId(room.id);
        // Add project ID to each finish object
        roomFinishes.forEach(finish => {
          finish.project_id = projectId;
        });
        allFinishes.push(...roomFinishes);
      }
      
      return allFinishes;
    } catch (error) {
      console.error('Error in getFinishesByProjectId:', error);
      return [];
    }
  }

  async getFinishesByRoomId(roomId: string): Promise<Finish[]> {
    try {
      // We will use items instead of finishes, mapping the fields as needed
      const roomItems = await db.select().from(items).where(eq(items.room_id, roomId));
      
      // Map items to finishes interface with proper type handling
      return roomItems.map((item: Item) => {
        // Create a finish object from item data
        const finish: Finish = {
          id: item.id,
          room_id: item.room_id,
          project_id: "", // No direct mapping, use empty string
          name: item.name,
          category: item.category || "Unknown",
          manufacturer: item.brand || null,
          supplier: item.supplier || null,
          color: null, // No direct mapping
          material: null, // No direct mapping
          dimensions: null, // No direct mapping
          model_number: null, // No direct mapping
          specifications: item.specifications || null,
          warranty_info: item.warranty_info || null,
          maintenance_instructions: item.maintenance_notes || null,
          installation_date: item.installation_date || null,
          cost: item.cost || null,
          image_url: null, // No direct mapping
          document_urls: item.document_urls || [],
          version: item.version || 1,
          created_at: item.created_at,
          updated_at: item.updated_at
        };
        return finish;
      });
    } catch (error) {
      console.error('Error in getFinishesByRoomId:', error);
      // Fallback to empty array on error
      return [];
    }
  }

  async createFinish(finish: InsertFinish): Promise<Finish> {
    try {
      // Convert finish to item format
      const item: InsertItem = {
        room_id: finish.room_id || '',
        name: finish.name,
        brand: finish.manufacturer,
        supplier: finish.supplier,
        specifications: finish.specifications,
        cost: finish.cost,
        warranty_info: finish.warranty_info,
        installation_date: finish.installation_date,
        maintenance_notes: finish.maintenance_instructions,
        category: finish.category || 'Unknown',
        status: 'active',
        document_urls: finish.document_urls,
        notes: `Material: ${finish.material || 'Unknown'}, Color: ${finish.color || 'Unknown'}`
      };
      
      // Create item record
      const [created] = await db.insert(items).values(item).returning();
      
      // Convert back to finish format
      const createdFinish: Finish = {
        id: created.id,
        room_id: created.room_id,
        project_id: finish.project_id,
        name: created.name,
        category: created.category,
        manufacturer: created.brand,
        supplier: created.supplier,
        color: null,
        material: null,
        dimensions: null,
        model_number: null,
        specifications: created.specifications,
        warranty_info: created.warranty_info,
        maintenance_instructions: created.maintenance_notes,
        installation_date: created.installation_date,
        cost: created.cost,
        image_url: null,
        document_urls: created.document_urls,
        version: created.version,
        created_at: created.created_at,
        updated_at: created.updated_at
      };
      
      return createdFinish;
    } catch (error) {
      console.error('Error in createFinish:', error);
      throw error;
    }
  }

  async updateFinish(id: string, finish: Partial<InsertFinish>, userId: string): Promise<Finish> {
    // Start a transaction
    return await db.transaction(async (tx: any) => {
      try {
        // Get the current item
        const [currentItem] = await tx
          .select()
          .from(items)
          .where(eq(items.id, id));

        if (!currentItem) {
          throw new Error("Item not found");
        }

        // Create an item history record
        await tx.insert(itemHistory).values({
          item_id: id,
          room_id: currentItem.room_id,
          name: currentItem.name,
          brand: currentItem.brand,
          supplier: currentItem.supplier,
          specifications: currentItem.specifications,
          cost: currentItem.cost,
          warranty_info: currentItem.warranty_info,
          installation_date: currentItem.installation_date,
          maintenance_notes: currentItem.maintenance_notes,
          category: currentItem.category,
          status: currentItem.status,
          image_url: null,
          document_urls: currentItem.document_urls,
          link: currentItem.link,
          notes: currentItem.notes,
          version: currentItem.version,
        });

        // Map finish fields to item fields
        const itemUpdates: Partial<InsertItem> = {
          name: finish.name,
          brand: finish.manufacturer,
          supplier: finish.supplier,
          specifications: finish.specifications,
          cost: finish.cost,
          warranty_info: finish.warranty_info,
          installation_date: finish.installation_date,
          maintenance_notes: finish.maintenance_instructions,
          category: finish.category,
          notes: currentItem.notes
        };

        // If finish has material or color, add to notes
        if (finish.material || finish.color) {
          const materialNote = `Material: ${finish.material || 'Unknown'}`;
          const colorNote = `Color: ${finish.color || 'Unknown'}`;
          itemUpdates.notes = `${materialNote}, ${colorNote}`;
        }

        // Update the item with new version
        const [updatedItem] = await tx
          .update(items)
          .set({
            ...itemUpdates,
            version: currentItem.version + 1,
            updated_at: new Date(),
          })
          .where(eq(items.id, id))
          .returning();

        // Convert to finish object
        const updatedFinish: Finish = {
          id: updatedItem.id,
          room_id: updatedItem.room_id,
          project_id: "", // No direct mapping
          name: updatedItem.name,
          category: updatedItem.category || "Unknown",
          manufacturer: updatedItem.brand,
          supplier: updatedItem.supplier,
          color: null, // Stored in notes
          material: null, // Stored in notes
          dimensions: null,
          model_number: null,
          specifications: updatedItem.specifications,
          warranty_info: updatedItem.warranty_info,
          maintenance_instructions: updatedItem.maintenance_notes,
          installation_date: updatedItem.installation_date,
          cost: updatedItem.cost,
          image_url: null,
          document_urls: updatedItem.document_urls,
          version: updatedItem.version,
          created_at: updatedItem.created_at,
          updated_at: updatedItem.updated_at
        };

        return updatedFinish;
      } catch (error) {
        console.error('Error in updateFinish:', error);
        throw error;
      }
    });
  }

  async getFinishHistory(finishId: string): Promise<FinishHistory[]> {
    try {
      // Get item history records for this item ID
      const query = `
        SELECT * FROM item_history
        WHERE item_id = $1
        ORDER BY version
      `;
      
      const result = await db.execute(query, [finishId]);
      const historyRecords = result.rows || [];
      
      // Convert item history to finish history
      const finishHistoryRecords: FinishHistory[] = historyRecords.map((record: any) => {
        return {
          id: record.id,
          finish_id: record.item_id,
          version: record.version,
          change_type: 'edit', // Default value
          previous_data: JSON.stringify({
            id: record.id,
            room_id: record.room_id,
            project_id: "", // No direct mapping
            name: record.name,
            category: record.category,
            manufacturer: record.brand,
            supplier: record.supplier,
            color: null, 
            material: null,
            dimensions: null,
            model_number: null,
            specifications: record.specifications,
            warranty_info: record.warranty_info,
            maintenance_instructions: record.maintenance_notes,
            installation_date: record.installation_date,
            cost: record.cost,
            image_url: record.image_url,
            document_urls: record.document_urls,
            version: record.version
          }),
          changed_by: "", // No direct mapping
          changed_at: record.created_at,
          created_at: record.created_at
        };
      });
      
      return finishHistoryRecords;
    } catch (error) {
      console.error('Error in getFinishHistory:', error);
      return [];
    }
  }

  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const [created] = await db.insert(conversations).values(conversation).returning();
    return created;
  }

  async getConversation(id: string): Promise<Conversation | undefined> {
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conversation;
  }

  async getConversationsByProjectId(projectId: string, userId: string): Promise<Conversation[]> {
    return await db.select().from(conversations).where(and(eq(conversations.project_id, projectId), eq(conversations.user_id, userId)));
  }

  async updateConversation(id: string, updates: Partial<InsertConversation>): Promise<Conversation> {
    const [updated] = await db.update(conversations).set(updates).where(eq(conversations.id, id)).returning();
    return updated;
  }

  async deleteConversation(id: string): Promise<void> {
    await db.delete(conversations).where(eq(conversations.id, id));
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [created] = await db.insert(messages).values(message).returning();
    return created;
  }

  async getConversationMessages(conversationId: string): Promise<Message[]> {
    return await db.select().from(messages)
      .where(eq(messages.conversation_id, conversationId))
      .orderBy(messages.created_at);
  }

  async deleteMessage(id: string): Promise<void> {
    await db.delete(messages).where(eq(messages.id, id));
  }

  async getChatSettings(projectId: string, userId: string): Promise<ChatSettings | undefined> {
    const [settings] = await db.select().from(chatSettings).where(and(eq(chatSettings.project_id, projectId), eq(chatSettings.user_id, userId)));
    return settings;
  }

  async createChatSettings(settings: InsertChatSettings): Promise<ChatSettings> {
    const [created] = await db.insert(chatSettings).values(settings).returning();
    return created;
  }

  async updateChatSettings(projectId: string, userId: string, settings: Partial<InsertChatSettings>): Promise<ChatSettings> {
    const [updated] = await db.update(chatSettings).set(settings).where(and(eq(chatSettings.project_id, projectId), eq(chatSettings.user_id, userId))).returning();
    return updated;
  }

  async createKnowledgeBaseEntry(entry: InsertKnowledgeBase): Promise<KnowledgeBase> {
    const [created] = await db.insert(knowledgeBase).values(entry).returning();
    return created;
  }

  async getKnowledgeBaseByProjectId(projectId: string): Promise<KnowledgeBase[]> {
    return await db.select().from(knowledgeBase).where(eq(knowledgeBase.project_id, projectId));
  }

  async updateKnowledgeBaseEntry(id: string, updates: Partial<InsertKnowledgeBase>): Promise<KnowledgeBase> {
    const [updated] = await db.update(knowledgeBase).set(updates).where(eq(knowledgeBase.id, id)).returning();
    return updated;
  }

  async deleteKnowledgeBaseEntry(id: string): Promise<void> {
    await db.delete(knowledgeBase).where(eq(knowledgeBase.id, id));
  }
}

// Storage instance
let storageInstance: DatabaseStorage;

// Initialize storage based on database connection
export async function initializeStorage(): Promise<DatabaseStorage> {
  console.log('🔄 Initializing database storage...');
  
  try {
    // Initialize database connection and wait for it
    await initializeDatabase();
    
    // Check if database URL is available
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    
    // Test database connection
    const connected = await testDatabaseConnection();
    if (!connected) {
      throw new Error('Database connection test failed - please check your DATABASE_URL and network connection');
    }

    console.log('✅ Using DatabaseStorage (database connected successfully)');
    storageInstance = new DatabaseStorage();
    return storageInstance;
  } catch (error) {
    console.error('❌ Failed to initialize database storage:', error);
    throw error; // Don't fall back to mock - force fixing the database
  }
}

// Function to get the storage instance - ensures it's initialized
export async function getStorage(): Promise<DatabaseStorage> {
  if (!storageInstance) {
    return await initializeStorage();
  }
  return storageInstance;
}

// Initialize storage on module load
initializeStorage().catch(console.error);

// Export the storage - but prefer using getStorage() for new code
export { storageInstance as storage };