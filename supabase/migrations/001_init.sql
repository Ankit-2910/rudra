-- RUDRA initial schema

create table if not exists leads (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    company text not null,
    purpose text not null,
    source text not null default 'reception',
    created_at timestamptz not null default now()
);

create table if not exists conversations (
    id uuid primary key default gen_random_uuid(),
    employee_role text not null,
    visitor_name text,
    message text not null,
    reply text not null,
    created_at timestamptz not null default now()
);

create table if not exists kpi_snapshots (
    id uuid primary key default gen_random_uuid(),
    payload jsonb not null,
    captured_at timestamptz not null default now()
);

-- Seed once; safe to re-run the migration.
insert into kpi_snapshots (payload)
select '{
        "revenue_trend": {
            "labels": ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
            "values": [420000, 465000, 510000, 545000, 605000, 680000]
        },
        "active_projects": 14,
        "client_health": 92
    }'::jsonb
where not exists (select 1 from kpi_snapshots);
