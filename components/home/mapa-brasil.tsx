"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";
import { Container } from "@/components/ui/section";
import { Reveal } from "@/components/motion/reveal";
import { ESTADOS_PATHS } from "./estados-paths";

/**
 * MAPA DO BRASIL — 27 estados (paths reais @svg-maps/brazil reprojetados)
 * + 27 capitais nas coordenadas IBGE oficiais.
 * X = equirectangular (longitude linear).
 * Y = Mercator — projeção do SVG original. Sem isso, capitais ao sul
 * (SP, RJ, BH) caem ~13px fora do polígono visual.
 */

interface Capital {
  uf: string;
  nome: string;
  cidade: string;
  lat: number;
  lon: number;
  sede?: boolean;
}

const toX = (lon: number) => (lon + 74) * 13.5;
const LAT_N = 5.27;
const LAT_S = -33.74;
const Y_TOP = 3.45;
const Y_BOT = 588.6;
const mercY = (lat: number) =>
  -Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
const Y_MERC_N = mercY(LAT_N);
const Y_MERC_S = mercY(LAT_S);
const Y_SCALE = (Y_BOT - Y_TOP) / (Y_MERC_S - Y_MERC_N);
const toY = (lat: number) => Y_TOP + (mercY(lat) - Y_MERC_N) * Y_SCALE;

const CAPITAIS_RAW: Omit<Capital, never>[] = [
  // NORTE
  { uf: "AC", nome: "Acre", cidade: "Rio Branco", lat: -9.9747, lon: -67.81 },
  { uf: "AM", nome: "Amazonas", cidade: "Manaus", lat: -3.119, lon: -60.0217 },
  { uf: "AP", nome: "Amapá", cidade: "Macapá", lat: 0.0349, lon: -51.0694 },
  { uf: "PA", nome: "Pará", cidade: "Belém", lat: -1.4554, lon: -48.4898 },
  { uf: "RO", nome: "Rondônia", cidade: "Porto Velho", lat: -8.7619, lon: -63.9039 },
  { uf: "RR", nome: "Roraima", cidade: "Boa Vista", lat: 2.8235, lon: -60.6758 },
  { uf: "TO", nome: "Tocantins", cidade: "Palmas", lat: -10.1844, lon: -48.3336 },
  // NORDESTE
  { uf: "AL", nome: "Alagoas", cidade: "Maceió", lat: -9.6499, lon: -35.735 },
  { uf: "BA", nome: "Bahia", cidade: "Salvador", lat: -12.9777, lon: -38.5016 },
  { uf: "CE", nome: "Ceará", cidade: "Fortaleza", lat: -3.7172, lon: -38.5431 },
  { uf: "MA", nome: "Maranhão", cidade: "São Luís", lat: -2.5297, lon: -44.3028 },
  { uf: "PB", nome: "Paraíba", cidade: "João Pessoa", lat: -7.1195, lon: -34.845 },
  { uf: "PE", nome: "Pernambuco", cidade: "Recife", lat: -8.0476, lon: -34.877 },
  { uf: "PI", nome: "Piauí", cidade: "Teresina", lat: -5.0892, lon: -42.8019 },
  { uf: "RN", nome: "Rio Grande do Norte", cidade: "Natal", lat: -5.7945, lon: -35.211 },
  { uf: "SE", nome: "Sergipe", cidade: "Aracaju", lat: -10.9472, lon: -37.0731 },
  // CENTRO-OESTE
  { uf: "DF", nome: "Distrito Federal", cidade: "Brasília", lat: -15.7942, lon: -47.8822 },
  { uf: "GO", nome: "Goiás", cidade: "Goiânia", lat: -16.6864, lon: -49.2643 },
  { uf: "MS", nome: "Mato Grosso do Sul", cidade: "Campo Grande", lat: -20.4486, lon: -54.6295 },
  { uf: "MT", nome: "Mato Grosso", cidade: "Cuiabá", lat: -15.6014, lon: -56.0979 },
  // SUDESTE
  { uf: "ES", nome: "Espírito Santo", cidade: "Vitória", lat: -20.3155, lon: -40.3128 },
  { uf: "MG", nome: "Minas Gerais", cidade: "Belo Horizonte", lat: -19.9167, lon: -43.9345 },
  { uf: "RJ", nome: "Rio de Janeiro", cidade: "Rio de Janeiro", lat: -22.9068, lon: -43.1729 },
  { uf: "SP", nome: "São Paulo", cidade: "São Paulo", lat: -23.5505, lon: -46.6333, sede: true },
  // SUL
  { uf: "PR", nome: "Paraná", cidade: "Curitiba", lat: -25.4284, lon: -49.2733 },
  { uf: "SC", nome: "Santa Catarina", cidade: "Florianópolis", lat: -27.5969, lon: -48.5495 },
  { uf: "RS", nome: "Rio Grande do Sul", cidade: "Porto Alegre", lat: -30.0346, lon: -51.2177 },
];

const CAPITAIS: (Capital & { x: number; y: number })[] = CAPITAIS_RAW.map(
  (c) => ({ ...c, x: toX(c.lon), y: toY(c.lat) }),
);

export function MapaBrasil() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-15%" });
  const [hovered, setHovered] = useState<(typeof CAPITAIS)[number] | null>(null);
  const active = hovered || CAPITAIS.find((c) => c.sede)!;
  const sede = CAPITAIS.find((c) => c.sede)!;

  return (
    <section
      ref={ref}
      className="relative py-28 lg:py-40 bg-[color:var(--color-ink)] text-[color:var(--color-paper)] overflow-hidden border-t border-[color:var(--color-paper)]/10"
    >
      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-12 lg:gap-20 items-end mb-16 lg:mb-20">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.35em] text-[color:var(--color-paper)]/50 mb-8 flex items-center gap-3">
              <span className="h-px w-8 bg-[color:var(--color-brand-soft)]" />
              Atuação nacional
            </div>
            <h2 className="font-serif text-display-md lg:text-display-lg leading-[0.95] tracking-tight text-[color:var(--color-paper)]">
              Sede em São Paulo.<br />
              <span className="italic text-[color:var(--color-brand-soft)]">
                Atuação em todo o território nacional.
              </span>
            </h2>
          </div>
          <p className="text-[16px] lg:text-[17px] leading-relaxed text-[color:var(--color-paper)]/65 max-w-md lg:justify-self-end">
            Procedimentos administrativos conduzidos de forma remota. Ações
            judiciais ajuizadas em qualquer vara federal ou estadual, com apoio
            de correspondentes locais quando necessário. Reuniões presenciais
            em São Paulo, mediante agendamento.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-10 lg:gap-16 items-start">
          <Reveal>
            <div className="relative">
              <svg
                viewBox="0 0 560 620"
                className="w-full h-auto"
                aria-label="Mapa do Brasil com 27 capitais"
              >
                <defs>
                  <pattern id="mapGrid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--color-paper)" strokeOpacity="0.04" strokeWidth="0.5" />
                  </pattern>
                  <filter id="inflateLand" x="-5%" y="-5%" width="110%" height="110%">
                    <feMorphology operator="dilate" radius="3" />
                  </filter>
                </defs>

                <rect width="560" height="620" fill="url(#mapGrid)" />

                <motion.line
                  x1={toX(-74)} y1={toY(0)} x2={toX(-50)} y2={toY(0)}
                  stroke="var(--color-paper)" strokeOpacity="0.1" strokeWidth="0.5" strokeDasharray="3 5"
                  initial={{ pathLength: 0 }} animate={inView ? { pathLength: 1 } : {}}
                  transition={{ duration: 1.5, delay: 2.4 }}
                />
                <motion.text
                  x={toX(-74) + 4} y={toY(0) - 4} fill="var(--color-paper)" fillOpacity="0.28"
                  fontSize="8" fontFamily="var(--font-mono), monospace" letterSpacing="1"
                  initial={{ opacity: 0 }} animate={inView ? { opacity: 0.28 } : {}}
                  transition={{ delay: 2.8 }}
                >EQUADOR</motion.text>

                <motion.line
                  x1={toX(-58)} y1={toY(-23.5)} x2={toX(-39)} y2={toY(-23.5)}
                  stroke="var(--color-paper)" strokeOpacity="0.1" strokeWidth="0.5" strokeDasharray="3 5"
                  initial={{ pathLength: 0 }} animate={inView ? { pathLength: 1 } : {}}
                  transition={{ duration: 1.5, delay: 2.5 }}
                />
                <motion.text
                  x={toX(-58) + 4} y={toY(-23.5) - 4} fill="var(--color-paper)" fillOpacity="0.22"
                  fontSize="7.5" fontFamily="var(--font-mono), monospace" letterSpacing="1"
                  initial={{ opacity: 0 }} animate={inView ? { opacity: 0.22 } : {}}
                  transition={{ delay: 2.9 }}
                >TR. CAPRICÓRNIO</motion.text>

                {/* Camada 1: estados inflados (absorve dots costeiros) */}
                <g filter="url(#inflateLand)" aria-hidden>
                  {Object.entries(ESTADOS_PATHS).map(([uf, info]) => (
                    <motion.path
                      key={`infl-${uf}`} d={info.d} fill="var(--color-paper)" fillOpacity="0.05" stroke="none"
                      initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}}
                      transition={{ duration: 0.8, delay: 0.3 }}
                    />
                  ))}
                </g>

                {/* Camada 2: estados com bordas crisp */}
                <g>
                  {Object.entries(ESTADOS_PATHS).map(([uf, info], i) => {
                    const isHovered = hovered?.uf === uf;
                    return (
                      <motion.path
                        key={`estado-${uf}`}
                        d={info.d}
                        fill="var(--color-paper)"
                        fillOpacity={isHovered ? 0.12 : 0}
                        stroke="var(--color-paper)"
                        strokeOpacity="0.4"
                        strokeWidth="0.6"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        initial={{ opacity: 0, pathLength: 0 }}
                        animate={inView ? { opacity: 1, pathLength: 1 } : {}}
                        transition={{
                          opacity: { duration: 0.6, delay: 0.4 + i * 0.04 },
                          pathLength: { duration: 1.6, delay: 0.4 + i * 0.04, ease: [0.22, 1, 0.36, 1] },
                        }}
                        style={{ transition: "fill-opacity 220ms" }}
                      />
                    );
                  })}
                </g>

                {/* Linhas SP → todas as capitais */}
                {CAPITAIS.filter((c) => !c.sede).map((c, i) => (
                  <motion.line
                    key={`line-${c.uf}`} x1={sede.x} y1={sede.y} x2={c.x} y2={c.y}
                    stroke="var(--color-brand-soft)" strokeOpacity="0.1" strokeWidth="0.5"
                    initial={{ pathLength: 0 }} animate={inView ? { pathLength: 1 } : {}}
                    transition={{ duration: 1.2, delay: 1.8 + i * 0.025, ease: [0.22, 1, 0.36, 1] }}
                  />
                ))}

                {/* 27 capitais */}
                {CAPITAIS.map((c, i) => {
                  const isActive = active?.uf === c.uf;
                  return (
                    <g key={c.uf}>
                      {c.sede && (
                        <motion.circle
                          cx={c.x} cy={c.y} r={8} fill="var(--color-brand-soft)" fillOpacity="0.4"
                          animate={{ r: [8, 26, 8], fillOpacity: [0.4, 0, 0.4] }}
                          transition={{ duration: 2.6, repeat: Infinity, ease: "easeOut" }}
                        />
                      )}
                      {isActive && !c.sede && (
                        <motion.circle
                          cx={c.x} cy={c.y} r={14} fill="var(--color-paper)" fillOpacity="0.18"
                          initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.3 }}
                        />
                      )}
                      <motion.circle
                        cx={c.x} cy={c.y}
                        r={c.sede ? 5 : isActive ? 4 : 2.5}
                        fill={c.sede ? "var(--color-brand-soft)" : "var(--color-paper)"}
                        fillOpacity={c.sede ? 1 : isActive ? 1 : 0.7}
                        stroke={c.sede ? "var(--color-paper)" : "none"}
                        strokeWidth={c.sede ? 0.5 : 0}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={inView ? { scale: 1, opacity: 1 } : {}}
                        transition={{ duration: 0.4, delay: 1.2 + i * 0.03, ease: [0.22, 1, 0.36, 1] }}
                        style={{ cursor: "pointer", transition: "r 220ms cubic-bezier(.22,1,.36,1), fill-opacity 220ms" }}
                        onMouseEnter={() => setHovered(c)}
                        onMouseLeave={() => setHovered(null)}
                      />
                      {(c.sede || isActive) && (
                        <motion.text
                          x={c.x + 9} y={c.y + 4} fill="var(--color-paper)" fontSize="11"
                          fontFamily="var(--font-mono), monospace" fontWeight="500" letterSpacing="1"
                          initial={{ opacity: 0, x: c.x + 4 }} animate={{ opacity: 1, x: c.x + 9 }}
                          transition={{ duration: 0.25 }}
                        >{c.uf}</motion.text>
                      )}
                    </g>
                  );
                })}
              </svg>

              <div className="lg:hidden mt-4 flex items-center justify-center gap-6 font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-paper)]/50">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[color:var(--color-brand-soft)]" />
                  Sede SP
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--color-paper)]/60" />
                  Capitais
                </span>
              </div>
            </div>
          </Reveal>

          <div className="lg:sticky lg:top-32 space-y-8">
            <div className="grid grid-cols-2 gap-px bg-[color:var(--color-paper)]/10 border border-[color:var(--color-paper)]/10">
              <div className="bg-[color:var(--color-ink)] p-6">
                <div className="font-mono text-4xl lg:text-5xl tracking-tight text-[color:var(--color-paper)] leading-none">27</div>
                <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-paper)]/55">Estados cobertos</div>
              </div>
              <div className="bg-[color:var(--color-ink)] p-6">
                <div className="font-mono text-4xl lg:text-5xl tracking-tight text-[color:var(--color-paper)] leading-none">
                  100<span className="text-[color:var(--color-brand-soft)]">%</span>
                </div>
                <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-paper)]/55">Cobertura nacional</div>
              </div>
            </div>

            <motion.div
              key={active.uf}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="border border-[color:var(--color-paper)]/15 p-6 lg:p-8"
            >
              <div className="flex items-center justify-between mb-5">
                <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-[color:var(--color-brand-soft)]">
                  {active.sede ? "Sede" : "Atuação"}
                </div>
                <div className="font-mono text-[28px] tracking-tighter text-[color:var(--color-paper)] leading-none">{active.uf}</div>
              </div>
              <h3 className="font-serif text-2xl lg:text-3xl tracking-tight text-[color:var(--color-paper)] mb-2">{active.cidade}</h3>
              <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-[color:var(--color-paper)]/55">{active.nome}</div>
              <div className="mt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-paper)]/35">
                {active.lat.toFixed(2)}° · {active.lon.toFixed(2)}°
              </div>
              {active.sede && (
                <div className="mt-6 pt-5 border-t border-[color:var(--color-paper)]/15 text-[13px] leading-relaxed text-[color:var(--color-paper)]/70">
                  Reuniões presenciais com CFO em SP capital. Demais praças via parceria local + remoto.
                </div>
              )}
            </motion.div>

            <p className="text-[12px] leading-relaxed text-[color:var(--color-paper)]/45 max-w-sm">
              Passe o mouse pelas capitais para detalhar.
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}
