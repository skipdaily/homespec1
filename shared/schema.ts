import { pgTable, text, uuid, timestamp, integer, numeric, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Projects table (represents individual homes)
export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").notNull(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  builder_name: text("builder_name").notNull(),
  completion_date: date("completion_date"), // Nullable
  access_code: text("access_code").notNull().unique(),
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

// Items in rooms
export const items = pgTable("items", {
  id: uuid("id").primaryKey().defaultRandom(),
  room_id: uuid("room_id").notNull().references(() => rooms.id),
  name: text("name").notNull(),
  brand: text("brand"),
  supplier: text("supplier"),
  specifications: text("specifications"),
  cost: numeric("cost", { precision: 10, scale: 2 }),
  warranty_info: text("warranty_info"),
  category: text("category"),
  maintenance_notes: text("maintenance_notes"),
  installation_date: date("installation_date"),
  status: text("status").notNull().default("pending"),
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

export const insertItemSchema = createInsertSchema(items).omit({ 
  id: true,
  created_at: true,
  updated_at: true
});

// TypeScript types
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Room = typeof rooms.$inferSelect;
export type InsertRoom = z.infer<typeof insertRoomSchema>;
export type Item = typeof items.$inferSelect;
export type InsertItem = z.infer<typeof insertItemSchema>;