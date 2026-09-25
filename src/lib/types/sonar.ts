export type ArtistStatus = 'liked' | 'known' | 'discovered' | 'disliked';

export interface Album {
  id?: string;
  title: string;
  year: number;
  type?: 'Album' | 'EP' | 'Single' | 'Live' | 'Compilation';
  coverUrl?: string;
}

export interface SimilarArtist {
  id: string;
  name: string;
  mbid?: string;
  score: number; // 0 to 1
  imageUrl?: string;
}

export interface ArtistIdentity {
  musicbrainzId?: string;
  lastfmUrl?: string;
  spotifyId?: string;
}

export interface Artist {
  id: string; // MusicBrainz ID (MBID) or fallback slug
  name: string;
  country: string | null; // e.g. "United Kingdom"
  formed: number | null; // e.g. 1985
  genres: string[]; // e.g. ["Alternative Rock", "Art Rock"]
  tags: string[]; // e.g. ["British", "Melancholic", "Atmospheric"]
  similarArtists: SimilarArtist[];
  identity: ArtistIdentity;
  discography: Album[]; // Descending order by release year!
  imageUrl?: string;
  bioSummary?: string;
  commonTags?: string[];
}

export interface UserArtist {
  artistId: string;
  artist: Artist;
  status: ArtistStatus;
  weight: number; // e.g. 0.5 to 1.0
  createdAt: string;
  updatedAt: string;
}

export interface DiscoveryReason {
  seedArtistId: string;
  seedArtistName: string;
  similarityScore: number;
}

export interface DiscoveryCandidate {
  artist: Artist;
  score: number; // Discovery Score (0 to 1)
  reasons: DiscoveryReason[];
  distanceCategory: 'Very Close' | 'Close' | 'Exploratory' | 'Surprising';
}

export interface UserInteraction {
  artistId: string;
  action: 'like' | 'dislike' | 'known' | 'discover' | 'explore' | 'save';
  timestamp: string;
}

export interface MusicalProfile {
  userArtists: Record<string, UserArtist>; // keyed by artistId
  interactions: UserInteraction[];
  updatedAt: string;
}
