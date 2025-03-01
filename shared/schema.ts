import { pgTable, text, uuid, timestamp, integer, numeric, date, boolean } from "drizzle-orm/pg-core";
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
  project_id: uuid("project_id").notNull().references(() => projects.id),
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
  item_id: uuid("item_id").notNull().references(() => items.id),
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
  room_id: uuid("room_id").notNull().references(() => rooms.id),
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
  version: integer("version").notNull(),
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

// TypeScript types

export type Finish = typeof finishes.$inferSelect;
export type InsertFinish = z.infer<typeof insertFinishSchema>;
export type FinishHistory = typeof finishHistory.$inferSelect;
export type InsertFinishHistory = z.infer<typeof insertFinishHistorySchema>;