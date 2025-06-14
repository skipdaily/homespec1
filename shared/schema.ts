import { pgTable, text, uuid, timestamp, integer, numeric, date, boolean, pgEnum, json, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Projects table (represents individual homes)
export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").notNull(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  builder_name: text("builder_name").notNull(),
  access_code: text("access_code").notNull().unique(),
  require_pin: boolean("require_pin").default(false).notNull(),
  edit_pin: text("edit_pin"),
  completion_date: date("completion_date"),
  created_at: timestamp("created_at").defaultNow().notNull()
});

// Rooms/areas in the home
export const rooms = pgTable("rooms", {
  id: uuid("id").primaryKey().defaultRandom(),
  project_id: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  floor_number: integer("floor_number"),
  description: text("description"),
  dimensions: text("dimensions"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull()
});

// Images table for storing image metadata
export const images = pgTable("images", {
  id: uuid("id").primaryKey().defaultRandom(),
  item_id: uuid("item_id")
    .notNull()
    .references(() => items.id, { onDelete: "cascade" }),
  storage_path: text("storage_path").notNull(),
  filename: text("filename").notNull(),
  size: integer("size").notNull(),
  mime_type: text("mime_type").notNull(),
  width: integer("width"),
  height: integer("height"),
  description: text("description"),
  created_at: timestamp("created_at").defaultNow().notNull()
});

// Items table (updated with image relations)
export const items = pgTable("items", {
  id: uuid("id").primaryKey().defaultRandom(),
  room_id: uuid("room_id")
    .notNull()
    .references(() => rooms.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  brand: text("brand"),
  supplier: text("supplier"),
  specifications: text("specifications"),
  cost: numeric("cost"),
  warranty_info: text("warranty_info"),
  installation_date: date("installation_date"),
  maintenance_notes: text("maintenance_notes"),
  category: text("category").notNull(),
  status: text("status"),
  document_urls: text("document_urls").array(),
  link: text("link"),
  notes: text("notes"),
  version: integer("version").notNull().default(1),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull()
});

// Item history table
export const itemHistory = pgTable("item_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  item_id: uuid("item_id").notNull().references(() => items.id),
  room_id: uuid("room_id").notNull(),
  name: text("name").notNull(),
  brand: text("brand"),
  supplier: text("supplier"),
  specifications: text("specifications"),
  cost: numeric("cost"),
  warranty_info: text("warranty_info"),
  installation_date: date("installation_date"),
  maintenance_notes: text("maintenance_notes"),
  category: text("category").notNull(),
  status: text("status"),
  image_url: text("image_url"),
  document_urls: text("document_urls").array(),
  link: text("link"),
  notes: text("notes"),
  version: integer("version").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull()
});

// Chat related enums and tables
export const llmProviderEnum = pgEnum("llm_provider", ["openai", "anthropic", "gemini", "ollama"]);
export const messageRoleEnum = pgEnum("message_role", ["user", "assistant", "system"]);
export const contentTypeEnum = pgEnum("content_type", ["document", "image", "webpage", "note"]);

// Conversations table
export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  project_id: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  user_id: uuid("user_id").notNull(),
  title: text("title").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
  archived: boolean("archived").default(false).notNull()
});

// Messages table
export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversation_id: uuid("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  role: messageRoleEnum("role").notNull(),
  content: text("content").notNull(),
  metadata: json("metadata"),
  token_count: integer("token_count"),
  created_at: timestamp("created_at").defaultNow().notNull()
});

// Chat settings table
export const chatSettings = pgTable("chat_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  project_id: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  user_id: uuid("user_id").notNull(),
  provider: llmProviderEnum("provider").default("openai").notNull(),
  model: text("model").default("gpt-4o-mini").notNull(),
  temperature: decimal("temperature", { precision: 3, scale: 2 }).default("0.7").notNull(),
  max_tokens: integer("max_tokens").default(1000).notNull(),
  system_prompt: text("system_prompt"),
  restrict_to_project_data: boolean("restrict_to_project_data").default(true).notNull(),
  enable_web_search: boolean("enable_web_search").default(false).notNull(),
  max_conversation_length: integer("max_conversation_length").default(50).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull()
});

// Knowledge base table for vector search
export const knowledgeBase = pgTable("knowledge_base", {
  id: uuid("id").primaryKey().defaultRandom(),
  project_id: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  content_type: contentTypeEnum("content_type").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  metadata: json("metadata"),
  embedding: text("embedding"), // Will store vector as text until drizzle supports vector type
  indexed_at: timestamp("indexed_at"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull()
});

// Finishes and materials
export const finishes = pgTable("finishes", {
  id: uuid("id").primaryKey().defaultRandom(),
  room_id: uuid("room_id").references(() => rooms.id), 
  project_id: uuid("project_id").notNull().references(() => projects.id),
  name: text("name").notNull(),
  category: text("category").notNull(), 
  manufacturer: text("manufacturer"),
  supplier: text("supplier"),
  color: text("color"),
  material: text("material"),
  dimensions: text("dimensions"),
  model_number: text("model_number"),
  specifications: text("specifications"),
  warranty_info: text("warranty_info"),
  maintenance_instructions: text("maintenance_instructions"),
  installation_date: date("installation_date"),
  cost: numeric("cost", { precision: 10, scale: 2 }),
  image_url: text("image_url"),
  document_urls: text("document_urls").array(),
  version: integer("version").notNull().default(1),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull()
});

// Track history of finish changes
export const finishHistory = pgTable("finish_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  finish_id: uuid("finish_id").notNull().references(() => finishes.id),
  version: integer("version").notNull(),
  change_type: text("change_type").notNull(), 
  previous_data: text("previous_data").notNull(), 
  changed_by: uuid("changed_by").notNull(), 
  changed_at: timestamp("changed_at").defaultNow().notNull(),
  created_at: timestamp("created_at").defaultNow().notNull()
});

// Zod schemas for input validation
export const insertProjectSchema = createInsertSchema(projects).omit({ 
  id: true,
  created_at: true 
});

export const insertRoomSchema = createInsertSchema(rooms).omit({ 
  id: true,
  created_at: true,
  updated_at: true
});

export const insertItemSchema = createInsertSchema(items).omit({
  id: true,
  version: true,
  created_at: true,
  updated_at: true
});

export const insertItemHistorySchema = createInsertSchema(itemHistory).omit({
  id: true,
  created_at: true
});

export const insertImageSchema = createInsertSchema(images).omit({
  id: true,
  created_at: true
});

export const insertFinishSchema = createInsertSchema(finishes).omit({ 
  id: true,
  version: true,
  created_at: true,
  updated_at: true
});

export const insertFinishHistorySchema = createInsertSchema(finishHistory).omit({
  id: true,
  created_at: true
});

// Chat-related Zod schemas
export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  created_at: true,
  updated_at: true
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  created_at: true
});

export const insertChatSettingsSchema = createInsertSchema(chatSettings).omit({
  id: true,
  created_at: true,
  updated_at: true
});

export const insertKnowledgeBaseSchema = createInsertSchema(knowledgeBase).omit({
  id: true,
  created_at: true,
  updated_at: true
});

// TypeScript types
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;

export type Room = typeof rooms.$inferSelect & {
  projects?: {
    name: string;
  };
};
export type InsertRoom = z.infer<typeof insertRoomSchema>;

export type Item = typeof items.$inferSelect;
export type InsertItem = z.infer<typeof insertItemSchema>;

export type ItemHistory = typeof itemHistory.$inferSelect;
export type InsertItemHistory = z.infer<typeof insertItemHistorySchema>;

export type Image = typeof images.$inferSelect;
export type InsertImage = z.infer<typeof insertImageSchema>;

export type Finish = typeof finishes.$inferSelect;
export type InsertFinish = z.infer<typeof insertFinishSchema>;
export type FinishHistory = typeof finishHistory.$inferSelect;
export type InsertFinishHistory = z.infer<typeof insertFinishHistorySchema>;

// Chat-related TypeScript types
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type ChatSettings = typeof chatSettings.$inferSelect;
export type InsertChatSettings = z.infer<typeof insertChatSettingsSchema>;
export type KnowledgeBase = typeof knowledgeBase.$inferSelect;
export type InsertKnowledgeBase = z.infer<typeof insertKnowledgeBaseSchema>;