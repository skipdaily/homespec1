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

-- Rooms table
create table public.rooms (
  id serial primary key,
  user_id uuid references public.users not null,
  name text not null,
  description text,
  created_at timestamp with time zone default now() not null
);

-- Secure rooms table
alter table public.rooms enable row level security;
create policy "Users can CRUD their own rooms"
  on public.rooms for all
  using (auth.uid() = user_id);

-- Items table
create table public.items (
  id serial primary key,
  room_id integer references public.rooms not null,
  name text not null,
  brand text,
  supplier text,
  specifications text,
  cost numeric,
  warranty_info text,
  image_url text,
  category text,
  created_at timestamp with time zone default now() not null
);

-- Secure items table
alter table public.items enable row level security;
create policy "Users can CRUD items in their rooms"
  on public.items for all
  using (
    exists(
      select 1
      from public.rooms
      where rooms.id = items.room_id
      and rooms.user_id = auth.uid()
    )
  );

-- Create storage bucket for item attachments
insert into storage.buckets (id, name)
values ('item-attachments', 'item-attachments');

-- Secure storage bucket
create policy "Users can upload attachments"
  on storage.objects for insert
  with check (bucket_id = 'item-attachments' and auth.role() = 'authenticated');

create policy "Users can view attachments" 
  on storage.objects for select
  using (bucket_id = 'item-attachments' and auth.role() = 'authenticated');
