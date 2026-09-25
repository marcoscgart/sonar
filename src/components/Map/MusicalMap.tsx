'use client';

import React, { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import { UserArtist, DiscoveryCandidate, Artist } from '@/lib/types/sonar';
import { BackgroundGraphLayer } from './BackgroundGraphLayer';

interface MusicalMapProps {
  seeds: UserArtist[];
  discoveries: DiscoveryCandidate[];
  selectedArtistId: string | null;
  onSelectArtist: (artist: Artist, discoveryInfo?: DiscoveryCandidate) => void;
}

export const MusicalMap: React.FC<MusicalMapProps> = ({
  seeds,
  discoveries,
  selectedArtistId,
  onSelectArtist,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const [highlightKnown, setHighlightKnown] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    // Constrói nós e arestas do Cytoscape
    const elements: cytoscape.ElementDefinition[] = [];

    // Mapas para lookup rápido de candidatos
    const discoveryMap = new Map<string, DiscoveryCandidate>();
    discoveries.forEach((d) => discoveryMap.set(d.artist.id, d));

    // 1. Adiciona Nós de Artistas Semente (● Conhecidos/Curtidos) — sempre em primeiro plano
    seeds.forEach((seed) => {
      const isSelected = selectedArtistId === seed.artistId;
      const classes = ['seed-node'];
      if (isSelected) classes.push('selected-node');
      if (highlightKnown) classes.push('emphasized');
      elements.push({
        data: {
          id: seed.artistId,
          label: seed.artist.name,
          photo: seed.artist.imageUrl,
          type: 'seed',
          status: seed.status,
          artistObj: seed.artist,
        },
        classes: classes.join(' '),
      });
    });

    // 2. Adiciona Nós de Candidatos a Descoberta (○ Descobertas)
    // Profundidade visual (brilho/tamanho) mapeada diretamente ao Discovery Score
    discoveries.forEach((cand) => {
      const isSelected = selectedArtistId === cand.artist.id;
      elements.push({
        data: {
          id: cand.artist.id,
          label: cand.artist.name,
          photo: cand.artist.imageUrl,
          type: 'discovery',
          score: cand.score,
          artistObj: cand.artist,
          discoveryObj: cand,
        },
        classes: isSelected ? 'discovery-node selected-node' : 'discovery-node',
      });

      // Conecta o candidato às sementes correspondentes
      cand.reasons.forEach((reason) => {
        // Verifica se a semente existe no mapa atual
        const seedObj = seeds.find((s) => s.artistId === reason.seedArtistId);
        if (seedObj) {
          elements.push({
            data: {
              source: reason.seedArtistId,
              target: cand.artist.id,
              weight: reason.similarityScore,
              // Peso da semente (definido pela ordem no painel): sementes mais importantes
              // puxam suas descobertas pra mais perto de si no grafo (ver idealEdgeLength).
              seedImportance: seedObj.weight,
            },
          });
        }
      });
    });

    // Trava a borda esquerda do layout em 75% da largura do painel flutuante (w-96 = 384px),
    // então o fit nunca posiciona nós além desse ponto: no máximo 25% do painel fica coberto
    // pelo grafo, e os outros 75% ficam sempre só com o fundo. Em containers estreitos (mobile,
    // ou antes do 1º layout de fato assentar) isso invalidaria o box (x1 >= x2) e quebraria o
    // Cytoscape — por isso só aplicamos quando sobra espaço suficiente; senão usamos o padrão.
    const rect = containerRef.current.getBoundingClientRect();
    const FLOATING_PANEL_WIDTH = 384;
    const MIN_GRAPH_WIDTH = 200;
    const reserveLeft = FLOATING_PANEL_WIDTH * 0.75;
    const layoutBoundingBox =
      rect.width > reserveLeft + MIN_GRAPH_WIDTH && rect.height > 0
        ? { x1: reserveLeft, y1: 0, x2: rect.width, y2: rect.height }
        : undefined;

    // Inicializa o grafo Cytoscape
    const cy = cytoscape({
      container: containerRef.current,
      elements,
      style: [
        {
          selector: 'node',
          style: {
            label: 'data(label)',
            'font-size': '10px',
            'font-family': 'system-ui, sans-serif',
            'font-weight': 600,
            color: '#1f2024',
            'text-valign': 'bottom',
            'text-halign': 'center',
            'text-margin-y': 8,
            'text-background-opacity': 1,
            'text-background-color': '#ffffff',
            'text-background-padding': '3px',
            'text-background-shape': 'roundrectangle',
            'text-max-width': '86px',
            'text-wrap': 'ellipsis',
            'background-color': '#e4e6eb',
            'background-fit': 'cover',
            'background-clip': 'node',
            'border-width': 1.5,
            'border-color': '#c7cad1',
            'border-opacity': 1,
            'transition-property': 'background-color, border-color, border-width, width, height, opacity',
            'transition-duration': 300,
          },
        },
        // Usa a foto do artista como preenchimento do nó quando disponível
        {
          selector: 'node[photo]',
          style: {
            'background-image': 'data(photo)',
          },
        },
        // Regra 24: Sementes (●) — brilho máximo, sempre em primeiro plano
        {
          selector: 'node.seed-node',
          style: {
            width: 58,
            height: 58,
            'border-width': 2,
            'border-color': '#818cf8',
            opacity: 1,
            'z-index': 10,
          },
        },
        // Regra 24: Descobertas (○) — a profundidade é dada pelo BRILHO (opacidade) e tamanho,
        // proporcionais ao Discovery Score. Nada de sombra: nós "mais ao fundo" simplesmente
        // ficam mais claros/apagados, os "mais à frente" ficam nítidos.
        {
          selector: 'node.discovery-node',
          style: {
            width: 'mapData(score, 0.15, 0.98, 26, 50)',
            height: 'mapData(score, 0.15, 0.98, 26, 50)',
            // Cast: @types/cytoscape tipa opacity como number, mas a string mapData() é válida em runtime.
            opacity: 'mapData(score, 0.15, 0.98, 0.4, 1)' as unknown as number,
            'text-opacity': 'mapData(score, 0.15, 0.98, 0.45, 1)' as unknown as number,
            'border-width': 1.5,
            'border-color': '#c7cad1',
            'z-index': 5,
          },
        },
        // Filtro "Artistas Conhecidos" do painel Universo Musical: engrossa a borda das
        // sementes para evidenciá-las — os nós que não mudam são as descobertas (novos).
        {
          selector: 'node.seed-node.emphasized',
          style: {
            'border-width': 4,
            'border-color': '#4355f7',
          },
        },
        // Selecionado — apenas destaque de borda, sem crescer artificialmente a profundidade
        {
          selector: 'node.selected-node',
          style: {
            'border-width': 2.5,
            'border-color': '#4355f7',
            opacity: 1,
            'text-opacity': 1,
            'z-index': 20,
          },
        },
        // Arestas finas, sem glow — opacidade também acompanha a força da conexão
        {
          selector: 'edge',
          style: {
            width: 'mapData(weight, 0.4, 1.0, 0.75, 2)',
            'line-color': '#c3c6ce',
            'line-opacity': 'mapData(weight, 0.4, 1.0, 0.3, 0.8)' as unknown as number,
            'curve-style': 'bezier',
            'mid-target-arrow-shape': 'circle',
            'mid-target-arrow-color': '#9ca3af',
            'mid-target-arrow-fill': 'filled',
            'arrow-scale': 0.45,
            'target-arrow-shape': 'none',
          },
        },
      ],
      layout: {
        name: 'cose',
        // false: animate:true usa um loop via requestAnimationFrame que cy.destroy() não cancela (bug do cose 3.34.3), e um frame tardio quebra em endBatch() numa instância já destruída.
        animate: false,
        nodeRepulsion: () => 400,
        // Sementes mais importantes (peso maior, definido pela ordem no painel) puxam suas
        // descobertas pra mais perto de si: edge mais curta quanto maior o seedImportance.
        idealEdgeLength: (edge: cytoscape.EdgeSingular) => {
          const importance = edge.data('seedImportance') ?? 0.9;
          return 10 * (1.6 - 0.8 * importance);
        },
        edgeElasticity: () => 200,
        gravity: 1.5,
        nodeOverlap: 24,
        fit: true,
        // fit:true sempre escala o grafo pra preencher o container inteiro — reduzir
        // repulsão/idealEdgeLength só muda a forma relativa, não o quão "zoomado" ele
        // fica. Um padding grande é o que de fato encolhe o conjunto na tela. Precisa ser
        // relativo ao tamanho do container: em telas estreitas (mobile), um padding fixo
        // grande passa da própria largura disponível e quebra o fit (área negativa).
        padding: Math.max(20, Math.min(220, Math.min(rect.width, rect.height) * 0.3)),
        boundingBox: layoutBoundingBox,
        randomize: true,
      } as cytoscape.LayoutOptions,
    });

    // Movimento orgânico contínuo: cada nó deriva devagar pra uma posição vizinha aleatória,
    // em loop, tirando a sensação estática/flat do grafo. Usa cy.animate() (sistema de
    // animação "normal" do Cytoscape, que o render loop respeita e cy.stop()/destroy()
    // encerram de verdade — diferente do loop interno do layout cose, ver nota acima).
    const floatNode = (node: cytoscape.NodeSingular) => {
      if (cy.destroyed()) return;
      const pos = node.position();
      const drift = 16;
      node.animate(
        {
          position: {
            x: pos.x + (Math.random() - 0.5) * drift * 2,
            y: pos.y + (Math.random() - 0.5) * drift * 2,
          },
        },
        {
          duration: 3000 + Math.random() * 2500,
          easing: 'ease-in-out-sine',
          complete: () => floatNode(node),
        }
      );
    };
    const floatStartTimeouts: ReturnType<typeof setTimeout>[] = [];
    cy.nodes().forEach((node) => {
      // Início escalonado pra não sincronizar todo mundo no mesmo pulso
      floatStartTimeouts.push(setTimeout(() => floatNode(node), Math.random() * 3000));
    });

    // Clique no nó para focar e centralizar
    cy.on('tap', 'node', (evt) => {
      const node = evt.target;
      const artistObj = node.data('artistObj');
      const discoveryObj = node.data('discoveryObj');

      if (artistObj) {
        onSelectArtist(artistObj, discoveryObj);

        // Animação de foco no centro
        cy.animate(
          {
            center: { eles: node },
            zoom: 1.2,
          },
          { duration: 400 }
        );
      }
    });

    cyRef.current = cy;

    return () => {
      floatStartTimeouts.forEach((id) => clearTimeout(id));
      // Encerra a animação do layout antes de destruir; sem isso, um frame de
      // animação pendente pode chamar métodos internos numa instância já destruída.
      cy.stop();
      cy.destroy();
    };
    // selectedArtistId/highlightKnown ficam de fora de propósito: eles só mudam a
    // classe de nós já existentes (efeito abaixo), sem precisar destruir e reconstruir
    // todo o grafo — reconstruir a cada clique multiplicava o risco de um handler de
    // mouse antigo (Cytoscape registra alguns no window) disparar numa instância já
    // destruída, causando "Cannot read properties of null (reading 'isHeadless')".
  }, [seeds, discoveries, onSelectArtist]);

  // Atualiza seleção/destaque em cima do grafo já existente, sem recriar a instância.
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || cy.destroyed()) return;

    cy.batch(() => {
      cy.nodes('.selected-node').removeClass('selected-node');
      if (selectedArtistId) {
        cy.getElementById(selectedArtistId).addClass('selected-node');
      }
      cy.nodes('.seed-node').toggleClass('emphasized', highlightKnown);
    });
  }, [selectedArtistId, highlightKnown]);

  return (
    <div className="relative w-full h-full bg-gradient-to-b from-[#f6f7fa] to-[#eceef3] overflow-hidden">
      {/* Constelação decorativa atrás do grafo interativo — dá sensação de profundidade */}
      <BackgroundGraphLayer />

      {/* Contêiner Canvas do Cytoscape */}
      <div ref={containerRef} className="w-full h-full absolute inset-0 cursor-grab active:cursor-grabbing" />

      {/* Vinheta sutil — radial-gradient com elipse acompanha a proporção do container
          automaticamente, então se adapta a qualquer formato de tela sem JS. */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, transparent 45%, rgba(15,23,42,0.08) 100%)' }}
      />

      {/* Legenda do Mapa Musical — também funciona como filtro (clique em "Artistas Conhecidos") */}
      {/* No mobile o painel de busca ocupa top-left até 50dvh; a legenda vai pro rodapé direito pra não brigar por espaço (a faixa livre no topo direito é estreita demais). A partir do sm: volta pro canto superior direito. */}
      <div className="absolute bottom-4 right-4 sm:top-4 sm:bottom-auto z-10 bg-white/90 backdrop-blur-md p-3 rounded-2xl text-xs space-y-2 shadow-lg max-w-[calc(100vw-2rem)]">
        <div className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">
          Universo Musical
        </div>
        <button
          onClick={() => setHighlightKnown((v) => !v)}
          title="Clique para evidenciar os artistas conhecidos"
          className={`w-full flex items-center space-x-2 rounded-lg px-1.5 py-1 -mx-1.5 transition ${
            highlightKnown ? 'bg-indigo-50' : 'hover:bg-slate-50'
          }`}
        >
          <span
            className={`w-3 h-3 rounded-full bg-white inline-block ${
              highlightKnown ? 'border-2 border-indigo-500' : 'border border-indigo-400'
            }`}
          />
          <span className={highlightKnown ? 'font-semibold text-indigo-700' : 'text-slate-700'}>
            Artistas Conhecidos
          </span>
        </button>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full border border-slate-300 bg-slate-100 inline-block" />
          <span className="text-slate-700">Descobertas</span>
        </div>
        <div className="text-[10px] text-slate-400 pt-1.5 mt-1 border-t border-slate-100">
          Mais brilho = maior afinidade
        </div>
      </div>
    </div>
  );
};
