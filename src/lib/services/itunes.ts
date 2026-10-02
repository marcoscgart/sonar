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
 * primeiro resolve o artista (nome exato + gênero) e depois lista as músicas dele. Sorteia
 * entre as faixas retornadas pra cada seleção tocar uma diferente. Na dúvida, sem prévia é
 * melhor que prévia errada.
 */
export async function fetchArtistPreview(
  artistName: string,
  genreHints: string[] = []
): Promise<{ trackName: string; previewUrl: string } | undefined> {
  try {
    const artistRes = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(artistName)}&media=music&entity=musicArtist&limit=25`,
      { next: { revalidate: 86400 } }
    );
    if (!artistRes.ok) return undefined;
    const artistData: ITunesArtistResult = await artistRes.json();

    const wanted = normalizeName(artistName);
    const exact = (artistData.results || []).filter(
      (r) => r.artistId && r.artistName && normalizeName(r.artistName) === wanted
    );
    if (exact.length === 0) return undefined;

    const chosen =
      exact.find((r) => genreMatches(r.primaryGenreName, genreHints)) ||
      // Sem gênero conhecido pra comparar, só aceita se houver um único artista com o nome
      // escrito exatamente igual (mesma grafia e acentos); senão é ambíguo.
      (genreHints.length === 0 ? onlyOne(exact.filter((r) => r.artistName!.toLowerCase() === artistName.toLowerCase())) : undefined);
    if (!chosen) return undefined;

    const res = await fetch(
      `https://itunes.apple.com/lookup?id=${chosen.artistId}&entity=song&limit=15`,
      { next: { revalidate: 86400 } }
    );
    if (!res.ok) return undefined;

    const data: ITunesSearchResult = await res.json();
    const candidates = data.results?.filter((r) => r.previewUrl) || [];
    if (candidates.length === 0) return undefined;

    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    return { trackName: pick.trackName || artistName, previewUrl: pick.previewUrl! };
  } catch (e) {
    console.warn('Erro ao buscar prévia no iTunes:', e);
    return undefined;
  }
}
