-- ChatBot System Database Migration
-- Run this in your Supabase SQL editor

-- Enable the vector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Create enums
CREATE TYPE llm_provider AS ENUM ('openai', 'anthropic', 'gemini', 'ollama');
CREATE TYPE message_role AS ENUM ('user', 'assistant', 'system');
CREATE TYPE content_type AS ENUM ('document', 'image', 'webpage', 'note');

-- Create conversations table
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- Assuming you have user auth
    title TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    archived BOOLEAN DEFAULT FALSE
);

-- Create messages table
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role message_role NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB,
    token_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create chat_settings table
CREATE TABLE chat_settings (
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
CREATE TABLE knowledge_base (
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

-- Create indexes for performance
CREATE INDEX idx_conversations_project_id ON conversations(project_id);
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_created_at ON conversations(created_at DESC);

CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);

CREATE INDEX idx_chat_settings_project_user ON chat_settings(project_id, user_id);

CREATE INDEX idx_knowledge_base_project_id ON knowledge_base(project_id);
CREATE INDEX idx_knowledge_base_content_type ON knowledge_base(content_type);

-- Create vector similarity search index
CREATE INDEX idx_knowledge_base_embedding ON knowledge_base 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_conversations_updated_at 
    BEFORE UPDATE ON conversations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_settings_updated_at 
    BEFORE UPDATE ON chat_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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

-- Create RLS policies (adjust based on your auth setup)
-- Users can only access their own conversations
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

-- Users can access knowledge base for their projects
CREATE POLICY "Users can access project knowledge base" ON knowledge_base
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = knowledge_base.project_id
            -- Add your project access logic here
            -- This depends on how you handle project permissions
        )
    );

-- Insert default chat settings for existing projects (optional)
-- Uncomment and modify if you want to create default settings
/*
INSERT INTO chat_settings (project_id, user_id, provider, model)
SELECT 
    p.id as project_id,
    auth.uid() as user_id, -- Replace with actual user logic
    'openai' as provider,
    'gpt-4o-mini' as model
FROM projects p;
*/

COMMENT ON TABLE conversations IS 'Stores chat conversations for each project';
COMMENT ON TABLE messages IS 'Stores individual messages within conversations';
COMMENT ON TABLE chat_settings IS 'Stores LLM configuration and restrictions per user per project';
COMMENT ON TABLE knowledge_base IS 'Stores project content for vector search and context';
COMMENT ON FUNCTION search_knowledge_base IS 'Performs vector similarity search on knowledge base content';
