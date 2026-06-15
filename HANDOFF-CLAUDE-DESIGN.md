# HANDOFF DEFINITIVO — Claude Design / NOMOS GT

> Cola este prompt INTEIRO no Claude Design. Não corta nada.
> O Cowork já implementou estrutura completa, conteúdo institucional oficial, paleta azul NGT, foto real do CEO, logo NGT vetorial em primeiro draft. Falta refinamento visual + motion design avançado em código React/Tailwind v4/Framer Motion direto, pronto pra colar.

---

## 0. Quem é o cliente

**NOMOS GT** (NGT) — escritório de **gestão tributária** brasileiro, recém-fundado pelo advogado **Éverton Vicente** (CEO e Fundador). Atende **empresas de TODOS os portes** (de PMEs a grandes). O discurso é deliberadamente inclusivo, contra a ideia de boutique elitista.

### Promessa institucional oficial (o tom do site)

> "Escolher a Nomos é enxergar o tributário de uma nova forma: **menos complexidade, mais segurança e mais oportunidade**. Levamos de forma descomplicada soluções estratégicas que antes estavam ao alcance de poucos para empresas de todos os portes, **transformando tributos em valor, crescimento e resultado**."
> — Éverton Vicente, CEO e Fundador

- **Tagline da home:** "Até onde sua empresa pode crescer?" (segunda metade em itálico azul brand)
- **Número de credibilidade:** **+R$ 100 milhões em créditos recuperados pelo time NGT** (count-up animado)
- **Estatística-detonante do manifesto:** "**95% das empresas pagam mais tributos do que deveriam no Brasil.**"
- **Frase de fechamento:** "O céu é o limite."

### Tom

- Técnico-sem-arrogância (escritório que democratiza acesso a teses sofisticadas)
- Descomplicado (palavra-chave do briefing)
- Sério mas moderno (não law-firm de 1990 nem startup brincalhona)
- Inspirações: **Linear, Vercel, Stripe, Ramp, Mercury, Attio**

---

## 1. ⚠️ LOGO — PRIORIDADE CRÍTICA

A logo NGT oficial é composta por:
- Quadrado superior esquerdo (navy escuro `#0E1525`)
- Linha vertical fina à direita do quadrado superior (mesma cor)
- **"NGT" em serif navy alinhado ao TOPO do símbolo**, na altura do quadrado superior (cap-height do "N" alinha com o topo do quadrado, baseline alinha com o bottom do quadrado)
- Quadrado inferior esquerdo
- Linha vertical fina entre os dois quadrados de baixo
- Quadrado inferior direito (mesmo tamanho do inferior esquerdo)

A geometria é **mondrian-like**: 2 colunas × 2 linhas, mas a célula superior-direita está ocupada apenas pelo wordmark "NGT" (sem o retângulo navy). Os 3 retângulos formam um "L" invertido.

**O Cowork tentou recriar isso em SVG**, mas a proporção / spacing / alinhamento do "NGT" ainda não bateram exatamente com o original. O componente atual está em `components/brand/logo.tsx` com duas variantes (`symbol` e `full`).

**Pedido pro Claude Design (CRÍTICO):**
1. Refazer o componente `Logo` com proporções EXATAS da logo original (anexada à parte como screenshot — Éverton vai mandar o SVG depois mas por ora vale o screenshot como referência).
2. O wordmark "NGT" precisa estar perfeitamente alinhado ao topo do símbolo, com cap-height casando o topo do quadrado superior e baseline casando o bottom desse quadrado.
3. Considerar **2 versões do "NGT"**: uma usando a Instrument Serif (que o site já tem), outra usando uma serif mais clássica embedada (a logo oficial parece usar algo próximo de Bodoni ou Didone — talvez Playfair Display ou EB Garamond).
4. Garantir que a logo escala bem em qualquer tamanho — de 24px (favicon) a 200px (footer hero).
5. Sugerir variantes: lockup horizontal (atual), vertical (empilhado), monograma só do quadrado top com "NGT" embaixo.

Arquivos atuais:
- `components/brand/logo.tsx` — componente React
- `public/logo/ngt-symbol.svg` — só o símbolo
- `public/logo/ngt-full.svg` — símbolo + wordmark
- `app/icon.svg` — favicon

**Quando Éverton mandar o SVG oficial, basta substituir esses 3 arquivos e tudo do site se atualiza.**

---

## 2. Identidade visual aplicada

### Paleta (`app/globals.css` com `@theme` + `:root` blindado contra shadcn)

```css
/* Backgrounds */
--color-background: #FAFAF7   /* warm off-white claro */
--color-surface:    #F4F2EC   /* card surfaces */
--color-paper:      #EAEBEF   /* off-white frio para texto em fundo escuro */
--color-paper-dim:  #B8BAC2

/* Tinta */
--color-ink:        #0E1525   /* navy quase preto (cor do símbolo da logo) */
--color-ink-muted:  #6B6B6B
--color-ink-faint:  #9A9A95
--color-hairline:   #E5E5E0

/* Brand — AZUL NGT do material institucional */
--color-brand:      #163A8A
--color-brand-dim:  #0E2660
--color-brand-soft: #8FA8D6
```

### Cores semafóricas (Classificação de Risco)

- 🟢 `#3B9F4F` — verde / risco baixo / aprovado
- 🟡 `#D4A024` — amarelo / risco médio / atenção
- 🔴 `#C13838` — vermelho / alto risco / crítico

### Tipografia

- **Display/Serif:** `Instrument Serif` (h1/h2/h3, tracking -0.02 a -0.035em, leading 0.95)
- **Corpo/Sans:** `Inter` (features `ss01`, `cv11`)
- **Mono/Dados:** `JetBrains Mono` (eyebrows uppercase 0.3em, count-ups, badges)

---

## 3. Estrutura: 7 páginas implementadas

### Home `/` — 7 seções
1. **Hero**: eyebrow + headline "Até onde sua empresa / *pode crescer?*" (split-text reveal) + sub com discurso oficial + 2 CTAs + marca d'água do símbolo NGT no canto superior direito (opacity 0.04)
2. **CounterBand** (preto full-bleed): "Mais de 100 milhões em créditos recuperados pelo time NGT" + R$ 100M+ em mono CountUp gigante + 4 sub-stats
3. **AreasSection**: grid 1×3 dos 3 Pilares NGT
4. **WhyNomos**: sticky title + 4 pilares de comportamento
5. **SimuladorTeaser**: card com mock do simulador preto + breakdown
6. **Manifesto** (preto): "95% das empresas pagam mais tributos do que deveriam no Brasil." + marquee infinito
7. **ClosingCTA**: 3 cards de contato

### Sobre `/sobre` — 5 blocos
- **SobreHero**: nome + "A leitura técnica por trás da NOMOS." italic azul
- **Bio**: **FOTO REAL DO ÉVERTON** (`/everton/everton-palco.jpg`, aspect 3:4, molduras `┌ ┐ └ ┘`) + quote oficial + bio + grid de credenciais
- **Metodo** (Jornada do Cliente): 7 etapas com timeline vertical + dots azuis
- **Valores**: 4 cards
- **Time**: "Quem está por trás. *Atenção cirúrgica.*" + card do Éverton + card Time NGT em expansão

### Serviços `/servicos` — 4 blocos
- **Hero**: "Todo o ciclo tributário da empresa."
- **ServicosList**: 3 Pilares (Consultoria 5 bullets / Judicial 12 bullets com Temas STF/STJ / Administrativa 4 bullets)
- **ClassificacaoRisco**: 3 cards Verde/Amarelo/Vermelho estilo semáforo
- **ServicosCTA** (preto)

### Simulador `/simulador`
Wizard 3 etapas (faturamento slider log-scale / setor grid 2×3 / regime 3 cards) + resultado preto com breakdown

### Banco de Teses `/banco-de-teses`
- Search + sidebar filtros (Tributo · Status · Esfera · **Via judicial/administrativa**)
- **16 teses REAIS do PDF NGT** com bolinha de risco em cada card
- Modal de tese com análise + badge "✦ Análise revisada e atualizada por IA"

### Blog `/blog` + `/blog/[slug]`
Filtros categoria + post destaque + grid 3 cols + post individual

### Contato `/contato`
Form (console.log) + sidebar (WhatsApp destacado + Email + Instagram + Endereço SP + Atendimento)

### Shared
- **Navbar** transparente → frostada ao scrollar, logo NGT, mobile menu animado
- **Footer** com logo NGT gigante + 3 colunas de links

---

## 4. Motion já implementado

- Hero: letter-by-letter reveal (`SplitText` SEM `overflow-hidden` — evita clipping de descenders da Instrument Serif italic)
- CounterBand: `CountUp` on viewport enter
- Section reveals: stagger + fade-up via `Reveal` / `StaggerReveal`
- Hover: links com underline animada (origem direita → esquerda), botões com translate-y, ícones com leve rotate
- Mobile menu: full overlay com stagger
- Modal de tese: slide-up + backdrop blur
- Marquee horizontal infinito no manifesto

---

## 5. ASSETS já no projeto

- ✅ `/public/everton/everton-palco.jpg` — foto Éverton no palco (Bio + Time)
- ✅ `/public/everton/everton-workshop.jpg` — foto Éverton no Workshop Reforma Tributária 2026 (FotoEmCampo)
- ⚠️ `/public/logo/ngt-symbol.svg` + `/public/logo/ngt-full.svg` — primeiro draft, **precisa refinar**
- ✅ `/app/icon.svg` — favicon (atualizar quando logo melhorar)

---

## 6. STACK CONFIRMADA

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Tailwind v4** (tokens em `@theme` no `globals.css` — NÃO usar `tailwind.config.js`)
- **Framer Motion 11**
- **GSAP 3 + ScrollTrigger** (instalado, quase não usado — fica à vontade)
- **shadcn/ui** (instalado)
- **Lucide React** (ícones line-style)
- Fonts via `next/font/google` (Inter, Instrument Serif, JetBrains Mono)

Aliases: `@/components/*`, `@/lib/*`

⚠️ **Importante:** o file watcher do ambiente corta o final de arquivos longos eventualmente. **Sempre cole código COMPLETO, com fechamentos balanceados, sem truncar**. Termine sempre com `// end of <ComponentName>` como âncora para o watcher não cortar.

---

## 7. PEDIDOS DE REFINAMENTO (em ordem de prioridade)

Para cada bloco abaixo, devolva: **(1) diagnóstico curto** · **(2) código React/Tailwind/Framer Motion COMPLETO pronto pra colar** · **(3) onde substituir no projeto** · **(4) notas de performance**.

### ★ 0. **LOGO** (refazer)
Já detalhei na §1. Esse é o primeiro item. Refazer o SVG da logo com proporções e alinhamentos EXATOS, propor 2 variantes de serif (Instrument vs Bodoni/Playfair), criar lockup horizontal + vertical + monograma. Atualizar `components/brand/logo.tsx`.

### A. **Hero da Home** — fazer ser INESQUECÍVEL
Hoje: split-text reveal + sub + CTAs + logo decorativa watermark.
Pedido:
- Arte de fundo SVG abstrata (linhas de gráfico fiscal estilizadas, números semi-transparentes flutuando, malha tipo "documento técnico" que se desenha com GSAP DrawSVG)
- Ou animação de uma única peça memorável (o "100" do CounterBand sendo previsto no fundo do hero antes de aparecer)
- Cursor customizado discreto (ponto + halo que cresce nos CTAs)

### B. **CounterBand R$ 100M+** — TRANSIÇÃO cinematic
Hoje: mono gigante + sub-stats grid.
Quero que esse número seja A FOTO da landing.
- ScrollTrigger GSAP fazendo o "100" crescer do nada quando entra na viewport
- Partículas/linhas finas se desprendendo do número conforme conta
- Transição entre Hero (claro) e CounterBand (preto) com sliver azul passando

### C. **Simulador** — micro-interações premium
- Slider Step 1: curva/distribuição que se atualiza, halo crescendo no thumb, indicador de "faixa" (PME / média / grande)
- Transições entre Steps mais cinematic (cortina vertical? slide horizontal?)
- Tela de resultado: bloco preto ganha fundo SVG animado + **gráfico de donut animado** pro breakdown PIS/COFINS / ICMS / IRPJ/CSLL

### D. **Banco de Teses** — visual editorial
- Cards com **número grande estilo revista** no canto ("Tema 69" em serif outline gigante atrás do conteúdo)
- Filtros aplicados → animar reorganização dos cards (`layout` do Framer Motion)
- Modal de tese ganha capa editorial: epígrafe em serif italic centralizada, padrão geométrico sutil, número do Tema em mono grande
- Badge "✦ Análise por IA" pulsa ou ganha halo

### E. **Classificação de Risco** (nova seção em /servicos)
- Tornar mais didático e visual: gradiente do verde ao vermelho conectando os 3, ou "termômetro de risco" lateral
- Bolas pulsam em sequência quando entram em view

### F. **Jornada do Cliente** (7 etapas, /sobre)
- Linha sendo **desenhada conforme scroll passa** por cada etapa (GSAP DrawSVG ou stroke-dashoffset)
- Cada dot pulsa quando entra em view
- Considerar versão horizontal alternativa em desktop ultra-wide

### G. **Tratamento da foto do Éverton** (/sobre/Bio)
- **Duotone azul NGT + ink** (filtro CSS ou SVG filter)
- Mask wipe reveal no scroll
- Frame "documento técnico" com nº de série e data
- Grão de filme sutil

### H. **Page transitions entre rotas**
- Fade + sliver azul brand passando por baixo
- Implementar via Framer Motion `AnimatePresence` no layout client wrapper

### I. **Open Graph dinâmico**
- Template OG image 1200×630 gerado com `next/og`
- Paleta NGT + símbolo + tipografia, variando por rota

### J. **Cursor customizado discreto**
- Ponto 4px + halo 24px crescendo em áreas interativas
- `mix-blend-mode: difference` quando passa sobre seções pretas

---

## 8. RESTRIÇÕES ABSOLUTAS

- ❌ Gradient "techy" colorido (azul→roxo, rainbow)
- ❌ Stock photo (única foto do site é a do Éverton)
- ❌ Glassmorphism saturado
- ❌ Cores fora da paleta — accent é **azul NGT `#163A8A`**, ponto
- ❌ Ícones flat coloridos (Lucide line style em currentColor)
- ❌ Three.js pesado (3D só super sutil)
- ❌ Headlines genéricas ("soluções inteligentes")
- ❌ Animação que compete com o conteúdo (motion serve o texto)

---

## 9. ENTREGÁVEIS ESPERADOS

Para cada um dos 11 pontos (0 + A–J), me devolva:

1. **Diagnóstico curto** — o que está OK e o que falta
2. **Código React/Tailwind v4/Framer Motion COMPLETO** — pronto pra colar, com imports, `"use client"` se necessário, fechamentos balanceados, terminando com `// end of <ComponentName>`
3. **Onde colocar** — caminho exato do arquivo a substituir/criar
4. **Notas de performance** — cleanup de GSAP, dynamic imports se necessário
5. **Bonus opcional**: variação alternativa (versão ousada e versão conservadora)

**Não precisa entregar tudo de uma vez.** Começa pela LOGO (§1), depois Hero (A), depois o que considerar maior ganho. Mas seja específico: quero código que cola e roda, não descrição genérica.

---

## 10. CONTEXTO ADICIONAL

- Site rodando localhost, sem deploy, sem analytics, sem backend (form só `console.log`)
- Cliente é cético, técnico, vai testar cada animação — não pode ter jank, glitch, ou problema no mobile
- Loop: Cowork (eu) implemento → Claude Design (você) refina → Cowork implemento de volta. Até ficar de tirar o fôlego do CFO.

**Começa pela logo. Manda ver.**
