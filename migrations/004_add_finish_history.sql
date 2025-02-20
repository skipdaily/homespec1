-- Add version column to finishes table
ALTER TABLE finishes ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

-- Create finish_history table
CREATE TABLE finish_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    finish_id UUID NOT NULL REFERENCES finishes(id),
    version INTEGER NOT NULL,
    change_type TEXT NOT NULL,
    previous_data TEXT NOT NULL,
    changed_by UUID NOT NULL REFERENCES users(id),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Add index for faster lookups
CREATE INDEX idx_finish_history_finish_id ON finish_history(finish_id);

-- Add trigger to handle finish deletions
CREATE OR REPLACE FUNCTION handle_deleted_storage_objects()
RETURNS trigger AS $$
begin
  -- Store the deleted finish in history
  INSERT INTO finish_history (
    finish_id,
    version,
    change_type,
    previous_data,
    changed_by
  ) VALUES (
    OLD.id,
    OLD.version,
    'delete',
    row_to_json(OLD)::text,
    current_user_id()
  );

  -- Delete associated storage objects
  IF OLD.image_url IS NOT NULL THEN
    DELETE FROM storage.objects WHERE name = OLD.image_url;
  END IF;
  IF OLD.document_urls IS NOT NULL THEN
    DELETE FROM storage.objects WHERE name = any(OLD.document_urls);
  END IF;
  RETURN OLD;
end;
$$ language plpgsql;

-- Create trigger for finish deletions
CREATE TRIGGER before_delete_finishes
  BEFORE DELETE ON finishes
  FOR EACH ROW
  EXECUTE FUNCTION handle_deleted_storage_objects();