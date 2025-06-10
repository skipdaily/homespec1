-- ChatBot System Database Migration
-- Run this in your Supabase SQL editor

-- Enable the vector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Create enums
DO $$ BEGIN
    CREATE TYPE llm_provider AS ENUM ('openai', 'anthropic', 'gemini', 'ollama');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE message_role AS ENUM ('user', 'assistant', 'system');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE content_type AS ENUM ('document', 'image', 'webpage', 'note');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- Assuming you have user auth
    title TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    archived BOOLEAN DEFAULT FALSE
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role message_role NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB,
    token_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create chat_settings table
CREATE TABLE IF NOT EXISTS chat_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- One setting per user per project
    provider llm_provider NOT NULL DEFAULT 'openai',
    model TEXT NOT NULL DEFAULT 'gpt-4o-mini',
    temperature DECIMAL(3,2) DEFAULT 0.7 CHECK (temperature >= 0 AND temperature <= 2),
    max_tokens INTEGER DEFAULT 1000 CHECK (max_tokens > 0),
    system_prompt TEXT,
    restrict_to_project_data BOOLEAN DEFAULT TRUE,
    enable_web_search BOOLEAN DEFAULT FALSE,
    max_conversation_length INTEGER DEFAULT 50 CHECK (max_conversation_length > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, user_id) -- One setting per user per project
);

-- Create knowledge_base table for vector search
CREATE TABLE IF NOT EXISTS knowledge_base (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    content_type content_type NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB,
    embedding vector(1536), -- OpenAI ada-002 embedding dimension
    indexed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance (only if they don't exist)
DO $$ BEGIN
    CREATE INDEX idx_conversations_project_id ON conversations(project_id);
EXCEPTION
    WHEN duplicate_table THEN null;
END $$;

DO $$ BEGIN
    CREATE INDEX idx_conversations_user_id ON conversations(user_id);
EXCEPTION
    WHEN duplicate_table THEN null;
END $$;

DO $$ BEGIN
    CREATE INDEX idx_conversations_created_at ON conversations(created_at DESC);
EXCEPTION
    WHEN duplicate_table THEN null;
END $$;

DO $$ BEGIN
    CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
EXCEPTION
    WHEN duplicate_table THEN null;
END $$;

DO $$ BEGIN
    CREATE INDEX idx_messages_created_at ON messages(created_at);
EXCEPTION
    WHEN duplicate_table THEN null;
END $$;

DO $$ BEGIN
    CREATE INDEX idx_chat_settings_project_user ON chat_settings(project_id, user_id);
EXCEPTION
    WHEN duplicate_table THEN null;
END $$;

DO $$ BEGIN
    CREATE INDEX idx_knowledge_base_project_id ON knowledge_base(project_id);
EXCEPTION
    WHEN duplicate_table THEN null;
END $$;

DO $$ BEGIN
    CREATE INDEX idx_knowledge_base_content_type ON knowledge_base(content_type);
EXCEPTION
    WHEN duplicate_table THEN null;
END $$;

-- Create vector similarity search index
DO $$ BEGIN
    CREATE INDEX idx_knowledge_base_embedding ON knowledge_base 
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);
EXCEPTION
    WHEN duplicate_table THEN null;
END $$;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers (drop first if they exist)
DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
CREATE TRIGGER update_conversations_updated_at 
    BEFORE UPDATE ON conversations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_chat_settings_updated_at ON chat_settings;
CREATE TRIGGER update_chat_settings_updated_at 
    BEFORE UPDATE ON chat_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_knowledge_base_updated_at ON knowledge_base;
CREATE TRIGGER update_knowledge_base_updated_at 
    BEFORE UPDATE ON knowledge_base 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create vector search function
CREATE OR REPLACE FUNCTION search_knowledge_base(
    query_embedding vector(1536),
    project_id uuid,
    match_threshold float DEFAULT 0.7,
    match_count int DEFAULT 10
)
RETURNS TABLE (
    id uuid,
    title text,
    content text,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        kb.id,
        kb.title,
        kb.content,
        (1 - (kb.embedding <=> query_embedding)) as similarity
    FROM knowledge_base kb
    WHERE kb.project_id = search_knowledge_base.project_id
        AND kb.embedding IS NOT NULL
        AND (1 - (kb.embedding <=> query_embedding)) > match_threshold
    ORDER BY kb.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Enable Row Level Security (RLS)
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can view messages from their conversations" ON messages;
DROP POLICY IF EXISTS "Users can manage their own chat settings" ON chat_settings;
DROP POLICY IF EXISTS "Users can access project knowledge base" ON knowledge_base;

-- Create RLS policies
CREATE POLICY "Users can view their own conversations" ON conversations
    FOR ALL USING (auth.uid() = user_id);

-- Users can access messages from their conversations
CREATE POLICY "Users can view messages from their conversations" ON messages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM conversations 
            WHERE conversations.id = messages.conversation_id 
            AND conversations.user_id = auth.uid()
        )
    );

-- Users can manage their own chat settings
CREATE POLICY "Users can manage their own chat settings" ON chat_settings
    FOR ALL USING (auth.uid() = user_id);

-- Users can access knowledge base for their projects (simplified for now)
CREATE POLICY "Users can access project knowledge base" ON knowledge_base
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = knowledge_base.project_id
            AND projects.user_id = auth.uid()
        )
    );

-- Create a helpful function to initialize default chat settings for a user/project
CREATE OR REPLACE FUNCTION initialize_default_chat_settings(
    p_project_id uuid,
    p_user_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
    setting_id uuid;
BEGIN
    INSERT INTO chat_settings (
        project_id, 
        user_id, 
        provider, 
        model,
        temperature,
        max_tokens,
        system_prompt,
        restrict_to_project_data,
        enable_web_search,
        max_conversation_length
    ) VALUES (
        p_project_id,
        p_user_id,
        'openai',
        'gpt-4o-mini',
        0.7,
        1000,
        'You are a helpful assistant for the HomeSpecTracker application. Help users manage their home project specifications, answer questions about items, and provide general assistance.',
        true,
        false,
        50
    )
    ON CONFLICT (project_id, user_id) DO NOTHING
    RETURNING id INTO setting_id;
    
    RETURN setting_id;
END;
$$;

-- Add comments for documentation
COMMENT ON TABLE conversations IS 'Stores chat conversations for each project';
COMMENT ON TABLE messages IS 'Stores individual messages within conversations';
COMMENT ON TABLE chat_settings IS 'Stores LLM configuration and restrictions per user per project';
COMMENT ON TABLE knowledge_base IS 'Stores project content for vector search and context';
COMMENT ON FUNCTION search_knowledge_base IS 'Performs vector similarity search on knowledge base content';
COMMENT ON FUNCTION initialize_default_chat_settings IS 'Creates default chat settings for a user/project combination';

-- Success message
SELECT 'ChatBot migration completed successfully! Tables: conversations, messages, chat_settings, knowledge_base created.' as result;
