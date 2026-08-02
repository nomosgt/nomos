-- ============================================================
-- PORTAL DE PARCEIROS — perfis de colaboradores
-- Cole este arquivo inteiro no SQL Editor do Supabase e Run.
-- ============================================================

create table if not exists public.parceiros_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  email text not null,
  telefone text,
  percentual_padrao numeric(5,2) not null default 10.00,
  observacoes text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

alter table public.parceiros_profiles enable row level security;

-- Parceiro le apenas o proprio perfil
drop policy if exists "parceiro le proprio perfil" on public.parceiros_profiles;
create policy "parceiro le proprio perfil"
  on public.parceiros_profiles for select
  to authenticated
  using (auth.uid() = user_id);

-- Admins leem/gerenciam todos (via admin_profiles)
drop policy if exists "admin gerencia parceiros" on public.parceiros_profiles;
create policy "admin gerencia parceiros"
  on public.parceiros_profiles for all
  to authenticated
  using (exists (select 1 from public.admin_profiles ap where ap.user_id = auth.uid()))
  with check (exists (select 1 from public.admin_profiles ap where ap.user_id = auth.uid()));
