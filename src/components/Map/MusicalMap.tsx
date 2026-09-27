'use client';

import React, { useEffect, useRef } from 'react';
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
    const layoutPadding = Math.max(20, Math.min(220, Math.min(rect.width, rect.height) * 0.3));
    // Padding do fit FINAL (o que decide a escala em tela) — bem menor que o de layout acima.
    // Aquele é generoso de propósito pra dar espaço ao cose distribuir os nós; usá-lo também
    // aqui reservava até 30% da tela vazia nas bordas, deixando o cluster pequeno e sobrando
    // fundo escuro em volta. Um padding pequeno e fixo faz o grafo ocupar quase a tela toda
    // antes mesmo do zoom extra de 115% abaixo.
    const FIT_PADDING = 16;

    // Raio máximo (unidades do layout) que qualquer nó pode se afastar do centróide das
    // sementes. Sem isso, cose deixa descobertas com conexão fraca derivarem livremente
    // pela repulsão, inflando o bounding box — e como fit:true sempre reenquadra tudo, o
    // grafo inteiro encolhe (texto ilegível sem zoom) só para caber esses outliers.
    const MAX_RADIUS_FROM_CENTER = 260;
    let centroid = { x: 0, y: 0 };
    const clampToRadius = (pos: { x: number; y: number }) => {
      const dx = pos.x - centroid.x;
      const dy = pos.y - centroid.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= MAX_RADIUS_FROM_CENTER || dist === 0) return pos;
      const scale = MAX_RADIUS_FROM_CENTER / dist;
      return { x: centroid.x + dx * scale, y: centroid.y + dy * scale };
    };

    // Sobreposição máxima tolerada entre dois nós (fração do tamanho combinado) — 0 seria
    // "nunca encostar", 1 seria "pode cobrir por completo". Usado tanto no ajuste forte de
    // pós-layout quanto no drift orgânico contínuo abaixo.
    const MAX_OVERLAP_RATIO = 0.2;

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
        // ficam mais claros/apagados, os "mais à frente" ficam nítidos. Tamanho reduzido e piso
        // de opacidade mais alto (em vez de 26–50px / 0.4–1) — os nós de baixo da lista ficavam
        // grandes e esbranquiçados demais, brigando por espaço e legibilidade.
        {
          selector: 'node.discovery-node',
          style: {
            width: 'mapData(score, 0.15, 0.98, 22, 42)',
            height: 'mapData(score, 0.15, 0.98, 22, 42)',
            // Cast: @types/cytoscape tipa opacity como number, mas a string mapData() é válida em runtime.
            opacity: 'mapData(score, 0.15, 0.98, 0.65, 1)' as unknown as number,
            'text-opacity': 'mapData(score, 0.15, 0.98, 0.7, 1)' as unknown as number,
            'border-width': 1.5,
            'border-color': '#c7cad1',
            'z-index': 5,
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
        // fit desligado aqui: fazemos o fit manualmente depois de travar MAX_RADIUS_FROM_CENTER
        // (ver 'layoutstop' abaixo), senão o cose reenquadra com base no bounding box ainda
        // não clampado e o passo seguinte "pula" pra um zoom bem diferente.
        fit: false,
        padding: layoutPadding,
        boundingBox: layoutBoundingBox,
        randomize: true,
      } as cytoscape.LayoutOptions,
    });

    // Movimento orgânico contínuo: cada nó deriva devagar pra uma posição vizinha aleatória,
    // em loop, tirando a sensação estática/flat do grafo. Usa cy.animate() (sistema de
    // animação "normal" do Cytoscape, que o render loop respeita e cy.stop()/destroy()
    // encerram de verdade — diferente do loop interno do layout cose, ver nota acima).
    // Empurra um alvo de posição pra longe de qualquer nó que já esteja mais perto do que
    // MAX_OVERLAP_RATIO permite — usado a cada pulso do drift (abaixo) pra evitar que a
    // caminhada aleatória reintroduza aos poucos a sobreposição que o ajuste inicial corrigiu.
    // Unilateral (só o nó em questão se afasta, o vizinho fica parado): suficiente aqui porque
    // cada nó recalcula seu próprio alvo com frequência, então o sistema se autocorrige.
    const avoidOverlap = (node: cytoscape.NodeSingular, pos: { x: number; y: number }) => {
      let result = pos;
      cy.nodes().forEach((other) => {
        if (other.same(node)) return;
        const op = other.position();
        const dx = result.x - op.x;
        const dy = result.y - op.y;
        const dist = Math.hypot(dx, dy) || 0.01;
        const minDist = ((node.width() + other.width()) / 2) * (1 - MAX_OVERLAP_RATIO);
        if (dist < minDist) {
          const push = minDist - dist;
          const ux = dx / dist;
          const uy = dy / dist;
          result = clampToRadius({ x: result.x + ux * push, y: result.y + uy * push });
        }
      });
      return result;
    };

    const floatNode = (node: cytoscape.NodeSingular) => {
      if (cy.destroyed()) return;
      const pos = node.position();
      const drift = 16;
      const target = avoidOverlap(
        node,
        clampToRadius({
          x: pos.x + (Math.random() - 0.5) * drift * 2,
          y: pos.y + (Math.random() - 0.5) * drift * 2,
        })
      );
      node.animate(
        { position: target },
        {
          duration: 3000 + Math.random() * 2500,
          easing: 'ease-in-out-sine',
          complete: () => floatNode(node),
        }
      );
    };
    const floatStartTimeouts: ReturnType<typeof setTimeout>[] = [];

    // Com animate:false o cose roda de forma síncrona dentro do próprio construtor
    // cytoscape({...}) acima — 'layoutstop' já disparou antes desta linha, então tratamos
    // o pós-layout aqui direto (sem esperar por evento): calcula o centróide das sementes,
    // prende todo nó a no máximo MAX_RADIUS_FROM_CENTER dali, refaz o fit já com o bounding
    // box final e só então inicia o drift orgânico (que também respeita o mesmo raio, ver
    // floatNode acima).
    const seedNodes = cy.nodes('.seed-node');
    if (seedNodes.length > 0) {
      const sum = seedNodes.reduce(
        (acc, n) => {
          const p = n.position();
          return { x: acc.x + p.x, y: acc.y + p.y };
        },
        { x: 0, y: 0 }
      );
      centroid = { x: sum.x / seedNodes.length, y: sum.y / seedNodes.length };
    }

    // Separação por pares ANTES de qualquer clamp de raio: se a gente prender tudo a
    // MAX_RADIUS_FROM_CENTER primeiro, nós que o cose colocou na mesma direção (puxados pela
    // mesma semente forte) ficam espremidos no mesmo ponto do círculo, e sobra pouco arco pra
    // separar sem violar o raio — competindo com a própria separação. Deixando a separação
    // achar o espaço que precisa livremente primeiro, e só prendendo ao raio depois (como
    // rede de segurança pra outliers, não como meta de compactação), os dois deixam de brigar.
    const SEPARATION_ITERATIONS = 60;
    cy.batch(() => {
      for (let iter = 0; iter < SEPARATION_ITERATIONS; iter++) {
        let moved = false;
        const nodes = cy.nodes().toArray();
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const a = nodes[i];
            const b = nodes[j];
            const pa = a.position();
            const pb = b.position();
            const dx = pb.x - pa.x;
            const dy = pb.y - pa.y;
            const dist = Math.hypot(dx, dy) || 0.01;
            const minDist = ((a.width() + b.width()) / 2) * (1 - MAX_OVERLAP_RATIO);
            if (dist < minDist) {
              moved = true;
              const overlap = minDist - dist;
              const ux = dx / dist;
              const uy = dy / dist;
              a.position({ x: pa.x - (ux * overlap) / 2, y: pa.y - (uy * overlap) / 2 });
              b.position({ x: pb.x + (ux * overlap) / 2, y: pb.y + (uy * overlap) / 2 });
            }
          }
        }
        if (!moved) break;
      }
    });

    // Rede de segurança: só depois de resolvida a sobreposição, prende outliers que ainda
    // assim tenham sobrado muito longe do centróide (raio bem mais generoso do que antes —
    // não é mais o principal responsável pela compactação, só evita um nó isolado fugir demais).
    cy.batch(() => {
      cy.nodes().forEach((node) => {
        node.position(clampToRadius(node.position()));
      });
    });

    cy.fit(undefined, FIT_PADDING);

    // Pedido de produto: o grafo deve preencher 115% da tela (levemente cortado nas bordas)
    // em vez de só encostar nela — dá mais presença/imersão. Zoom extra centrado, por cima do
    // fit acima (que já resolveu o enquadramento "100%" correto, com padding mínimo).
    cy.zoom(cy.zoom() * 1.15);
    cy.center();

    cy.nodes().forEach((node) => {
      // Início escalonado pra não sincronizar todo mundo no mesmo pulso
      floatStartTimeouts.push(setTimeout(() => floatNode(node), Math.random() * 3000));
    });

    // Arrastar manualmente um nó interrompe o drift orgânico dele pra sempre: sem isso, o
    // node.animate() em loop do floatNode brigava com o arraste do usuário, fazendo o nó
    // "voltar sozinho" ou tremer em vez de ficar onde foi solto. stop() não dispara o
    // callback 'complete' do animate, então a cadeia de floatNode simplesmente para aqui.
    cy.on('grab', 'node', (evt) => {
      evt.target.stop();
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
    // selectedArtistId fica de fora de propósito: só muda a classe de um nó já existente
    // (efeito abaixo), sem precisar destruir e reconstruir todo o grafo — reconstruir a cada
    // clique multiplicava o risco de um handler de mouse antigo (Cytoscape registra alguns no
    // window) disparar numa instância já destruída, causando "Cannot read properties of null
    // (reading 'isHeadless')".
  }, [seeds, discoveries, onSelectArtist]);

  // Atualiza seleção em cima do grafo já existente, sem recriar a instância.
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || cy.destroyed()) return;

    cy.batch(() => {
      cy.nodes('.selected-node').removeClass('selected-node');
      if (selectedArtistId) {
        cy.getElementById(selectedArtistId).addClass('selected-node');
      }
    });
  }, [selectedArtistId]);

  return (
    <div className="relative w-full h-full bg-gradient-to-b from-[#12151c] to-[#0b0e14] overflow-hidden">
      {/* Constelação decorativa atrás do grafo interativo — dá sensação de profundidade */}
      <BackgroundGraphLayer />

      {/* Contêiner Canvas do Cytoscape */}
      <div ref={containerRef} className="w-full h-full absolute inset-0 cursor-grab active:cursor-grabbing" />

      {/* Vinheta sutil — radial-gradient com elipse acompanha a proporção do container
          automaticamente, então se adapta a qualquer formato de tela sem JS. */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.3) 100%)' }}
      />

    </div>
  );
};
