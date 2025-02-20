-- Create the items table
CREATE TABLE items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL,
    name TEXT NOT NULL,
    brand TEXT,
    supplier TEXT,
    specifications TEXT,
    cost NUMERIC,
    warranty_info TEXT,
    installation_date DATE,
    maintenance_notes TEXT,
    category TEXT NOT NULL,
    status TEXT,
    image_url TEXT,
    document_urls TEXT[],
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create the item history table
CREATE TABLE item_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES items(id),
    room_id UUID NOT NULL,
    name TEXT NOT NULL,
    brand TEXT,
    supplier TEXT,
    specifications TEXT,
    cost NUMERIC,
    warranty_info TEXT,
    installation_date DATE,
    maintenance_notes TEXT,
    category TEXT NOT NULL,
    status TEXT,
    image_url TEXT,
    document_urls TEXT[],
    version INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for faster lookups
CREATE INDEX idx_item_history_item_id ON item_history(item_id);

-- Add trigger to update version number
CREATE OR REPLACE FUNCTION update_item_version()
RETURNS TRIGGER AS $$
BEGIN
    NEW.version = OLD.version + 1;
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER before_update_items
    BEFORE UPDATE ON items
    FOR EACH ROW
    EXECUTE FUNCTION update_item_version();