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
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
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

-- Finishes table (represents materials and finishes in rooms)
create table public.finishes (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid references public.rooms,
  project_id uuid references public.projects not null,
  name text not null,
  category text not null,
  manufacturer text,
  supplier text,
  color text,
  material text,
  dimensions text,
  model_number text,
  specifications text,
  warranty_info text,
  maintenance_instructions text,
  installation_date date,
  cost numeric(10,2),
  image_url text,
  document_urls text[],
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

-- Secure finishes table
alter table public.finishes enable row level security;
create policy "Users can CRUD finishes in their projects"
  on public.finishes for all
  using (
    exists(
      select 1
      from public.projects
      where projects.id = finishes.project_id
      and projects.user_id = auth.uid()
    )
  );
create policy "Anyone can view finishes with project access"
  on public.finishes for select
  using (true);

-- Create storage buckets for attachments
insert into storage.buckets (id, name, public)
values ('finish-attachments', 'finish-attachments', false);

-- Secure storage buckets
create policy "Users can upload finish attachments"
  on storage.objects for insert
  with check (
    bucket_id = 'finish-attachments' 
    and auth.role() = 'authenticated'
  );

create policy "Users can view their finish attachments"
  on storage.objects for select
  using (
    bucket_id = 'finish-attachments'
    and (
      auth.role() = 'authenticated'
      or exists(
        select 1
        from public.finishes f
        join public.projects p on f.project_id = p.id
        where f.image_url = storage.foldername(name)
        or f.document_urls @> array[storage.foldername(name)]
      )
    )
  );

-- Triggers to update timestamps
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger update_rooms_updated_at
    before update on public.rooms
    for each row
    execute function update_updated_at_column();

create trigger update_finishes_updated_at
    before update on public.finishes
    for each row
    execute function update_updated_at_column();

-- Function to handle finish deletions
create or replace function handle_deleted_storage_objects()
returns trigger as $$
begin
  -- Delete associated storage objects when a finish is deleted
  if old.image_url is not null then
    delete from storage.objects where name = old.image_url;
  end if;
  if old.document_urls is not null then
    delete from storage.objects where name = any(old.document_urls);
  end if;
  return old;
end;
$$ language plpgsql;

create trigger before_delete_finishes
  before delete on public.finishes
  for each row
  execute function handle_deleted_storage_objects();