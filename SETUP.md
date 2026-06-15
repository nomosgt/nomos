# NOMOS GT — Setup local

Stack: Next.js 15 + Tailwind v4 + Framer Motion + GSAP + Lucide.

## Como rodar (Windows / macOS / Linux)

> Importante: foi feita uma tentativa parcial de instalar deps via sandbox Linux que pode ter deixado restos. Antes do primeiro `npm install` na sua máquina, **delete** `node_modules` e `package-lock.json` se existirem.

```powershell
# 1. abra terminal nesse diretório
cd "C:\nomosgt\nomos gt"

# 2. (apenas se existirem restos)
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json

# 3. instalar
npm install

# 4. rodar dev server
npm run dev
```

Em macOS/Linux:

```bash
rm -rf node_modules package-lock.json   # se existir
npm install
npm run dev
```

Abre em http://localhost:3000

## Estrutura

```
app/
  layout.tsx         # navbar + footer wrappers, fontes
  page.tsx           # Home (7 seções)
  sobre/             # /sobre
  servicos/          # /servicos
  simulador/         # /simulador (wizard 3 etapas)
  banco-de-teses/    # /banco-de-teses (search + filtros + modal)
  blog/              # listing
  blog/[slug]/       # post
  contato/           # form + sidebar
  globals.css        # tokens, @theme, animações

components/
  navbar.tsx
  footer.tsx
  motion/            # CountUp, Reveal, SplitText, Marquee
  ui/                # Section, Container, Eyebrow, CTA
  home/              # 7 sections da home
  sobre/, servicos/, simulador/, teses/, blog/, contato/

lib/
  utils.ts           # cn(), formatBRL()
```

## Contatos oficiais (já hard-coded)

- Email: **nomosgtorg@gmail.com**
- WhatsApp: **+55 19 99561-9838** (link: `wa.me/5519995619838`)
- Instagram: **@nomosgt** (`instagram.com/nomosgt`)

## Próximos passos

- Foto profissional do Éverton → trocar placeholders em `components/sobre/bio.tsx` e `components/sobre/time.tsx`
- Foto do escritório (se houver) → considerar em Home e Sobre
- OAB nº → placeholder em `components/footer.tsx` e `components/sobre/time.tsx`
- Backend do form de contato → hoje só faz `console.log` em `components/contato/contato-form.tsx`
- Backend do Banco de Teses (Claude API) → estrutura pronta em `components/teses/teses-data.ts`
- Backend do Blog (CMS ou markdown) → estrutura pronta em `components/blog/blog-data.ts`

## Refinamento de design

Veja `HANDOFF-CLAUDE-DESIGN.md` na raiz — prompt pronto pra colar no Claude Design.
