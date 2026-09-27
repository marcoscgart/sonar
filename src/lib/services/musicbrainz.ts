import { Artist, Album } from '../types/sonar';
import { fetchLastFmTags, mergeAndRankTags } from './tagsEngine';

// Garantir compatibilidade TLS no ambiente Windows / Node.js
if (typeof process !== 'undefined' && process.env) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const USER_AGENT = 'SonarMusicDiscovery/1.0.0 ( contact@sonar.app )';

interface MBArtistSearchItem {
  id: string; // MBID
  name: string;
  country?: string;
  'life-span'?: {
    begin?: string;
  };
  score?: number;
  tags?: Array<{ count: number; name: string }>;
  genres?: Array<{ count: number; name: string }>;
  disambiguation?: string;
}

function normalizeForCompare(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

export interface ArtistMatchContext {
  country?: string | null;
  genres?: string[];
  tags?: string[];
}

export interface ResolvedArtistMatch {
  mbid: string;
  name: string;
  country: string | null;
  genres: string[];
  tags: string[];
}

/**
 * Resolve o MBID mais provável pra um nome de artista vindo de uma fonte sem ID (o
 * artist.getsimilar do Last.fm quase sempre omite mbid) usando o contexto do artista-semente
 * que originou a recomendação (país e gêneros) pra desempatar entre homônimos — ex: "Cícero"
 * tem pelo menos 6 entradas diferentes cadastradas no MusicBrainz (o cantor brasileiro, um
 * trio de hip hop americano, um pianista de jazz romeno, um cantor alemão...). Sem isso, o nó
 * de descoberta ficava com a foto (e, se clicado, os dados) de um homônimo qualquer.
 *
 * Comparação de nome ignora acentos (normalizeForCompare) porque a fonte às vezes manda o nome
 * sem diacríticos ("Cicero" em vez de "Cícero") — sem isso o candidato certo nem entraria no
 * desempate por ficar de fora do filtro de "nome exato".
 *
 * Barra de aceitação: exige nome exato. Se houver MAIS DE UM homônimo exato, exige também país
 * ou gênero/tag em comum com o artista-semente — sem nenhum sinal de desambiguação, prefere não
 * resolver a arriscar escolher o homônimo errado com aparência de certeza.
 */
export async function resolveArtistMatch(
  name: string,
  context: ArtistMatchContext
): Promise<ResolvedArtistMatch | null> {
  try {
    const url = `https://musicbrainz.org/ws/2/artist/?query=${encodeURIComponent(name)}&fmt=json&limit=8`;
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;

    const data = await res.json();
    const items: MBArtistSearchItem[] = data.artists || [];
    if (items.length === 0) return null;

    const normalizedQuery = normalizeForCompare(name);
    const exactMatches = items.filter((item) => normalizeForCompare(item.name) === normalizedQuery);
    if (exactMatches.length === 0) return null;

    let best = exactMatches[0];

    if (exactMatches.length > 1) {
      const contextSignals = new Set(
        [...(context.genres || []), ...(context.tags || [])].map((g) => g.toLowerCase())
      );

      const scored = exactMatches.map((item) => {
        const countryMatch = !!context.country && item.country === context.country;
        const itemSignals = [
          ...(item.genres || []).map((g) => g.name),
          ...(item.tags || []).map((t) => t.name),
        ].map((g) => g.toLowerCase());
        const genreOverlap = itemSignals.some((g) => contextSignals.has(g));
        const confidence = (countryMatch ? 2 : 0) + (genreOverlap ? 1 : 0) + (item.score || 0) / 100;
        return { item, countryMatch, genreOverlap, confidence };
      });

      scored.sort((a, b) => b.confidence - a.confidence);

      if (!scored[0].countryMatch && !scored[0].genreOverlap) return null;

      best = scored[0].item;
    }

    return {
      mbid: best.id,
      name: best.name,
      country: best.country || null,
      genres: (best.genres || []).slice(0, 5).map((g) => g.name),
      tags: (best.tags || []).slice(0, 6).map((t) => t.name),
    };
  } catch (e) {
    console.warn('Erro ao resolver identidade do artista de descoberta:', e);
    return null;
  }
}

/**
 * Busca a foto oficial da banda ou artista em alta resolução (Deezer CDN)
 */
export async function fetchArtistImage(name: string): Promise<string | undefined> {
  try {
    const res = await fetch(
      `https://api.deezer.com/search/artist?q=${encodeURIComponent(name)}&limit=1`,
      { next: { revalidate: 86400 } }
    );
    if (res.ok) {
      const data = await res.json();
      const first = data.data?.[0];
      return first?.picture_big || first?.picture_medium;
    }
  } catch (e) {
    console.warn('Erro ao buscar foto do artista:', e);
  }
  return undefined;
}

// Extrai host + título de uma URL de página da Wikipedia (ex: "https://pt.wikipedia.org/wiki/C%C3%ADcero_(m%C3%BAsico)"
// -> { host: 'pt.wikipedia.org', title: 'Cícero_(músico)' }), pra chamar a REST summary API certa.
function parseWikipediaUrl(url: string): { host: string; title: string } | null {
  try {
    const parsed = new URL(url);
    const title = decodeURIComponent(parsed.pathname.replace(/^\/wiki\//, ''));
    if (!title) return null;
    return { host: parsed.hostname, title };
  } catch {
    return null;
  }
}

async function fetchWikipediaSummary(host: string, title: string): Promise<string | undefined> {
  try {
    const res = await fetch(
      `https://${host}/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
      { headers: { 'User-Agent': USER_AGENT } }
    );
    if (res.ok) {
      const data = await res.json();
      if (data.extract) return data.extract;
    }
  } catch (e) {
    console.warn(`Erro ao buscar biografia em ${host}:`, e);
  }
  return undefined;
}

// Extrai o Q-id de uma URL do Wikidata (ex: "https://www.wikidata.org/wiki/Q10263173" -> "Q10263173").
function parseWikidataId(url: string): string | null {
  const match = url.match(/Q\d+/);
  return match ? match[0] : null;
}

// Prioridade de idioma pros sitelinks do Wikidata: português primeiro (UI do Sonar é pt-BR,
// e artistas brasileiros/lusófonos têm cobertura melhor lá), depois inglês, depois qualquer
// outro Wikipedia disponível (não wikcionário/wikivoyage/etc.).
async function fetchBioViaWikidata(wikidataUrl: string): Promise<string | undefined> {
  const qid = parseWikidataId(wikidataUrl);
  if (!qid) return undefined;

  try {
    const res = await fetch(`https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`, {
      headers: { 'User-Agent': USER_AGENT },
    });
    if (!res.ok) return undefined;

    const data = await res.json();
    const sitelinks = data.entities?.[qid]?.sitelinks || {};
    const langPriority = ['ptwiki', 'enwiki'];
    const wikiKeys = Object.keys(sitelinks).filter((k) => /^[a-z]+wiki$/.test(k));
    const orderedKeys = [
      ...langPriority.filter((k) => wikiKeys.includes(k)),
      ...wikiKeys.filter((k) => !langPriority.includes(k)),
    ];

    for (const key of orderedKeys) {
      const lang = key.replace(/wiki$/, '');
      const host = lang === 'en' ? 'en.wikipedia.org' : `${lang}.wikipedia.org`;
      const summary = await fetchWikipediaSummary(host, sitelinks[key].title);
      if (summary) return summary;
    }
  } catch (e) {
    console.warn('Erro ao buscar biografia via Wikidata:', e);
  }
  return undefined;
}

/**
 * Busca a biografia editorial da banda (Wikipedia / Last.fm)
 * @param wikipediaUrl Link da Wikipedia já vinculado ao artista no MusicBrainz (por MBID).
 * @param wikidataUrl Link do Wikidata já vinculado ao artista no MusicBrainz — usado quando não
 * há relation direta de Wikipedia (comum), seguindo os sitelinks até a página certa.
 * Ambos, quando disponíveis, são usados ANTES de qualquer busca por nome — nomes comuns (ex:
 * "Cícero", "Wings", "Genesis") colidem com outras entradas na Wikipedia (o orador romano Marco
 * Túlio Cícero, a banda de Paul McCartney, o livro bíblico) e uma busca cega pelo nome do artista
 * pode trazer a biografia de uma entidade completamente diferente mesmo quando o restante dos
 * dados (foto, discografia, país) já está correto.
 */
export async function fetchBandBio(
  name: string,
  wikipediaUrl?: string,
  wikidataUrl?: string
): Promise<string | undefined> {
  if (wikipediaUrl) {
    const target = parseWikipediaUrl(wikipediaUrl);
    if (target) {
      const summary = await fetchWikipediaSummary(target.host, target.title);
      if (summary) return summary;
    }
  }

  if (wikidataUrl) {
    const summary = await fetchBioViaWikidata(wikidataUrl);
    if (summary) return summary;
  }

  // 1. Tenta Wikipedia com _(band) para não confundir com termos comuns (ex: Neurosis, Mastodon, Baroness)
  try {
    let res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name + '_(band)')}`,
      { headers: { 'User-Agent': USER_AGENT } }
    );
    if (!res.ok) {
      res = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`,
        { headers: { 'User-Agent': USER_AGENT } }
      );
    }
    if (res.ok) {
      const data = await res.json();
      if (data.extract) {
        return data.extract;
      }
    }
  } catch (e) {
    console.warn('Erro ao buscar biografia na Wikipedia:', e);
  }

  // 2. Fallback para Last.fm
  try {
    const res = await fetch(
      `https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${encodeURIComponent(
        name
      )}&api_key=b25b959554ed76058ac220b7b2e0a026&format=json`
    );
    if (res.ok) {
      const data = await res.json();
      let summary = data.artist?.bio?.summary || '';
      summary = summary.replace(/<[^>]*>/g, '').trim();
      summary = summary.replace(/^[0-9]+\)\s*/, '').trim();
      summary = summary.replace(/Read more on Last\.fm.*$/i, '').trim();
      if (summary) return summary;
    }
  } catch (e) {
    // ignore
  }

  return undefined;
}

/**
 * Normaliza país e ano para o formato aprovado no Sonar.txt:
 * ex: "United Kingdom, 1985" ou "United States, 1994"
 */
export function formatCountryAndYear(country?: string | null, formedYear?: number | null): string {
  const parts: string[] = [];
  if (country) parts.push(country);
  if (formedYear) parts.push(formedYear.toString());
  return parts.length > 0 ? parts.join(', ') : 'Desconhecido';
}

/**
 * Busca artistas na API do MusicBrainz por nome com fallback para iTunes
 */
export async function searchMusicBrainzArtists(query: string): Promise<Artist[]> {
  if (!query || query.trim().length < 2) return [];

  const cleanQuery = query.trim();

  // 1. Tenta buscar no MusicBrainz
  try {
    const url = `https://musicbrainz.org/ws/2/artist/?query=${encodeURIComponent(
      cleanQuery
    )}&fmt=json&limit=10`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
      },
      next: { revalidate: 3600 },
    });

    if (res.ok) {
      const data = await res.json();
      const items: MBArtistSearchItem[] = data.artists || [];

      if (items.length > 0) {
        // Ordena para que o match exato venha em primeiro lugar
        items.sort((a, b) => {
          const aExact = a.name.toLowerCase() === cleanQuery.toLowerCase() ? 2 : (a.name.toLowerCase().startsWith(cleanQuery.toLowerCase()) ? 1 : 0);
          const bExact = b.name.toLowerCase() === cleanQuery.toLowerCase() ? 2 : (b.name.toLowerCase().startsWith(cleanQuery.toLowerCase()) ? 1 : 0);
          return bExact - aExact;
        });

        // Desduplica por nome (priorizando o que tem país ou desambiguação)
        const seenNames = new Set<string>();
        const uniqueItems: MBArtistSearchItem[] = [];
        for (const item of items) {
          const key = item.name.toLowerCase().trim();
          if (!seenNames.has(key)) {
            seenNames.add(key);
            uniqueItems.push(item);
          }
        }

        const topArtists = uniqueItems.slice(0, 8);
        const ignoredTags = new Set(['american', 'usa', 'english', 'british', 'uk', 'california', 'united states']);

        // Busca fotos das bandas em paralelo
        const artistsWithPhotos = await Promise.all(
          topArtists.map(async (item) => {
            const year = item['life-span']?.begin
              ? parseInt(item['life-span'].begin.slice(0, 4), 10)
              : null;

            const genres = (item.genres || []).slice(0, 5).map((g) => g.name);
            
            // Ordenar tags por relevância (votos/count) e filtrar termos geográficos
            const sortedTags = (item.tags || [])
              .filter((t) => !ignoredTags.has(t.name.toLowerCase()))
              .sort((a, b) => b.count - a.count)
              .map((t) => t.name);

            const photoUrl = await fetchArtistImage(item.name);

            return {
              id: item.id,
              name: item.name,
              country: item.country || null,
              formed: isNaN(year!) ? null : year,
              genres: genres.length > 0 ? genres : (sortedTags.length > 0 ? sortedTags.slice(0, 3) : ['Metal']),
              tags: sortedTags.length > 0 ? sortedTags.slice(0, 6) : ['Música'],
              similarArtists: [],
              identity: {
                musicbrainzId: item.id,
              },
              discography: [],
              bioSummary: item.disambiguation || undefined,
              imageUrl: photoUrl,
            };
          })
        );

        return artistsWithPhotos;
      }
    }
  } catch (error) {
    console.warn('MusicBrainz search attempt failed, trying iTunes fallback:', error);
  }

  // 2. Fallback de alta disponibilidade: iTunes Search API
  try {
    const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(
      cleanQuery
    )}&entity=musicArtist&limit=10`;

    const itunesRes = await fetch(itunesUrl);
    if (itunesRes.ok) {
      const itunesData = await itunesRes.json();
      const results = itunesData.results || [];

      return await Promise.all(
        results.slice(0, 6).map(async (item: any) => {
          const photoUrl = await fetchArtistImage(item.artistName);
          return {
            id: `itunes-${item.artistId}`,
            name: item.artistName,
            country: null,
            formed: null,
            genres: item.primaryGenreName ? [item.primaryGenreName] : ['Rock'],
            tags: [item.primaryGenreName || 'Música'],
            similarArtists: [],
            identity: {
              spotifyId: item.artistId?.toString(),
            },
            discography: [],
            imageUrl: photoUrl,
          };
        })
      );
    }
  } catch (err) {
    console.error('All artist search providers failed:', err);
  }

  return [];
}

/**
 * Obtém detalhes completos do artista e sua discografia ordenada em ordem cronológica inversa
 */
export async function getMusicBrainzArtistDetails(mbid: string): Promise<Partial<Artist>> {
  // Se for um ID do fallback iTunes
  if (mbid.startsWith('itunes-')) {
    const itunesId = mbid.replace('itunes-', '');
    try {
      const res = await fetch(`https://itunes.apple.com/lookup?id=${itunesId}&entity=album&limit=25`);
      if (res.ok) {
        const data = await res.json();
        const albumsRaw = (data.results || []).filter((r: any) => r.wrapperType === 'collection');
        const artistName = (data.results || [])[0]?.artistName || '';
        const [photoUrl, bio] = await Promise.all([
          artistName ? fetchArtistImage(artistName) : undefined,
          artistName ? fetchBandBio(artistName) : undefined,
        ]);
        
        const discography: Album[] = albumsRaw
          .map((a: any) => ({
            id: a.collectionId?.toString(),
            title: a.collectionName,
            year: parseInt(a.releaseDate?.slice(0, 4), 10),
            type: 'Album' as const,
            coverUrl: a.artworkUrl100?.replace('100x100bb', '300x300bb'),
          }))
          .filter((a: Album) => !isNaN(a.year))
          .sort((a: Album, b: Album) => b.year - a.year);

        return {
          id: mbid,
          name: artistName,
          discography,
          imageUrl: photoUrl,
          bioSummary: bio,
        };
      }
    } catch (e) {
      console.error('Error fetching iTunes discography:', e);
    }
    return { id: mbid, discography: [] };
  }

  // Busca detalhes no MusicBrainz
  try {
    const url = `https://musicbrainz.org/ws/2/artist/${mbid}?inc=genres+tags+release-groups+url-rels&fmt=json`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
      },
      next: { revalidate: 86400 },
    });

    if (!res.ok) return {};

    const data = await res.json();

    const formedYear = data['life-span']?.begin
      ? parseInt(data['life-span'].begin.slice(0, 4), 10)
      : null;

    const rawReleaseGroups = data['release-groups'] || [];
    const albumsMap = new Map<string, Album>();

    rawReleaseGroups.forEach((rg: any) => {
      const primaryType = rg['primary-type'];
      const firstReleaseDate = rg['first-release-date'];
      if (!firstReleaseDate || (primaryType !== 'Album' && primaryType !== 'EP')) return;

      const year = parseInt(firstReleaseDate.slice(0, 4), 10);
      if (isNaN(year)) return;

      const titleClean = rg.title.trim();
      if (!albumsMap.has(titleClean)) {
        albumsMap.set(titleClean, {
          id: rg.id,
          title: titleClean,
          year,
          type: primaryType,
          coverUrl: `https://coverartarchive.org/release-group/${rg.id}/front-250`,
        });
      }
    });

    // Regra do Sonar.txt Seção 10: Discografia em ORDEM CRONOLÓGICA INVERSA
    const sortedAlbums = Array.from(albumsMap.values()).sort(
      (a, b) => b.year - a.year
    );

    const ignoredTags = new Set(['american', 'usa', 'english', 'british', 'uk', 'california', 'united states']);
    const sortedTags = (data.tags || [])
      .filter((t: any) => !ignoredTags.has(t.name.toLowerCase()))
      .sort((a: any, b: any) => b.count - a.count)
      .map((t: any) => t.name);

    const genres = (data.genres || []).map((g: any) => g.name);

    // Link da Wikipedia (raro) e/ou do Wikidata (comum) já vinculados a ESTE mbid pelo
    // MusicBrainz, se existirem — evita que fetchBandBio precise adivinhar a página certa só
    // pelo nome (ver comentário na função).
    const relations = data.relations || [];
    const wikipediaUrl = relations.find((r: any) => r.type === 'wikipedia' && r.url?.resource)?.url
      ?.resource;
    const wikidataUrl = relations.find((r: any) => r.type === 'wikidata' && r.url?.resource)?.url
      ?.resource;

    // Busca foto, biografia e tags do Last.fm em paralelo
    const [photoUrl, bio, lastfmTags] = await Promise.all([
      fetchArtistImage(data.name),
      fetchBandBio(data.name, wikipediaUrl, wikidataUrl),
      fetchLastFmTags(data.name),
    ]);

    // Aplica regra de consenso: tags comuns aos dois serviços vêm primeiro (limite de 5)
    const { tags: finalTags, commonTags } = mergeAndRankTags(sortedTags, lastfmTags, 5);

    return {
      id: data.id,
      name: data.name,
      country: data.country || null,
      formed: isNaN(formedYear!) ? null : formedYear,
      genres: genres.length > 0 ? genres : finalTags.slice(0, 3),
      tags: finalTags,
      commonTags: commonTags,
      discography: sortedAlbums,
      identity: {
        musicbrainzId: data.id,
      },
      imageUrl: photoUrl,
      bioSummary: bio || data.disambiguation || undefined,
    };
  } catch (error) {
    console.error('Error fetching MB artist details:', error);
    return {};
  }
}
