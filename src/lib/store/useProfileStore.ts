import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Artist, UserArtist, ArtistStatus, UserInteraction } from '../types/sonar';

interface ProfileState {
  userArtists: Record<string, UserArtist>;
  interactions: UserInteraction[];
  selectedArtistId: string | null;
  focusedDiscoveryId: string | null;
  
  // Actions
  addSeedArtist: (artist: Artist) => void;
  setArtistStatus: (artist: Artist, status: ArtistStatus) => void;
  removeArtist: (artistId: string) => void;
  reorderSeedArtists: (orderedIds: string[]) => void;
  selectArtist: (artistId: string | null) => void;
  focusDiscovery: (artistId: string | null) => void;
  clearProfile: () => void;
  
  // Selectors
  getSeedArtists: () => UserArtist[];
  getDislikedIds: () => Set<string>;
  getKnownIds: () => Set<string>;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      userArtists: {},
      interactions: [],
      selectedArtistId: null,
      focusedDiscoveryId: null,

      addSeedArtist: (artist: Artist) => {
        const now = new Date().toISOString();
        set((state) => {
          const existing = state.userArtists[artist.id];
          const newStatus: ArtistStatus = existing ? existing.status : 'liked';
          const newWeight = existing ? Math.min(1.0, existing.weight + 0.1) : 0.95;

          const updatedUserArtists = {
            ...state.userArtists,
            [artist.id]: {
              artistId: artist.id,
              artist,
              status: newStatus,
              weight: newWeight,
              createdAt: existing ? existing.createdAt : now,
              updatedAt: now,
            },
          };

          const newInteraction: UserInteraction = {
            artistId: artist.id,
            action: 'like',
            timestamp: now,
          };

          return {
            userArtists: updatedUserArtists,
            interactions: [newInteraction, ...state.interactions],
            selectedArtistId: artist.id,
          };
        });
      },

      setArtistStatus: (artist: Artist, status: ArtistStatus) => {
        const now = new Date().toISOString();
        set((state) => {
          const existing = state.userArtists[artist.id];
          let weight = 0.8;
          if (status === 'liked') weight = 0.95;
          if (status === 'known') weight = 0.7;
          if (status === 'discovered') weight = 0.6;
          if (status === 'disliked') weight = 0.0;

          const updatedUserArtists = {
            ...state.userArtists,
            [artist.id]: {
              artistId: artist.id,
              artist,
              status,
              weight,
              createdAt: existing ? existing.createdAt : now,
              updatedAt: now,
            },
          };

          const actionMap: Record<ArtistStatus, UserInteraction['action']> = {
            liked: 'like',
            disliked: 'dislike',
            known: 'known',
            discovered: 'discover',
          };

          const newInteraction: UserInteraction = {
            artistId: artist.id,
            action: actionMap[status],
            timestamp: now,
          };

          return {
            userArtists: updatedUserArtists,
            interactions: [newInteraction, ...state.interactions],
          };
        });
      },

      removeArtist: (artistId: string) => {
        set((state) => {
          const newArtists = { ...state.userArtists };
          delete newArtists[artistId];
          return {
            userArtists: newArtists,
            selectedArtistId: state.selectedArtistId === artistId ? null : state.selectedArtistId,
            focusedDiscoveryId: state.focusedDiscoveryId === artistId ? null : state.focusedDiscoveryId,
          };
        });
      },

      reorderSeedArtists: (orderedIds: string[]) => {
        set((state) => {
          const updatedUserArtists = { ...state.userArtists };
          // Posição na lista vira o peso do artista: o topo puxa descobertas pra mais
          // perto de si no grafo e pesa mais no ranking de afinidade das descobertas.
          orderedIds.forEach((id, index) => {
            const existing = updatedUserArtists[id];
            if (existing) {
              updatedUserArtists[id] = {
                ...existing,
                weight: Math.max(0.4, 1 - index * 0.12),
              };
            }
          });
          return { userArtists: updatedUserArtists };
        });
      },

      selectArtist: (artistId: string | null) => {
        set({ selectedArtistId: artistId });
      },

      focusDiscovery: (artistId: string | null) => {
        set({ focusedDiscoveryId: artistId });
      },

      clearProfile: () => {
        set({
          userArtists: {},
          interactions: [],
          selectedArtistId: null,
          focusedDiscoveryId: null,
        });
      },

      getSeedArtists: () => {
        const { userArtists } = get();
        return Object.values(userArtists)
          .filter((ua) => ua.status === 'liked' || ua.status === 'known')
          .sort((a, b) => b.weight - a.weight);
      },

      getDislikedIds: () => {
        const { userArtists } = get();
        const setIds = new Set<string>();
        Object.values(userArtists).forEach((ua) => {
          if (ua.status === 'disliked') setIds.add(ua.artistId);
        });
        return setIds;
      },

      getKnownIds: () => {
        const { userArtists } = get();
        const setIds = new Set<string>();
        Object.values(userArtists).forEach((ua) => {
          if (ua.status === 'known' || ua.status === 'liked') setIds.add(ua.artistId);
        });
        return setIds;
      },
    }),
    {
      name: 'sonar_music_profile_v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        userArtists: state.userArtists,
        interactions: state.interactions,
      }),
    }
  )
);
