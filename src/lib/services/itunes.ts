interface ITunesSearchResult {
  results: Array<{
    trackName?: string;
    artistName?: string;
    previewUrl?: string;
  }>;
}

/**
 * Busca uma prévia de 30s (MP3) de uma música do artista via iTunes Search API,
 * que é pública e não exige credenciais.
 */
export async function fetchArtistPreview(
  artistName: string
): Promise<{ trackName: string; previewUrl: string } | undefined> {
  try {
    const res = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(artistName)}&media=music&entity=song&limit=5`,
      { next: { revalidate: 86400 } }
    );
    if (!res.ok) return undefined;

    const data: ITunesSearchResult = await res.json();
    const match = data.results?.find((r) => r.previewUrl);
    if (!match?.previewUrl) return undefined;

    return { trackName: match.trackName || artistName, previewUrl: match.previewUrl };
  } catch (e) {
    console.warn('Erro ao buscar prévia no iTunes:', e);
    return undefined;
  }
}
