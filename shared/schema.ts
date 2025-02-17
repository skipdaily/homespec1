import { pgTable, text, serial, integer, timestamp, numeric, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull().unique(),
  created_at: timestamp("created_at").defaultNow()
});

export const rooms = pgTable("rooms", {
  id: serial("id").primaryKey(),
  user_id: uuid("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  created_at: timestamp("created_at").defaultNow()
});

export const items = pgTable("items", {
  id: serial("id").primaryKey(),
  room_id: integer("room_id").notNull().references(() => rooms.id),
  name: text("name").notNull(),
  brand: text("brand"),
  supplier: text("supplier"),
  specifications: text("specifications"),
  cost: numeric("cost"),
  warranty_info: text("warranty_info"),
  image_url: text("image_url"),
  category: text("category"),
  created_at: timestamp("created_at").defaultNow()
});

export const insertRoomSchema = createInsertSchema(rooms).omit({ 
  id: true,
  created_at: true 
});

export const insertItemSchema = createInsertSchema(items).omit({ 
  id: true,
  created_at: true 
});

export type Room = typeof rooms.$inferSelect;
export type InsertRoom = z.infer<typeof insertRoomSchema>;
export type Item = typeof items.$inferSelect;
export type InsertItem = z.infer<typeof insertItemSchema>;
