-- ============================================================
-- Arché v21 — Atomicidade financeira transacional.
-- Insere o lançamento E recalcula os indicadores (caso + cliente)
-- numa ÚNICA transação (corpo de função plpgsql = atômico).
-- Se qualquer passo falhar, nada é persistido (rollback automático).
-- Aditivo. SECURITY DEFINER com search_path fixo e grant restrito.
-- ============================================================

create or replace function public.financeiro_lancar(
  p_case_id uuid,
  p_tipo text,
  p_estagio_alvo text,
  p_valor numeric,
  p_data_referencia date,
  p_descricao text,
  p_justificativa text,
  p_autor uuid,
  p_autor_nome text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client uuid;
  v_titulo text;
  v_rec numeric := 0;
  v_pot numeric := 0;
  v_total numeric := 0;
begin
  -- trava a linha do caso para evitar corrida no recálculo
  select client_id, titulo into v_client, v_titulo
  from public.client_cases where id = p_case_id for update;
  if not found then
    raise exception 'caso_nao_encontrado';
  end if;

  insert into public.case_financeiro
    (case_id, client_id, case_titulo, tipo, estagio_alvo, valor, data_referencia, descricao, justificativa, autor, autor_nome)
  values
    (p_case_id, v_client, v_titulo, p_tipo, p_estagio_alvo, p_valor, p_data_referencia, p_descricao, p_justificativa, p_autor, p_autor_nome);

  -- recomputa do ZERO (idempotente): ajustes entram no estágio alvo
  select
    coalesce(sum(case when tipo='recuperado' then valor
                      when tipo='ajuste' and estagio_alvo='recuperado' then valor else 0 end), 0),
    coalesce(sum(case when tipo='potencial' then valor
                      when tipo='ajuste' and estagio_alvo='potencial' then valor else 0 end), 0)
  into v_rec, v_pot
  from public.case_financeiro where case_id = p_case_id;

  update public.client_cases
     set valor_recuperado = v_rec, potencial_estimado = nullif(v_pot, 0)
   where id = p_case_id;

  if v_client is not null then
    select coalesce(sum(valor_recuperado), 0) into v_total
    from public.client_cases where client_id = v_client;
    update public.client_profiles set caixa_recuperado_total = v_total where user_id = v_client;
  end if;

  return jsonb_build_object('recuperado', v_rec, 'potencial', v_pot, 'totalCliente', coalesce(v_total, 0));
end;
$$;

-- privilégio restrito: só o service-role (backend) executa
revoke all on function public.financeiro_lancar(uuid,text,text,numeric,date,text,text,uuid,text) from public;
revoke all on function public.financeiro_lancar(uuid,text,text,numeric,date,text,text,uuid,text) from anon;
revoke all on function public.financeiro_lancar(uuid,text,text,numeric,date,text,text,uuid,text) from authenticated;
grant execute on function public.financeiro_lancar(uuid,text,text,numeric,date,text,text,uuid,text) to service_role;

select 'financeiro v21 ok' as status;
