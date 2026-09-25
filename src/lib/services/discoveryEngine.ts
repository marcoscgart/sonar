import { UserArtist, DiscoveryCandidate, DiscoveryReason, Artist } from '../types/sonar';
import { fetchLastFmSimilarArtists, isJunkArtist } from './lastfm';
import { fetchArtistImage } from './musicbrainz';

export async function generateDiscoveryCandidates(
  seeds: UserArtist[],
  dislikedIds: Set<string>,
  knownIds: Set<string>
): Promise<DiscoveryCandidate[]> {
  if (!seeds || seeds.length === 0) return [];

  // Mapeamento temporário para acumular candidatos
  // Candidate Key -> { candidateName, mbid, reasons: [], accumulatedWeightedScore }
  const candidateMap = new Map<
    string,
    {
      id: string;
      name: string;
      mbid?: string;
      reasons: DiscoveryReason[];
      scoreSum: number;
    }
  >();

  // Coleta similaridades para cada artista semente do usuário
  for (const seed of seeds) {
    const seedArtist = seed.artist;
    const seedWeight = seed.weight || 0.9;
    const similars = await fetchLastFmSimilarArtists(seedArtist.name);

    for (const sim of similars) {
      if (isJunkArtist(sim.name)) continue;

      const candidateId = sim.mbid || sim.id || sim.name.toLowerCase().replace(/\s+/g, '-');

      // Não recomendar o próprio artista semente, nem artistas descurtidos/conhecidos
      if (
        candidateId === seedArtist.id ||
        sim.name.toLowerCase() === seedArtist.name.toLowerCase() ||
        dislikedIds.has(candidateId) ||
        knownIds.has(candidateId)
      ) {
        continue;
      }

      const existing = candidateMap.get(candidateId);
      const weightedScore = sim.score * seedWeight;

      const reason: DiscoveryReason = {
        seedArtistId: seedArtist.id,
        seedArtistName: seedArtist.name,
        similarityScore: sim.score,
      };

      if (existing) {
        existing.scoreSum += weightedScore;
        existing.reasons.push(reason);
      } else {
        candidateMap.set(candidateId, {
          id: candidateId,
          name: sim.name,
          mbid: sim.mbid,
          reasons: [reason],
          scoreSum: weightedScore,
        });
      }
    }
  }

  // Normaliza o Discovery Score final
  const totalSeeds = seeds.length;
  const rawCandidates: Array<{
    id: string;
    name: string;
    mbid?: string;
    score: number;
    reasons: DiscoveryReason[];
    distanceCategory: DiscoveryCandidate['distanceCategory'];
  }> = [];

  for (const [id, data] of candidateMap.entries()) {
    // Score final normalizado entre 0.1 e 0.98
    const rawScore = data.scoreSum / Math.max(1.5, Math.sqrt(totalSeeds));
    const normalizedScore = Math.min(0.98, Math.max(0.15, rawScore));

    // Determina a categoria de distância musical
    let distanceCategory: DiscoveryCandidate['distanceCategory'] = 'Exploratory';
    if (normalizedScore >= 0.75) distanceCategory = 'Very Close';
    else if (normalizedScore >= 0.60) distanceCategory = 'Close';
    else if (normalizedScore >= 0.45) distanceCategory = 'Exploratory';
    else distanceCategory = 'Surprising';

    // Ordena as razões por maior relevância de semente
    data.reasons.sort((a, b) => b.similarityScore - a.similarityScore);

    rawCandidates.push({
      id: data.mbid || id,
      name: data.name,
      mbid: data.mbid,
      score: parseFloat(normalizedScore.toFixed(2)),
      reasons: data.reasons,
      distanceCategory,
    });
  }

  // Ordena por maior Discovery Score e seleciona os top 12
  const topCandidates = rawCandidates
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);

  // Busca fotos dos candidatos em paralelo
  const candidatesList: DiscoveryCandidate[] = await Promise.all(
    topCandidates.map(async (cand) => {
      const photoUrl = await fetchArtistImage(cand.name);

      const candidateArtist: Artist = {
        id: cand.id,
        name: cand.name,
        country: null,
        formed: null,
        genres: ['Descoberta Musical'],
        tags: ['Recomendado'],
        similarArtists: [],
        identity: {
          musicbrainzId: cand.mbid,
        },
        discography: [],
        imageUrl: photoUrl,
      };

      return {
        artist: candidateArtist,
        score: cand.score,
        reasons: cand.reasons,
        distanceCategory: cand.distanceCategory,
      };
    })
  );

  return candidatesList;
}
