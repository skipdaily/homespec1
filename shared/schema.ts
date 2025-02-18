import { pgTable, text, uuid, timestamp, integer, numeric, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Projects table (represents individual homes)
export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").notNull(),
  address: text("address").notNull(),
  builder_name: text("builder_name").notNull(),
  completion_date: date("completion_date"),
  access_code: text("access_code").notNull(), // For generating unique access links
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
  created_at: timestamp("created_at").defaultNow().notNull()
});

// Finishes and materials
export const finishes = pgTable("finishes", {
  id: uuid("id").primaryKey().defaultRandom(),
  room_id: uuid("room_id").notNull().references(() => rooms.id),
  name: text("name").notNull(),
  category: text("category").notNull(), // e.g., "Paint", "Flooring", "Doors", "Hardware"
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
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull()
});

// Zod schemas for input validation
export const insertProjectSchema = createInsertSchema(projects).omit({ 
  id: true,
  created_at: true 
});

export const insertRoomSchema = createInsertSchema(rooms).omit({ 
  id: true,
  created_at: true 
});

export const insertFinishSchema = createInsertSchema(finishes).omit({ 
  id: true,
  created_at: true,
  updated_at: true
});

// TypeScript types
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Room = typeof rooms.$inferSelect;
export type InsertRoom = z.infer<typeof insertRoomSchema>;
export type Finish = typeof finishes.$inferSelect;
export type InsertFinish = z.infer<typeof insertFinishSchema>;