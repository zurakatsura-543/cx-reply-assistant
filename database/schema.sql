create extension if not exists pgcrypto;

create type message_sender as enum ('customer', 'agent');
create type policy_type as enum ('Return policy', 'Refund policy', 'Shipping policy', 'Cancellation policy');
create type ai_confidence as enum ('High', 'Medium', 'Needs review');

create table brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tone text not null,
  created_at timestamptz not null default now()
);

create table brand_users (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brands(id) on delete cascade,
  user_id uuid not null,
  role text not null check (role in ('admin', 'agent', 'viewer')),
  created_at timestamptz not null default now(),
  unique (brand_id, user_id)
);

create table customers (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brands(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  created_at timestamptz not null default now()
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brands(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  external_order_id text not null,
  item_name text not null,
  status text not null,
  delivered_at date,
  order_value numeric(10, 2),
  created_at timestamptz not null default now(),
  unique (brand_id, external_order_id)
);

create table conversations (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brands(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  order_id uuid references orders(id) on delete set null,
  channel text not null default 'internal',
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brands(id) on delete cascade,
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender message_sender not null,
  body text not null,
  external_message_id text,
  created_at timestamptz not null default now(),
  unique (brand_id, external_message_id)
);

create table knowledge_base_entries (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brands(id) on delete cascade,
  type policy_type not null,
  title text not null,
  body text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table ai_response_logs (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brands(id) on delete cascade,
  conversation_id uuid not null references conversations(id) on delete cascade,
  customer_message_id uuid references messages(id) on delete set null,
  customer_message text not null,
  retrieved_context jsonb not null default '[]',
  ai_generated_response text not null,
  agent_edited_response text,
  final_response text,
  confidence ai_confidence not null,
  guardrail text not null,
  model_name text,
  prompt_tokens integer,
  completion_tokens integer,
  created_at timestamptz not null default now()
);

create index idx_brand_users_user on brand_users(user_id);
create index idx_conversations_brand on conversations(brand_id, updated_at desc);
create index idx_messages_conversation on messages(brand_id, conversation_id, created_at);
create index idx_kb_brand_type on knowledge_base_entries(brand_id, type);
create index idx_ai_logs_conversation on ai_response_logs(brand_id, conversation_id, created_at desc);

alter table brands enable row level security;
alter table brand_users enable row level security;
alter table customers enable row level security;
alter table orders enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table knowledge_base_entries enable row level security;
alter table ai_response_logs enable row level security;

-- Supabase RLS pattern. auth.uid() represents the logged-in agent.
create policy brand_member_can_read_brands
on brands for select
using (
  exists (
    select 1 from brand_users
    where brand_users.brand_id = brands.id
      and brand_users.user_id = auth.uid()
  )
);

create policy brand_member_can_read_kb
on knowledge_base_entries for select
using (
  exists (
    select 1 from brand_users
    where brand_users.brand_id = knowledge_base_entries.brand_id
      and brand_users.user_id = auth.uid()
  )
);

create policy brand_admin_can_write_kb
on knowledge_base_entries for all
using (
  exists (
    select 1 from brand_users
    where brand_users.brand_id = knowledge_base_entries.brand_id
      and brand_users.user_id = auth.uid()
      and brand_users.role in ('admin')
  )
)
with check (
  exists (
    select 1 from brand_users
    where brand_users.brand_id = knowledge_base_entries.brand_id
      and brand_users.user_id = auth.uid()
      and brand_users.role in ('admin')
  )
);

-- Equivalent brand_id-scoped RLS policies should be applied to customers,
-- orders, conversations, messages, and ai_response_logs.
