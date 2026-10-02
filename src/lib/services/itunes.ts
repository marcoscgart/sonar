interface ITunesSearchResult {
  results: Array<{
    trackName?: string;
    artistName?: string;
    previewUrl?: string;
  }>;
}

// Compara nomes sem acento/caixa/pontuação ("Cícero" == "cicero").
function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function onlyOne<T>(items: T[]): T | undefined {
  return items.length === 1 ? items[0] : undefined;
}

interface ITunesArtistResult {
  results: Array<{ artistId?: number; artistName?: string; primaryGenreName?: string }>;
}

// Nomes de artista se repetem muito no iTunes (há ~20 "Cicero"); o gênero do Sonar
// (MusicBrainz/Last.fm) desambigua: aceita o artista cujo gênero no iTunes bate com algum
// gênero/tag que já conhecemos.
function genreMatches(itunesGenre: string | undefined, hints: string[]): boolean {
  const g = normalizeName(itunesGenre || '');
  if (!g || g === 'none') return false;
  return hints.some((h) => {
    const n = normalizeName(h);
    if (!n) return false;
    // O iTunes agrupa punk/hardcore/grunge sob "Rock".
    if (g === 'rock' && /punk|hardcore|grunge/.test(n)) return true;
    return n.includes(g) || g.includes(n);
  });
}

/**
 * Busca uma prévia de 30s (MP3) de uma música do artista via iTunes Search API,
 * que é pública e não exige credenciais. Só toca faixas do ARTISTA pedido: a busca textual
 * do iTunes devolve músicas de outros artistas com o mesmo nome (ex: faixas "Cicero"), então
 * primeiro resolve o artista (nome exato + gênero) e depois lista as músicas dele. Devolve
 * as faixas em ordem aleatória (pra cada seleção começar por uma diferente e o player poder
 * passar pra próxima sozinho). Na dúvida, sem prévia é
 * melhor que prévia errada.
 */
export async function fetchArtistPreviews(
  artistName: string,
  genreHints: string[] = []
): Promise<Array<{ trackName: string; previewUrl: string }>> {
  try {
    const artistRes = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(artistName)}&media=music&entity=musicArtist&limit=25`,
      { next: { revalidate: 86400 } }
    );
    if (!artistRes.ok) return [];
    const artistData: ITunesArtistResult = await artistRes.json();

    const wanted = normalizeName(artistName);
    const exact = (artistData.results || []).filter(
      (r) => r.artistId && r.artistName && normalizeName(r.artistName) === wanted
    );
    if (exact.length === 0) return [];

    const chosen =
      exact.find((r) => genreMatches(r.primaryGenreName, genreHints)) ||
      // Sem gênero conhecido pra comparar, só aceita se houver um único artista com o nome
      // escrito exatamente igual (mesma grafia e acentos); senão é ambíguo.
      (genreHints.length === 0 ? onlyOne(exact.filter((r) => r.artistName!.toLowerCase() === artistName.toLowerCase())) : undefined);
    if (!chosen) return [];

    const res = await fetch(
      `https://itunes.apple.com/lookup?id=${chosen.artistId}&entity=song&limit=15`,
      { next: { revalidate: 86400 } }
    );
    if (!res.ok) return [];

    const data: ITunesSearchResult = await res.json();
    const candidates = data.results?.filter((r) => r.previewUrl) || [];

    // Embaralha (Fisher-Yates) e remove faixas repetidas (mesma música em vários álbuns).
    const seen = new Set<string>();
    const tracks = candidates
      .map((c) => ({ trackName: c.trackName || artistName, previewUrl: c.previewUrl! }))
      .filter((t) => {
        const key = normalizeName(t.trackName);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    for (let i = tracks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [tracks[i], tracks[j]] = [tracks[j], tracks[i]];
    }
    return tracks;
  } catch (e) {
    console.warn('Erro ao buscar prévia no iTunes:', e);
    return [];
  }
}
