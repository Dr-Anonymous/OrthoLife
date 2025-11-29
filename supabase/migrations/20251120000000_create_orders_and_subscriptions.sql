-- Create orders table
create table if not exists public.orders (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) not null,
    items jsonb not null,
    total_amount numeric not null,
    status text default 'pending',
    shipping_address text,
    order_type text default 'pharmacy',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create subscriptions table
create table if not exists public.subscriptions (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) not null,
    items jsonb not null,
    frequency_months integer not null,
    next_run_date date not null,
    last_run_date date,
    status text default 'active',
    shipping_address text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.orders enable row level security;
alter table public.subscriptions enable row level security;

-- Policies for orders
create policy "Users can view their own orders"
    on public.orders for select
    using (auth.uid() = user_id);

create policy "Users can insert their own orders"
    on public.orders for insert
    with check (auth.uid() = user_id);

-- Policies for subscriptions
create policy "Users can view their own subscriptions"
    on public.subscriptions for select
    using (auth.uid() = user_id);

create policy "Users can insert their own subscriptions"
    on public.subscriptions for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own subscriptions"
    on public.subscriptions for update
    using (auth.uid() = user_id);

-- Create cron job for processing subscriptions
-- We schedule it to run every day at 9 AM.
select
  cron.schedule(
    'process-subscriptions-job',
    '0 9 * * *',
    $$
    select
      net.http_post(
          url:='https://vqskeanwpnvuyxorymib.supabase.co/functions/v1/process-subscriptions',
          headers:=jsonb_build_object(
              'Content-Type', 'application/json',
              'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'supabase_service_role')
          )
      ) as request_id;
    $$
  );
