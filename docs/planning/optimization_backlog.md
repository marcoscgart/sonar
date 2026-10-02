# ⚙️ Backlog de Otimização e Confiabilidade — Sonar

Levantado na sessão de 2026-09-27, durante o trabalho de redesign mobile (tab bar, dark
mode) e correção de bugs de dados (bio/foto de artistas homônimos). Nenhum desses itens
quebra o app hoje, mas são riscos reais que tendem a aparecer conforme o tráfego cresce.

**Atualização 2026-10-02**: o hosting migrou de Netlify pra Vercel (o time Netlify "BFM"
esgotou os créditos do ciclo de faturamento e bloqueou deploys de produção). Projeto agora
em `https://sonar-musicdiscovery.vercel.app`, conectado ao GitHub pra deploy automático a
cada `git push` — não usa mais `netlify deploy`. Detalhes completos na memória do Claude
(`project_sonar_next_session.md`, seção "Hosting: migrated Netlify → Vercel").

---

## 1. ~~🔑 Chave do Last.fm é pública/compartilhada~~ — RESOLVIDO (2026-10-02)

Verificado: o usuário já tinha sua própria chave do Last.fm configurada no `.env.local`
local (não a chave demo pública hardcoded em [lastfm.ts](../../src/lib/services/lastfm.ts)),
e ela já foi configurada como `LASTFM_API_KEY` no ambiente de produção da Vercel durante a
migração. O rate limit observado nesta sessão veio de testes diretos via `curl` (sem a
variável de ambiente), não do uso real do app. Sem ação pendente aqui.

---

## 2. 🗄️ Nenhuma camada de cache própria — só o fetch cache do Next

Toda a cadeia (Last.fm → MusicBrainz → Deezer → Wikipedia/Wikidata → iTunes) depende
apenas de `next: { revalidate }` por chamada individual. Isso cacheia bem *a mesma
chamada exata repetida*, mas cada combinação nova de artistas/sementes é cache-miss total,
percorrendo a cadeia inteira de APIs externas do zero.

**Próximo passo sugerido**: avaliar uma camada própria (ex: tabela no Supabase já usado
pelo projeto, ou Vercel KV/Edge Config) pra resultados de artista por MBID — bio,
discografia, foto — com TTL longo (esses dados quase não mudam).

---

## 3. 🚦 Sem rate-limiting pro MusicBrainz (pede ~1 req/s por IP sem chave)

Várias chamadas ao MusicBrainz disparam em paralelo sem controle:
- `discoveryEngine.ts` → até 12 chamadas de `resolveArtistMatch` (adicionado nesta sessão)
  em `Promise.all`.
- `musicbrainz.ts` → `searchMusicBrainzArtists` também busca fotos de até 8 resultados em
  paralelo (Deezer, não MusicBrainz, mas mesmo padrão de rajada).

Sob uso de um usuário só isso raramente é problema (resultado cacheado 24h evita repetição),
mas sob uso concorrente real (vários usuários gerando descobertas ao mesmo tempo, todos
batendo o mesmo pool de IPs de saída da Vercel) arrisca respostas 503 do MusicBrainz.

**Próximo passo sugerido**: registrar um `MB_USER_AGENT` com contato real (já existe, ver
`USER_AGENT` em musicbrainz.ts) e considerar uma fila/throttle simples (ex: `p-limit` com
concorrência 1-2) especificamente pras chamadas ao `musicbrainz.org`.

---

## 4. 📦 Bundle inicial ~321kB (Cytoscape é a maior fatia)

Build reporta consistentemente (Netlify antes, Vercel agora, mesmo número):
```
┌ ○ /    219 kB    321 kB First Load JS
```
Não é alarmante, mas também não é leve — Cytoscape.js é a lib mais pesada carregada.

**Próximo passo sugerido**: considerar `next/dynamic` com `ssr:false` pro `MusicalMap`
(já é client-only e usa `window`/canvas), adiando o parse/exec do bundle do Cytoscape pra
depois do primeiro paint da UI (header, tab bar, painéis) — só avaliar depois de medir com
Lighthouse/DevTools se o ganho compensa a complexidade.

---

## 5. 🔗 Bug relacionado ainda não corrigido: prévia de áudio (iTunes) toca artista errado

Ver detalhe completo na memória do Claude (`project_sonar_next_session.md`,
seção "Bug: wrong audio preview"). Resumo: [itunes.ts](../../src/lib/services/itunes.ts)
`fetchArtistPreview` pega o primeiro resultado do iTunes Search com preview, sem checar se
`result.artistName` bate com o artista buscado — pra nomes comuns/ambíguos, toca música de
outro artista qualquer.

**Relação com o trabalho desta sessão**: é exatamente a mesma classe de bug corrigida hoje
pra biografia ([musicbrainz.ts](../../src/lib/services/musicbrainz.ts) `fetchBandBio`) e
pra foto/identidade dos nós de descoberta ([discoveryEngine.ts](../../src/lib/services/discoveryEngine.ts)
`resolveArtistMatch`) — ambigüidade de nome homônimo sem desambiguação. A correção de hoje
**não tocou em itunes.ts**; esse bug specific continua de pé.

**Próximo passo sugerido**: aplicar o mesmo princípio — filtrar `data.results` do iTunes
por `r.artistName` batendo (normalizado, ignorando acento/caixa) com o nome do artista
antes de aceitar qualquer preview; se nenhum bater, não mostrar prévia em vez de mostrar
uma errada.
