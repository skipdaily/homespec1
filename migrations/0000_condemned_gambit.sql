CREATE TYPE "public"."content_type" AS ENUM('document', 'image', 'webpage', 'note');--> statement-breakpoint
CREATE TYPE "public"."llm_provider" AS ENUM('openai', 'anthropic', 'gemini', 'ollama');--> statement-breakpoint
CREATE TYPE "public"."message_role" AS ENUM('user', 'assistant', 'system');--> statement-breakpoint
CREATE TABLE "chat_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" "llm_provider" DEFAULT 'openai' NOT NULL,
	"model" text DEFAULT 'gpt-4o-mini' NOT NULL,
	"temperature" numeric(3, 2) DEFAULT '0.7' NOT NULL,
	"max_tokens" integer DEFAULT 1000 NOT NULL,
	"system_prompt" text,
	"restrict_to_project_data" boolean DEFAULT true NOT NULL,
	"enable_web_search" boolean DEFAULT false NOT NULL,
	"max_conversation_length" integer DEFAULT 50 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"archived" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finish_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"finish_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"change_type" text NOT NULL,
	"previous_data" text NOT NULL,
	"changed_by" uuid NOT NULL,
	"changed_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finishes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"manufacturer" text,
	"supplier" text,
	"color" text,
	"material" text,
	"dimensions" text,
	"model_number" text,
	"specifications" text,
	"warranty_info" text,
	"maintenance_instructions" text,
	"installation_date" date,
	"cost" numeric(10, 2),
	"image_url" text,
	"document_urls" text[],
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"storage_path" text NOT NULL,
	"filename" text NOT NULL,
	"size" integer NOT NULL,
	"mime_type" text NOT NULL,
	"width" integer,
	"height" integer,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "item_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"room_id" uuid NOT NULL,
	"name" text NOT NULL,
	"brand" text,
	"supplier" text,
	"specifications" text,
	"cost" numeric,
	"warranty_info" text,
	"installation_date" date,
	"maintenance_notes" text,
	"category" text NOT NULL,
	"status" text,
	"image_url" text,
	"document_urls" text[],
	"link" text,
	"notes" text,
	"version" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"name" text NOT NULL,
	"brand" text,
	"supplier" text,
	"specifications" text,
	"cost" numeric,
	"warranty_info" text,
	"installation_date" date,
	"maintenance_notes" text,
	"category" text NOT NULL,
	"status" text,
	"document_urls" text[],
	"link" text,
	"notes" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_base" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"content_type" "content_type" NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"metadata" json,
	"embedding" text,
	"indexed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"role" "message_role" NOT NULL,
	"content" text NOT NULL,
	"metadata" json,
	"token_count" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"address" text NOT NULL,
	"builder_name" text NOT NULL,
	"access_code" text NOT NULL,
	"require_pin" boolean DEFAULT false NOT NULL,
	"edit_pin" text,
	"completion_date" date,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "projects_access_code_unique" UNIQUE("access_code")
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"floor_number" integer,
	"description" text,
	"dimensions" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chat_settings" ADD CONSTRAINT "chat_settings_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finish_history" ADD CONSTRAINT "finish_history_finish_id_finishes_id_fk" FOREIGN KEY ("finish_id") REFERENCES "public"."finishes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finishes" ADD CONSTRAINT "finishes_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finishes" ADD CONSTRAINT "finishes_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "images" ADD CONSTRAINT "images_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_history" ADD CONSTRAINT "item_history_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_base" ADD CONSTRAINT "knowledge_base_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;