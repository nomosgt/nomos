"use client";

/**
 * Minha conta — dados do usuário + troca de senha REAL (supabase.auth.updateUser
 * na própria sessão). Usada pela Sala e pelo Admin.
 */

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Cd, BtnP } from "@/components/shell/proto-ui";

const inputCls = "w-full rounded-[9px] border border-[#dedbd3] bg-white px-3.5 py-2.5 text-[13.5px] text-[#14173d] outline-none focus:border-[#0f1240]";

export function ContaCard({ nome, email, sub }: { nome: string; email: string; sub?: string }) {
  const [s1, setS1] = useState("");
  const [s2, setS2] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function trocar() {
    setMsg(null);
    if (s1.length < 8) { setMsg({ ok: false, texto: "A senha precisa de pelo menos 8 caracteres." }); return; }
    if (s1 !== s2) { setMsg({ ok: false, texto: "As senhas não conferem." }); return; }
    setSalvando(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: s1 });
      if (error) { setMsg({ ok: false, texto: "Não foi possível alterar: " + error.message }); return; }
      setS1(""); setS2("");
      setMsg({ ok: true, texto: "Senha alterada com sucesso." });
    } catch {
      setMsg({ ok: false, texto: "Erro de conexão." });
    } finally { setSalvando(false); }
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <Cd title="Dados pessoais">
        <div className="space-y-3 text-[13.5px]">
          <div>
            <div className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-[#7a7c95]">Nome</div>
            <div className="mt-0.5 text-[#14173d]">{nome}</div>
          </div>
          <div>
            <div className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-[#7a7c95]">Email de acesso</div>
            <div className="mt-0.5 text-[#14173d]">{email}</div>
          </div>
          {sub && (
            <div>
              <div className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-[#7a7c95]">Perfil</div>
              <div className="mt-0.5 text-[#14173d]">{sub}</div>
            </div>
          )}
          <p className="pt-1 text-[12px] leading-relaxed text-[#8a8ca3]">
            Para corrigir nome ou email, fale com a equipe Arché — alterações cadastrais passam por validação.
          </p>
        </div>
      </Cd>

      <Cd title="Alterar senha">
        <div className="space-y-3">
          <input className={inputCls} type="password" placeholder="Nova senha (mín. 8 caracteres)" autoComplete="new-password" value={s1} onChange={(e) => setS1(e.target.value)} />
          <input className={inputCls} type="password" placeholder="Repita a nova senha" autoComplete="new-password" value={s2} onChange={(e) => setS2(e.target.value)} />
          {msg && <p className={`text-[13px] ${msg.ok ? "text-emerald-700" : "text-rose-700"}`}>{msg.texto}</p>}
          <div className="flex justify-end">
            <BtnP disabled={salvando || !s1 || !s2} onClick={() => void trocar()}>Salvar nova senha</BtnP>
          </div>
        </div>
      </Cd>
    </div>
  );
}
