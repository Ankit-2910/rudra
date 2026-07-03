-- RUDRA initial schema.
-- Everything lives in a dedicated "rudra" Postgres schema so this migration is
-- safe to run on a Supabase database shared with other Shivanchal apps
-- (the public schema already has unrelated leads/kpi_snapshots tables).

create schema if not exists rudra;

create table if not exists rudra.leads (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    company text not null,
    purpose text not null,
    source text not null default 'reception',
    created_at timestamptz not null default now()
);

create table if not exists rudra.conversations (
    id uuid primary key default gen_random_uuid(),
    employee_role text not null,
    visitor_name text,
    message text not null,
    reply text not null,
    created_at timestamptz not null default now()
);

create table if not exists rudra.kpi_snapshots (
    id uuid primary key default gen_random_uuid(),
    payload jsonb not null,
    captured_at timestamptz not null default now()
);

-- Seed once; safe to re-run the migration.
insert into rudra.kpi_snapshots (payload)
select '{
        "revenue_trend": {
            "labels": ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
            "values": [420000, 465000, 510000, 545000, 605000, 680000]
        },
        "active_projects": 14,
        "client_health": 92
    }'::jsonb
where not exists (select 1 from rudra.kpi_snapshots);
