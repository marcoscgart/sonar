// Garantir compatibilidade TLS no ambiente Windows / Node.js
if (typeof process !== 'undefined' && process.env) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const IGNORED_TAGS = new Set([
  'american', 'usa', 'english', 'british', 'uk', 'california',
  'united states', 'rock and indie', 'ambient', 'heavy', 'seen live', 'favorites',
  'albums i own', 'under 2000 listeners', 'favourite', 'all'
]);

export function normalizeTag(tag: string): string {
  return tag.toLowerCase().trim().replace(/[-_]/g, ' ');
}

/**
 * Busca as tags mais votadas da banda diretamente na página do Last.fm
 */
export async function fetchLastFmTags(artistName: string): Promise<string[]> {
  try {
    const url = `https://www.last.fm/music/${encodeURIComponent(artistName)}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      next: { revalidate: 86400 },
    });
    if (res.ok) {
      const html = await res.text();
      const matches = [...html.matchAll(/href="\/tag\/([^"]+)"/g)].map((m) =>
        decodeURIComponent(m[1]).replace(/\+/g, ' ').toLowerCase().trim()
      );
      return [...new Set(matches)].filter((t) => !IGNORED_TAGS.has(t));
    }
  } catch (e) {
    console.warn('Erro ao buscar tags no Last.fm:', e);
  }
  return [];
}

export interface MergedTagsResult {
  tags: string[];
  commonTags: string[];
}

/**
 * Cruza as tags do MusicBrainz e Last.fm:
 * - Tags presentes em ambos os serviços recebem prioridade máxima e aparecem primeiro.
 * - Tags únicas preenchem a lista logo depois.
 * - Limite estrito de até `maxTags` (padrão: 5).
 */
export function mergeAndRankTags(
  mbTags: string[],
  lastfmTags: string[],
  maxTags = 5
): MergedTagsResult {
  const cleanMb = mbTags
    .map((t) => t.trim())
    .filter((t) => !IGNORED_TAGS.has(t.toLowerCase()));

  const cleanLf = lastfmTags
    .map((t) => t.trim())
    .filter((t) => !IGNORED_TAGS.has(t.toLowerCase()));

  const common: string[] = [];
  const uniqueMb: string[] = [];
  const uniqueLf: string[] = [];
  const matchedLf = new Set<string>();

  for (const mbTag of cleanMb) {
    const mbNorm = normalizeTag(mbTag);
    // Verifica correspondência exata ou de radical
    const match = cleanLf.find((lfTag) => {
      const lfNorm = normalizeTag(lfTag);
      return lfNorm === mbNorm || (mbNorm.split(' ').includes(lfNorm) && lfNorm.length > 3);
    });

    if (match) {
      common.push(mbTag);
      matchedLf.add(match);
    } else {
      uniqueMb.push(mbTag);
    }
  }

  for (const lfTag of cleanLf) {
    if (!matchedLf.has(lfTag)) {
      uniqueLf.push(lfTag);
    }
  }

  // 1. Tags comuns aparecem primeiro
  const finalTags: string[] = [];
  const commonSet = new Set<string>();

  for (const t of common) {
    const lower = t.toLowerCase();
    if (!finalTags.some((ft) => ft.toLowerCase() === lower)) {
      finalTags.push(t);
      commonSet.add(lower);
    }
  }

  // 2. Tags únicas vêm depois (intercaladas entre MB e Last.fm)
  const maxUniques = Math.max(uniqueMb.length, uniqueLf.length);
  for (let i = 0; i < maxUniques; i++) {
    if (uniqueMb[i]) {
      const lower = uniqueMb[i].toLowerCase();
      if (!finalTags.some((ft) => ft.toLowerCase() === lower)) {
        finalTags.push(uniqueMb[i]);
      }
    }
    if (uniqueLf[i]) {
      const lower = uniqueLf[i].toLowerCase();
      if (!finalTags.some((ft) => ft.toLowerCase() === lower)) {
        finalTags.push(uniqueLf[i]);
      }
    }
  }

  return {
    tags: finalTags.slice(0, maxTags),
    commonTags: Array.from(commonSet),
  };
}
