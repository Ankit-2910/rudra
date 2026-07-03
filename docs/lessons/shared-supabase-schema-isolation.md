# The production Supabase DB is shared — RUDRA tables live in a dedicated "rudra" schema

The DATABASE_URL configured on Render points at a Supabase database shared with
other Shivanchal apps: its public schema already holds unrelated `leads`,
`conversations`, and `kpi_snapshots` tables (different columns), plus OBSIDIAN
(`obs_*`) and platform tables. Running the original migration there failed on
the seed (`kpi_snapshots` has no `payload` column publicly) and, worse, the
backend would have written RUDRA leads into another app's `leads` table.

Fix: `001_init.sql` creates everything inside `create schema if not exists
rudra`, and `main.py` queries `rudra.leads` / `rudra.kpi_snapshots` with
schema-qualified names. This is portable (works identically on a dedicated
database) and needs no search_path juggling through the Supabase session
pooler.

Rule for Phase 2/3: every new RUDRA table goes in the `rudra` schema, and any
SQL in migrations or code must schema-qualify table names. Never assume the
public schema is empty on shared Shivanchal databases — list
`information_schema.tables` before creating anything.
