-- Add updated_at column to rooms table
ALTER TABLE public.rooms 
ADD COLUMN updated_at timestamp with time zone NOT NULL DEFAULT now();

-- Update the existing rows to set updated_at = created_at
UPDATE public.rooms 
SET updated_at = created_at;

COMMENT ON COLUMN public.rooms.updated_at IS 'Timestamp when the room was last updated';
