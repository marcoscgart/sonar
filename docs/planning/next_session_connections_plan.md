# 🗺️ Planejamento: Conexões entre Bandas e Desduplicação no Universo Sonar

## 1. 🔍 Diagnóstico do Problema Observado
Na imagem enviada pelo usuário com o perfil contendo **Neurosis** e **Isis**:
1. **Banda Isis Duplicada**:
   - Aparece como **Nó Semente (Azul)** e simultaneamente como **Nó de Descoberta (Roxo)**.
   - **Causa raiz**: O motor de descoberta (`discoveryEngine.ts`) verificava se o candidato era semente comparando apenas contra o `seedArtist` da iteração atual ou via `knownIds` contendo apenas MBIDs (UUIDs do MusicBrainz). Como o Last.fm retorna IDs em texto (`"isis"`), a checagem falhou e não reconheceu que a banda "Isis" já estava no perfil como semente.
2. **Nós Candidatos Duplicados (Ilhas Isoladas)**:
   - Bandas como **Cult of Luna**, **Rosetta** e **Old Man Gloom** aparecem duplicadas (um nó ligado a Neurosis e outro nó ligado a Isis) em vez de formar uma rede integrada com um único nó ligado a ambos os polos.
3. **Ausência de Conexão Semente ↔ Semente**:
   - Neurosis e Isis compartilham o mesmo núcleo de subgêneros (*sludge metal*, *post-metal*), mas seus nós azuis estão desconectados, parecendo dois universos independentes.

---

## 2. 🎯 Objetivos para a Próxima Sessão

### A. Desduplicação e Unificação Canônica de Nós
- **Normalização por Nome Canônico e MBID**:
  - Criar um índice canônico (`canonicalKey = normalize(name)`) para todas as sementes e candidatos.
  - Se uma banda já for semente (nó azul), ela **nunca** poderá ser instanciada como candidato (nó roxo).
  - Se duas sementes recomendam o mesmo candidato (ex: *Cult of Luna*), o grafo deve ter **apenas 1 nó** para essa banda, com duas arestas (uma para Neurosis e outra para Isis).

### B. Conexão Direta entre Bandas Semente (Semente ↔ Semente)
- Quando o usuário adiciona duas ou mais bandas ao perfil:
  - Comparar as tags e subgêneros de ambas (usando o `tagsEngine.ts`).
  - Se compartilharem tags de consenso (ex: *sludge metal*, *post-metal*), criar uma **aresta direta** entre os dois nós azuis (Neurosis ↔ Isis).
  - A espessura/peso da aresta representará a afinidade (número de tags comuns).

### C. Visualização das Ligações pelas Tags no Grafo
- Ao passar o mouse (hover) ou clicar na aresta/nó:
  - Exibir tooltip ou painel de conexão: *"Conectados por: #sludge metal, #post-metal"*.
  - No card de detalhes da descoberta, destacar explicitamente:
    - *"Recomendado por Neurosis e Isis por afinidade em [Tags em Comum]"*.

### D. Puxar Informações Completas ao Clicar em Qualquer Nó (Descoberta ou Semente)
- **Comportamento Atual**: O card lateral busca dados via MBID. Candidatos descobertos do Last.fm que chegam sem MBID ficam sem biografia, discografia reversa ou tags detalhadas.
- **Melhoria para a Próxima Sessão**:
  - Ao clicar em **qualquer nó do grafo** (seja semente ou descoberta), o sistema deve abrir o card e disparar a busca detalhada completa:
    1. Se tiver MBID: consulta direta `/api/artists/[mbid]`.
    2. Se não tiver MBID inicial: rota com fallback inteligente por nome (resolvendo o MBID em tempo real no MusicBrainz/iTunes) para puxar biografia, discografia cronológica reversa, capas de álbuns, tags de consenso e país/ano.
  - Garantir a mesma experiência rica tanto para as bandas da lista lateral quanto para qualquer nó clicado no grafo.

---

## 3. 🛠️ Arquivos a Serem Modificados na Próxima Sessão
1. `src/lib/services/discoveryEngine.ts`:
   - Enriquecer o filtro de exclusão com conjunto global de nomes normalizados de sementes (`seedNamesSet`).
   - Unificar geração de chaves canônicas para candidatos.
2. `src/lib/services/affinityEngine.ts` (novo módulo):
   - Calcular similaridade/conexão de tags entre as próprias sementes cadastradas.
3. `src/components/Map/MusicalMap.tsx`:
   - Desduplicação no carregamento de nós Cytoscape.
   - Inclusão de arestas `seed ↔ seed` (com estilo diferenciado, ex: linha sólida sutil e brilhante).
   - Tooltip interativo nas arestas mostrando as tags compartilhadas que formaram a ponte.
