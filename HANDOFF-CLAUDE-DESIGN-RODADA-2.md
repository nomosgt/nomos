# HANDOFF #2 — Claude Design / NOMOS GT (rodada 2)

> Continuação do handoff anterior. A logo que você gerou foi APROVADA pelo cliente. Agora vamos:
> 1. **Empacotar** essa logo em todas as variações que o site/material institucional precisa (PNG, monogramas, lockups).
> 2. **Atacar de vez** os refinamentos visuais + motion design do site inteiro.

---

## ✅ 0. LOGO APROVADA

A versão que você fez (3 retângulos navy `#0E1525` + 2 barras finas + "NGT" em serif Bodoni-like alinhado ao topo do quadrado superior) é a **versão final**. Cliente amou.

Já apliquei localmente no navbar/footer/favicon usando Playfair Display (Bodoni-like) como font do wordmark. Mas preciso de você as **variações exportadas** abaixo. Devolve em uma única resposta com todas elas.

### Pedido: pacote completo da identidade

Gere os arquivos prontos pra download (preferencialmente como **SVG** + **PNG transparente 2048px de altura** para cada item):

#### Símbolo isolado (só os 3 retângulos + barras)
1. **`ngt-symbol-dark.svg`** — navy `#0E1525` (uso em fundos claros)
2. **`ngt-symbol-light.svg`** — off-white `#EAEBEF` (uso em fundos escuros)
3. **`ngt-symbol-brand.svg`** — azul brand `#163A8A` (variação de hover/destaque)

#### Logo completa (símbolo + "NGT" Bodoni-like)
4. **`ngt-full-dark.svg`** — navy sobre claro
5. **`ngt-full-light.svg`** — claro sobre escuro
6. **`ngt-full-brand.svg`** — azul brand

#### Lockups alternativos
7. **`ngt-vertical.svg`** — símbolo em cima, "NGT" embaixo (uso em quadrados, cards, instagram avatar)
8. **`ngt-monogram.svg`** — apenas o quadrado top-left (favicon ultra-mínimo, app icon)

#### Open Graph card (1200×630)
9. **`og-default.png`** — template Open Graph com símbolo + tagline "Até onde sua empresa pode crescer?" + paleta NGT
10. **`og-counter.png`** — variação focando no "+R$ 100M em créditos recuperados"

#### Favicon set
11. **`favicon-16.png`**, **`favicon-32.png`**, **`favicon-180.png`** (apple-touch-icon), **`favicon.ico`**

**Importante:** o cliente vai querer levar essa identidade pra Instagram, apresentações, papel timbrado, e-mail signature, etc. Por isso preciso de fontes vetoriais limpas + PNGs em alta resolução. Manda tudo de uma vez.

---

## 🎬 1. MOTION DESIGN AVANÇADO — agora vamos pro show

O site tem 7 páginas, paleta azul NGT, copy institucional aplicada, foto real do CEO. **Funciona, mas falta o "uau"** que faz o CFO da empresa parar no scroll e mandar pro contador. Esse é seu trabalho agora.

### Stack confirmada (cola o código pronto):
- **Next.js 15 (App Router) + React 19 + TypeScript**
- **Tailwind v4** (`@theme` em `globals.css`, NÃO `tailwind.config.js`)
- **Framer Motion 11**
- **GSAP 3 + ScrollTrigger** (instalado, MANDA USAR — quase não foi usado ainda)
- **Lucide React** (line icons)
- Fonts via `next/font/google`
- Aliases: `@/components/*`, `@/lib/*`

### Tokens já em uso:
```
--color-background  #FAFAF7
--color-surface     #F4F2EC
--color-paper       #EAEBEF   (texto/elementos em fundo escuro)
--color-ink         #0E1525   (navy quase preto)
--color-ink-muted   #6B6B6B
--color-hairline    #E5E5E0
--color-brand       #163A8A   (AZUL NGT)
--color-brand-dim   #0E2660
--color-brand-soft  #8FA8D6
```

### Restrições absolutas
- ❌ Sem gradient techy colorido (azul→roxo, rainbow)
- ❌ Sem glassmorphism saturado
- ❌ Sem cor nova fora da paleta — accent é AZUL NGT, ponto
- ❌ Sem ícone flat colorido — só Lucide line em currentColor
- ❌ Sem 3D pesado
- ❌ Animação que compete com conteúdo: NÃO

### Pra cada bloco abaixo, devolve:
1. **Diagnóstico** — o que está hoje, o que precisa
2. **Código COMPLETO React/Tailwind v4/Framer Motion** pronto pra colar — com `"use client"` se cliente, imports, fechamentos balanceados, terminando com `// end of <ComponentName>` como âncora (file watcher do meu ambiente corta arquivos sem âncora)
3. **Onde colocar** — caminho exato
4. **Notas de performance** — cleanup GSAP, dynamic imports, suspense

---

### 🎯 BLOCOS PRA REFINAR (ordem de prioridade)

#### **A. HERO da home — IMPACTO máximo**
Hoje: split-text reveal palavra a palavra + sub + CTAs + watermark do símbolo NGT no canto. Sólido mas não memorável.

**Pedido:**
- **Background SVG arte abstrata** que se desenha com GSAP DrawSVG conforme scroll inicial: linhas finas representando "fluxo de caixa" (entrada/saída/recuperação), números fiscais semi-transparentes flutuando (ex.: "ICMS", "PIS", "Tema 69" em mono ultra-leve), malha geométrica tipo "documento técnico"
- **Cursor customizado** discreto (ponto 4px + halo 24px crescendo em CTAs e links)
- Considerar **paralax sutil** no símbolo NGT decorativo conforme mouse mexe

Arquivo: `components/home/hero.tsx`

#### **B. CounterBand R$ 100M+ — TRANSIÇÃO cinematic**
Hoje: mono gigante + sub-stats em grid. Funciona mas previsível.

**Pedido:**
- **ScrollTrigger GSAP** fazendo a transição Hero (claro) → CounterBand (preto) com sliver azul brand passando por baixo
- O "100" no count-up cresce com efeito de "peso" (scale + slight rotation + spring) ao entrar
- **Partículas/linhas finas** se desprendendo do número conforme conta sobe (uso de canvas leve ou SVG animado)
- Variação alternativa: o número aparece como contador de máquina de calcular antiga (texto rolando)

Arquivo: `components/home/counter-band.tsx`

#### **C. Simulador — micro-interações premium**
Hoje: wizard 3 etapas com slider, grid e cards. Simples mas serve.

**Pedido:**
- **Slider Step 1** ganha curva/distribuição que se atualiza em tempo real conforme arrasta + halo expandindo do thumb + label "PME / Médio / Grande" abaixo do valor
- **Transições entre Steps** mais cinematic: cortina vertical descendo? slide horizontal direita-pra-esquerda? número da etapa pulsa quando passa?
- **Tela de Resultado** (já é bloco preto): ganha fundo SVG animado (malha concêntrica que se desenha) + **gráfico de donut animado** pro breakdown PIS/COFINS / ICMS / IRPJ/CSLL, com cada fatia entrando em sequência

Arquivos:
- `components/simulador/simulador-wizard.tsx`
- Possível novo: `components/simulador/donut-breakdown.tsx`

#### **D. Banco de Teses — visual editorial**
Hoje: cards funcionais com risco dot + status badge + tributos + título + resumo + ano + base + "Ver análise".

**Pedido:**
- Cada card ganha **número grande estilo revista** no canto: "Tema 69" em serif outline gigante atrás do conteúdo (tipo capa de Bloomberg/Fortune)
- Ao aplicar filtros, **animar reorganização dos cards** com `layout` do Framer Motion
- **Modal de tese** ganha capa editorial: epígrafe italic centralizada, padrão geométrico de linhas finas no topo, número do Tema em mono grande, divisória ornamental
- Badge "✦ Análise por IA" **pulsa** ou ganha **halo azul brand** sutil

Arquivo: `components/teses/teses-browser.tsx`

#### **E. Classificação de Risco — didática visual**
Hoje: 3 cards Verde/Amarelo/Vermelho em `components/servicos/classificacao-risco.tsx`. Bola + badge + copy.

**Pedido:**
- **Gradiente vertical** ou diagonal do verde ao vermelho **conectando** os 3 cards (como termômetro lateral)
- Bolas **pulsam em sequência** quando entram em view (verde primeiro, depois amarelo, depois vermelho)
- Considerar **mini-ícone semáforo** abstrato (3 círculos empilhados) decorativo

#### **F. Jornada do Cliente — linha SE DESENHA com scroll**
Hoje: timeline vertical com dots em `components/sobre/metodo.tsx`. Linha estática.

**Pedido:**
- **Linha vertical sendo desenhada conforme scroll** passa por cada etapa (GSAP `stroke-dashoffset` ou DrawSVG)
- Dot da etapa atual **pulsa** quando entra em view
- Bonus: versão **horizontal alternativa** em desktop ultra-wide (≥1600px), com cards horizontais e linha desenhando da esquerda pra direita

#### **G. Foto do Éverton — tratamento editorial**
Hoje: `next/image` com object-cover + molduras `┌ ┐ └ ┘` em `components/sobre/bio.tsx`.

**Pedido:**
- **Duotone azul NGT + ink** via SVG filter (mais controlável que CSS filter) — manter detalhe do rosto + sumindo no preto puro do fundo do palco
- **Mask wipe reveal no scroll** (a foto vai sendo revelada de cima pra baixo conforme aparece)
- **Frame "documento técnico"** com nº de série (ex.: "REG-EV-001-2026") e data discreta no canto
- **Grão de filme** sutil overlay

#### **H. Page transitions entre rotas**
Hoje: zero transição (Next padrão).

**Pedido:**
- **Sliver azul brand** passando por baixo da rota saindo + nova rota entrando com fade
- Implementar com `AnimatePresence` no `app/layout.tsx` ou em `template.tsx` (Next 15)
- **Loading state elegante**: barra fina azul no topo

#### **I. Open Graph dinâmico**
Hoje: meta básico em `app/layout.tsx`.

**Pedido:**
- Template OG image gerado com `next/og` em `app/opengraph-image.tsx`
- Tamanho 1200×630, paleta NGT, símbolo + tagline da página
- Variações por rota: Home (tagline), Sobre (foto + nome), Serviços (3 pilares), etc.

#### **J. Cursor customizado**
Hoje: cursor padrão do browser.

**Pedido:**
- **Ponto 4px** (azul brand) + **halo 24px** (azul brand 30% opacity) que cresce em áreas interativas
- `mix-blend-mode: difference` ao passar sobre seções pretas (CounterBand, Manifesto, ServicosCTA)
- Desabilitado em mobile (sem hover)

---

## 🎁 BONUS — sugestões livres

Se enquanto trabalha você ver QUALQUER coisa que pode elevar o site (uma section que falta, um layout melhor, um motion brilhante que se aplique, uma feature que faz sentido pro tributário), **propõe**. O briefing é direção, não cerceio.

Exemplos do que adoraria ver de bônus:
- **Seção "Bastidores"** no Sobre — escritório, processo, time
- **Seção "Cases"** com números reais de clientes (anonimizados)
- **Newsletter signup** elegante no footer
- **Calculadora de PMP** (prazo médio de pagamento de impostos) — outro lead magnet
- **Logo wall** discreta de clientes (quando o Éverton autorizar)
- **Modo escuro** (preview pelo menos)

---

## ⚙ LEMBRETES TÉCNICOS

- Cole código completo, com fechamentos, terminando com `// end of <ComponentName>` (file watcher corta arquivos longos sem âncora — perdi uns 5 arquivos antes por causa disso)
- Se introduzir GSAP/ScrollTrigger, lembrar `useEffect` cleanup + `gsap.context()`
- Se introduzir lib pesada (chart, three, lottie), sugerir `dynamic import` com `ssr: false`
- Acessibilidade: respeitar `prefers-reduced-motion`
- Mobile-first: tudo precisa funcionar bem em viewport 380px

---

## 🚀 CHECKLIST DE ENTREGA

Sua resposta ideal contém:

- [ ] Pacote da logo (SVG + PNG + favicon set + OG cards) — link/code blocks
- [ ] Refinamento dos 10 blocos (A–J) — ou os que você priorizar nessa rodada
- [ ] Bonus livre (se aplicável)
- [ ] Lista resumida do que ficou pra próxima rodada

**Não precisa fazer tudo em uma só resposta.** Prefiro receber em sequência: primeiro a logo empacotada (rápido), depois A+B (hero + counter), depois C+D (simulador + teses), depois o resto.

**Loop:** Cowork (eu) implemento → Claude Design (você) refina → Cowork implemento de volta. Até ficar de tirar o fôlego do CFO.

Manda ver. 🚀

---

## P.S. — Sobre seu papel

Você (Claude Design) **não serve só pra logo**. Você é o especialista em UI/UX/motion completo. Quanto mais propor, melhor. Hero, transições, micro-interações, layouts alternativos, OG images, identidade visual ampla, tratamento de foto, cursor, tudo é seu território.

O Cowork implementa o que você devolver em código. Esse é nosso loop. Faz sentido manter como hábito: você refina → eu implemento → você critica o que implementei → eu refino → repete.

Vai com tudo.
