-- Execute no SQL Editor do Supabase (gratuito) para ativar os ajustes compartilhados.
create table if not exists ajustes (
  kind text not null,          -- 'cor' | 'nota' | 'oculto'
  key text not null,
  value jsonb not null,
  updated_at timestamptz default now(),
  primary key (kind, key)
);
alter table ajustes enable row level security;
create policy "ler"    on ajustes for select using (true);
create policy "gravar" on ajustes for insert with check (true);
create policy "mudar"  on ajustes for update using (true);
create policy "apagar" on ajustes for delete using (true);
