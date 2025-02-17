-- Create tables for Supabase

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users table (managed by Supabase Auth)
create table public.users (
  id uuid references auth.users not null primary key,
  email text not null unique,
  created_at timestamp with time zone default now() not null
);

-- Secure users table
alter table public.users enable row level security;
create policy "Users can only access their own data"
  on public.users for all
  using (auth.uid() = id);

-- Projects table
create table public.projects (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users not null,
  name text not null,
  description text,
  status text default 'active',
  created_at timestamp with time zone default now() not null
);

-- Secure projects table
alter table public.projects enable row level security;
create policy "Users can CRUD their own projects"
  on public.projects for all
  using (auth.uid() = user_id);

-- Rooms table (now linked to projects)
create table public.rooms (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references public.projects not null,
  name text not null,
  description text,
  floor_number integer,
  room_type text,
  dimensions text,
  created_at timestamp with time zone default now() not null
);

-- Secure rooms table
alter table public.rooms enable row level security;
create policy "Users can CRUD rooms in their projects"
  on public.rooms for all
  using (
    exists(
      select 1
      from public.projects
      where projects.id = rooms.project_id
      and projects.user_id = auth.uid()
    )
  );

-- Items table
create table public.items (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid references public.rooms not null,
  name text not null,
  brand text,
  supplier text,
  specifications text,
  cost numeric(10,2),
  warranty_info text,
  installation_date date,
  maintenance_notes text,
  category text,
  status text default 'pending',
  image_url text,
  document_urls text[],
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

-- Secure items table
alter table public.items enable row level security;
create policy "Users can CRUD items in their rooms"
  on public.items for all
  using (
    exists(
      select 1
      from public.rooms
      join public.projects on rooms.project_id = projects.id
      where rooms.id = items.room_id
      and projects.user_id = auth.uid()
    )
  );

-- Create storage buckets for attachments
insert into storage.buckets (id, name, public)
values ('project-attachments', 'project-attachments', false);

-- Secure storage buckets
create policy "Users can upload project attachments"
  on storage.objects for insert
  with check (
    bucket_id = 'project-attachments' 
    and auth.role() = 'authenticated'
  );

create policy "Users can view their project attachments"
  on storage.objects for select
  using (
    bucket_id = 'project-attachments'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Trigger to update timestamps
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger update_items_updated_at
    before update on public.items
    for each row
    execute function update_updated_at_column();

-- Function to handle item deletions
create or replace function handle_deleted_storage_objects()
returns trigger as $$
begin
  -- Delete associated storage objects when an item is deleted
  if old.image_url is not null then
    delete from storage.objects where name = old.image_url;
  end if;
  if old.document_urls is not null then
    delete from storage.objects where name = any(old.document_urls);
  end if;
  return old;
end;
$$ language plpgsql;

create trigger before_delete_items
  before delete on public.items
  for each row
  execute function handle_deleted_storage_objects();