-- Add access_code column to projects table
alter table public.projects 
add column if not exists access_code text not null unique;

-- Update RLS policy to include access_code
drop policy if exists "Anyone can view projects with access code" on public.projects;
create policy "Anyone can view projects with access code"
  on public.projects for select
  using (true);
