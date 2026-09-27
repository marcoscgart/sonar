interface ITunesSearchResult {
  results: Array<{
    trackName?: string;
    artistName?: string;
    previewUrl?: string;
  }>;
}

/**
 * Busca uma prévia de 30s (MP3) de uma música do artista via iTunes Search API,
 * que é pública e não exige credenciais. Sorteia entre as top 10 músicas retornadas
 * (em vez de sempre pegar a primeira), pra cada seleção do artista tocar uma faixa diferente.
 */
export async function fetchArtistPreview(
  artistName: string
): Promise<{ trackName: string; previewUrl: string } | undefined> {
  try {
    const res = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(artistName)}&media=music&entity=song&limit=10`,
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
