-- Add address column to projects table
alter table public.projects 
add column if not exists address text not null;

-- If you have existing rows, you'll need to provide a default value
-- Uncomment and modify this if you have existing data:
-- update public.projects set address = 'TBD' where address is null;
