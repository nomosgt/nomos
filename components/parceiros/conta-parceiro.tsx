"use client";

import { Cd } from "@/components/shell/proto-ui";

/** Central do Parceiro · Minha conta — acesso por código (sem senha). */
export function ContaParceiro() {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <Cd title="Seu acesso">
        <p className="text-[13.5px] leading-relaxed text-[#6b6e88]">
          Você entra na Central com o seu <strong>código de colaborador</strong> (ARC-…),
          individual e intransferível. Ele substitui email e senha — guarde-o com cuidado
          e não compartilhe.
        </p>
        <p className="mt-3 text-[13.5px] leading-relaxed text-[#6b6e88]">
          Perdeu ou suspeita que o código vazou? A Arché gera um novo e desativa o
          anterior na hora.
        </p>
      </Cd>
      <Cd title="Suporte ao colaborador">
        <p className="text-[13.5px] leading-relaxed text-[#6b6e88]">
          Qualquer ajuste de cadastro, papel ou acesso:{" "}
          <a className="underline" href="mailto:contato@archebrasil.com.br">contato@archebrasil.com.br</a>{" "}
          ou WhatsApp oficial{" "}
          <a className="underline" href="https://wa.me/5511933333841" target="_blank" rel="noopener noreferrer">+55 11 93333-3841</a>.
        </p>
        <p className="mt-3 text-[13.5px] leading-relaxed text-[#6b6e88]">
          Para sair deste dispositivo, use o botão de saída no rodapé do menu lateral.
        </p>
      </Cd>
    </div>
  );
}
