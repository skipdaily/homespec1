-- Add PIN-based editing control to projects
ALTER TABLE public.projects 
ADD COLUMN require_pin boolean DEFAULT false NOT NULL,
ADD COLUMN edit_pin text;

-- Update policies to allow public access for viewing
CREATE POLICY "Anyone can view projects"
  ON public.projects FOR SELECT
  USING (true);

-- Update policy for editing to check PIN when required
CREATE POLICY "Users can edit projects with correct PIN"
  ON public.projects FOR UPDATE
  USING (
    (auth.uid() = user_id) OR 
    (require_pin = false) OR 
    (require_pin = true AND EXISTS (
      SELECT 1 
      WHERE edit_pin = current_setting('app.edit_pin', true)
    ))
  );
