-- ============================================================
-- Arché v14 — Anexos em atividades. Aditivo e idempotente.
-- Reusa o bucket 'case-documents'. Rode depois do v12/v13.
-- ============================================================

create table if not exists public.atividade_anexos (
  id uuid primary key default gen_random_uuid(),
  atividade_id uuid not null references public.atividades(id) on delete cascade,
  nome text not null,
  storage_path text not null,
  tipo_mime text,
  tamanho_bytes bigint,
  visibilidade text not null default 'interno' check (visibilidade in ('cliente','interno')),
  uploader_tipo text not null default 'admin' check (uploader_tipo in ('admin','parceiro')),
  uploader_id uuid,            -- admin: auth.users.id; parceiro: parceiros_codigos.id
  uploader_nome text,          -- rótulo amigável (nome do colaborador / "Equipe Arché")
  case_document_id uuid references public.case_documents(id) on delete set null, -- espelho na aba Documentos
  arquivado boolean not null default false,
  arquivado_em timestamptz,
  created_at timestamptz not null default now()
);

alter table public.atividade_anexos enable row level security;
create index if not exists idx_atividade_anexos_ativ on public.atividade_anexos (atividade_id, arquivado, created_at desc);

-- vínculo opcional do documento do caso de volta à atividade de origem (para rastreio)
alter table public.case_documents add column if not exists atividade_id uuid references public.atividades(id) on delete set null;

select 'anexos v14 ok' as status;
