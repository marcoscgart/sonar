'use client';

import React from 'react';

/**
 * Camada decorativa atrás do grafo interativo: uma constelação "fantasma" (nós e partículas
 * menores flutuando) que dá sensação de profundidade/universo maior, inspirada na referência
 * salva em .agents/skills/sonar-music-engine/references/background-graph-reference.webp.
 *
 * Propositalmente NÃO usa Cytoscape (seria uma 2ª instância de física/renderização, pesado à
 * toa pra algo puramente decorativo) — é SVG + CSS puro, sem JS rodando por frame.
 *
 * Posições vêm de uma função pseudo-aleatória DETERMINÍSTICA (mesma seed = mesmo valor sempre),
 * não Math.random() em render — evita divergir entre servidor e cliente na hidratação.
 */

// Hash determinístico clássico (seno + parte fracionária): mesmo seed => mesmo valor. Math.sin()
// pode divergir em casas decimais bem distantes entre o motor JS do servidor e do navegador —
// por isso todo resultado passa por round() antes de virar atributo (ver uso abaixo), senão o
// HTML gerado no servidor diverge do cliente por 1 dígito e quebra a hidratação.
const pseudoRandom = (seed: number) => {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

const round = (n: number, decimals = 2) => Math.round(n * 10 ** decimals) / 10 ** decimals;

const GHOST_NODE_COUNT = 24;
const PARTICLE_COUNT = 32;

interface GhostNode {
  x: number;
  y: number;
  size: number;
  driftX: number;
  driftY: number;
  duration: number;
  delay: number;
}

const GHOST_NODES: GhostNode[] = Array.from({ length: GHOST_NODE_COUNT }, (_, i) => {
  const x = round(4 + pseudoRandom(i * 7.13 + 1) * 92);
  const y = round(6 + pseudoRandom(i * 13.37 + 2) * 88);
  const size = round(3.5 + pseudoRandom(i * 3.91 + 3) * 2.8); // ~30% menor que a versão anterior (5–9)
  const driftX = round((pseudoRandom(i * 5.21 + 4) - 0.5) * 18);
  const driftY = round((pseudoRandom(i * 9.77 + 5) - 0.5) * 18);
  const duration = round(10 + pseudoRandom(i * 2.63 + 6) * 6, 1);
  const delay = round(pseudoRandom(i * 4.19 + 7) * 3, 1);
  return { x, y, size, driftX, driftY, duration, delay };
});

// Malha esparsa: cada nó conecta ao próximo (cadeia cruzando o canvas) + algumas conexões
// "pulando" 4 nós, pra parecer rede em vez de um colar de contas.
const GHOST_EDGES: [number, number][] = [
  ...Array.from({ length: GHOST_NODE_COUNT - 1 }, (_, i) => [i, i + 1] as [number, number]),
  ...Array.from({ length: GHOST_NODE_COUNT - 4 }, (_, i) => [i, i + 4] as [number, number]).filter(
    (_, i) => i % 2 === 0
  ),
];

interface Particle {
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  driftX: number;
  driftY: number;
}

const PARTICLES: Particle[] = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
  x: round(pseudoRandom(i * 6.47 + 11) * 97),
  y: round(pseudoRandom(i * 11.91 + 12) * 94),
  size: round(1 + pseudoRandom(i * 2.17 + 13) * 1.7), // ~30% menor que a versão anterior (1.5–3.9)
  duration: round(9 + pseudoRandom(i * 3.53 + 14) * 8, 1),
  delay: round(pseudoRandom(i * 4.87 + 15) * 3.5, 1),
  driftX: round((pseudoRandom(i * 6.71 + 16) - 0.5) * 16),
  driftY: round((pseudoRandom(i * 8.29 + 17) - 0.5) * 16),
}));

export const BackgroundGraphLayer: React.FC = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <svg className="w-full h-full" preserveAspectRatio="none">
        {GHOST_EDGES.map(([a, b], i) => {
          const na = GHOST_NODES[a];
          const nb = GHOST_NODES[b];
          return (
            <line
              key={i}
              x1={`${na.x}%`}
              y1={`${na.y}%`}
              x2={`${nb.x}%`}
              y2={`${nb.y}%`}
              stroke="#94a3b8"
              strokeWidth={1}
              opacity={0.07}
            />
          );
        })}
        {GHOST_NODES.map((n, i) => (
          <circle
            key={i}
            cx={`${n.x}%`}
            cy={`${n.y}%`}
            r={n.size}
            fill="#94a3b8"
            opacity={0.14}
            className="animate-bg-float"
            style={
              {
                '--float-x': `${n.driftX}px`,
                '--float-y': `${n.driftY}px`,
                animationDuration: `${n.duration}s`,
                animationDelay: `${n.delay}s`,
                transformOrigin: 'center',
              } as React.CSSProperties
            }
          />
        ))}
      </svg>
      {PARTICLES.map((p, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-slate-400 animate-bg-float"
          style={
            {
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.size,
              opacity: 0.11,
              '--float-x': `${p.driftX}px`,
              '--float-y': `${p.driftY}px`,
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
};
