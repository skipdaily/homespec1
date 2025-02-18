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

-- Projects table (represents individual homes)
create table public.projects (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users not null,
  name text not null,
  address text not null,
  builder_name text not null,
  completion_date date, -- Making this nullable
  access_code text not null unique,
  created_at timestamp with time zone default now() not null
);

-- Secure projects table
alter table public.projects enable row level security;
create policy "Users can CRUD their own projects"
  on public.projects for all
  using (auth.uid() = user_id);
create policy "Anyone can view projects with access code"
  on public.projects for select
  using (true);

-- Rooms table
create table public.rooms (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references public.projects not null,
  name text not null,
  floor_number integer,
  description text,
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
create policy "Anyone can view rooms with project access"
  on public.rooms for select
  using (true);

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
  category text,
  maintenance_notes text,
  installation_date date,
  status text not null default 'pending',
  image_url text,
  document_urls text[],
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

-- Secure items table
alter table public.items enable row level security;
create policy "Users can CRUD items in their projects"
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
create policy "Anyone can view items with project access"
  on public.items for select
  using (true);

-- Create storage buckets for attachments
insert into storage.buckets (id, name, public)
values ('item-attachments', 'item-attachments', false);

-- Secure storage buckets
create policy "Users can upload item attachments"
  on storage.objects for insert
  with check (
    bucket_id = 'item-attachments' 
    and auth.role() = 'authenticated'
  );

create policy "Users can view their item attachments"
  on storage.objects for select
  using (
    bucket_id = 'item-attachments'
    and (
      auth.role() = 'authenticated'
      or exists(
        select 1
        from public.items i
        join public.rooms r on i.room_id = r.id
        join public.projects p on r.project_id = p.id
        where i.image_url = storage.foldername(name)
        or i.document_urls @> array[storage.foldername(name)]
      )
    )
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
