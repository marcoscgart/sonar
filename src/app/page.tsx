'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Sparkles,
  Compass,
  BookmarkPlus,
  RefreshCw,
  Trash2,
  Music2,
  Info,
  SlidersHorizontal,
  Plus,
  GripVertical
} from 'lucide-react';
import { SearchBar } from '@/components/Search/SearchBar';
import { ArtistCard } from '@/components/Artist/ArtistCard';
import { MusicalMap } from '@/components/Map/MusicalMap';
import { WhyThisArtistModal } from '@/components/Artist/WhyThisArtistModal';
import { SaveProfileModal } from '@/components/Auth/SaveProfileModal';
import { SonarLogo } from '@/components/Logo/SonarLogo';
import { useProfileStore } from '@/lib/store/useProfileStore';
import { Artist, DiscoveryCandidate, ArtistStatus } from '@/lib/types/sonar';

// Artistas sugeridos para início rápido (3 sementes recomendadas no Sonar.txt)
const STARTER_SEEDS: Artist[] = [
  {
    id: 'a74b1b7f-71a5-4011-9441-d0b5e4122d11',
    name: 'Radiohead',
    country: 'United Kingdom',
    formed: 1985,
    genres: ['Alternative Rock', 'Art Rock', 'Experimental Rock'],
    tags: ['British', 'Alternative', 'Melancholic', 'Atmospheric'],
    similarArtists: [],
    identity: { musicbrainzId: 'a74b1b7f-71a5-4011-9441-d0b5e4122d11' },
    discography: [
      { title: 'A Moon Shaped Pool', year: 2016 },
      { title: 'The King of Limbs', year: 2011 },
      { title: 'In Rainbows', year: 2007 },
      { title: 'OK Computer', year: 1997 },
    ],
  },
  {
    id: '084308bd-1654-436f-a9da-f879502b84a3',
    name: 'Portishead',
    country: 'United Kingdom',
    formed: 1991,
    genres: ['Trip Hop', 'Electronic', 'Downtempo'],
    tags: ['British', 'Trip Hop', 'Melancholic', 'Atmospheric'],
    similarArtists: [],
    identity: { musicbrainzId: '084308bd-1654-436f-a9da-f879502b84a3' },
    discography: [
      { title: 'Third', year: 2008 },
      { title: 'Portishead', year: 1997 },
      { title: 'Dummy', year: 1994 },
    ],
  },
  {
    id: '87c5dedd-3d4d-494e-87b8-8c0aed9d6ac8',
    name: 'Björk',
    country: 'Iceland',
    formed: 1977,
    genres: ['Art Pop', 'Electronic', 'Experimental'],
    tags: ['Icelandic', 'Avant-Garde', 'Experimental', 'Electronic'],
    similarArtists: [],
    identity: { musicbrainzId: '87c5dedd-3d4d-494e-87b8-8c0aed9d6ac8' },
    discography: [
      { title: 'Fossora', year: 2022 },
      { title: 'Utopia', year: 2017 },
      { title: 'Homogenic', year: 1997 },
      { title: 'Debut', year: 1993 },
    ],
  },
];

export default function HomePage() {
  const {
    userArtists,
    addSeedArtist,
    setArtistStatus,
    removeArtist,
    reorderSeedArtists,
    clearProfile,
    getSeedArtists,
    getDislikedIds,
    getKnownIds,
  } = useProfileStore();

  const [discoveries, setDiscoveries] = useState<DiscoveryCandidate[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);
  const [selectedDiscovery, setSelectedDiscovery] = useState<DiscoveryCandidate | null>(null);
  const [whyThisCandidate, setWhyThisCandidate] = useState<DiscoveryCandidate | null>(null);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Memoizado por userArtists (referência só muda quando o store muda de verdade): sem
  // isso, getSeedArtists() cria um array novo a cada render do HomePage (qualquer clique,
  // qualquer state local), fazendo o MusicalMap reconstruir e re-randomizar o grafo inteiro
  // por engano em toda interação — não só quando as sementes realmente mudam.
  const seedArtists = useMemo(() => getSeedArtists(), [userArtists]);
  // Até montar, espelha o HTML vazio do servidor onde a estrutura do DOM depende da lista (evita mismatch de hidratação).
  const displaySeedArtists = mounted ? seedArtists : [];

  // Recalcula descobertas sempre que os artistas semente mudarem
  useEffect(() => {
    if (seedArtists.length === 0) {
      setDiscoveries([]);
      return;
    }

    const fetchDiscoveries = async () => {
      setIsGenerating(true);
      try {
        const res = await fetch('/api/discoveries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            seeds: seedArtists,
            dislikedIds: Array.from(getDislikedIds()),
            knownIds: Array.from(getKnownIds()),
          }),
        });

        const data = await res.json();
        setDiscoveries(data.discoveries || []);
      } catch (err) {
        console.error('Error generating discoveries:', err);
      } finally {
        setIsGenerating(false);
      }
    };

    fetchDiscoveries();
  }, [Object.keys(userArtists).length]);

  // useCallback por um motivo igual ao do seedArtists acima: sem isso, essa função (passada
  // como onSelectArtist) muda de referência a cada render e também dispara reconstrução do grafo.
  const handleSelectMapNode = useCallback((artist: Artist, discoveryInfo?: DiscoveryCandidate) => {
    setSelectedArtist(artist);
    setSelectedDiscovery(discoveryInfo || null);
  }, []);

  const handleAddStarterSeeds = () => {
    STARTER_SEEDS.forEach((artist) => addSeedArtist(artist));
  };

  return (
    <main className="h-dvh flex flex-col bg-[#eef0f4] text-slate-900 font-sans selection:bg-indigo-500 selection:text-white overflow-hidden">
      {/* Top Header Navbar */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-xl sticky top-0 z-30 px-4 lg:px-8 py-3.5 flex items-center justify-between">
        {/* Logo Oficial Sonar Multibeam */}
        <SonarLogo size="md" animated={true} showText={true} />

        {/* Action Buttons */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {displaySeedArtists.length > 0 && (
            <button
              onClick={clearProfile}
              title="Limpar perfil temporário"
              className="p-2 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded-xl transition text-xs flex items-center space-x-1"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Limpar</span>
            </button>
          )}

          <button
            onClick={() => setIsSaveModalOpen(true)}
            className="px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold rounded-xl text-xs sm:text-sm shadow-md shadow-indigo-500/20 flex items-center space-x-1.5 transition"
          >
            <BookmarkPlus className="w-4 h-4" />
            <span>Salvar Perfil</span>
          </button>
        </div>
      </header>

      {/* Main App Container: grafo em tela cheia, com os painéis flutuando por cima */}
      <div className="flex-1 relative overflow-hidden">

        {/* Grafo Interativo — ocupa toda a área, sem "caixa", atrás dos painéis flutuantes */}
        <div className="absolute inset-0">
          <MusicalMap
            seeds={seedArtists}
            discoveries={discoveries}
            selectedArtistId={selectedArtist?.id || null}
            onSelectArtist={handleSelectMapNode}
          />
        </div>

        {/* Painéis Flutuantes (Busca & Seeds Selecionadas) */}
        {/* No mobile os dois painéis se separam — busca fixa no topo, lista fixa no rodapé —
            liberando o centro da tela pro grafo. A partir do sm: o wrapper vira o bloco
            flutuante único de sempre (empilhado no canto superior esquerdo). */}
        <div className="contents sm:flex sm:flex-col sm:absolute sm:top-4 sm:left-4 lg:top-6 lg:left-6 sm:z-10 sm:w-96 sm:max-h-[calc(100%-2rem)] sm:space-y-4 lg:space-y-6 sm:overflow-y-auto">

          {/* Componente de Busca */}
          <div className="fixed top-4 left-4 right-4 z-10 sm:static">
            <div className="bg-white p-5 rounded-3xl shadow-xl space-y-3 relative z-40 shrink-0">
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center">
                <Compass className="w-4 h-4 mr-1.5 text-indigo-500" /> Monte seu Perfil Musical
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Pesquise de 3 a 10 artistas que você ama para ativar o motor de descobertas do Sonar.
              </p>
              <SearchBar onAddArtist={addSeedArtist} />
            </div>
          </div>

          {/* Seeds Selecionadas pelo Usuário */}
          <div className="fixed bottom-4 left-4 right-4 z-10 max-h-[35dvh] overflow-y-auto sm:static sm:max-h-none sm:overflow-visible">
          <div className="bg-white p-5 rounded-3xl shadow-xl flex flex-col shrink-0">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center">
                  <Music2 className="w-4 h-4 mr-1.5 text-indigo-500" /> Artistas no seu Perfil ({displaySeedArtists.length})
                </h3>
                {isGenerating && (
                  <span className="text-[11px] text-indigo-600 flex items-center animate-pulse">
                    <RefreshCw className="w-3 h-3 mr-1 animate-spin" /> Atualizando...
                  </span>
                )}
              </div>

              {displaySeedArtists.length > 0 ? (
                <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                  {displaySeedArtists.map((userArt) => {
                    const art = userArt.artist;
                    return (
                      <div
                        key={art.id}
                        onClick={() => setSelectedArtist(art)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          const draggedId = e.dataTransfer.getData('text/plain');
                          if (!draggedId || draggedId === art.id) return;
                          const ids = displaySeedArtists.map((u) => u.artistId);
                          const fromIndex = ids.indexOf(draggedId);
                          const toIndex = ids.indexOf(art.id);
                          if (fromIndex === -1 || toIndex === -1) return;
                          ids.splice(toIndex, 0, ids.splice(fromIndex, 1)[0]);
                          reorderSeedArtists(ids);
                        }}
                        className={`p-3 rounded-2xl border transition flex items-center justify-between cursor-pointer ${
                          selectedArtist?.id === art.id
                            ? 'bg-indigo-50 border-indigo-300 shadow-sm'
                            : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center space-x-3 truncate">
                          <span
                            draggable
                            onDragStart={(e) => {
                              e.stopPropagation();
                              e.dataTransfer.setData('text/plain', art.id);
                              e.dataTransfer.effectAllowed = 'move';
                            }}
                            onClick={(e) => e.stopPropagation()}
                            title="Arraste para reordenar (o topo pesa mais no grafo)"
                            className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 shrink-0"
                          >
                            <GripVertical className="w-4 h-4" />
                          </span>
                          {art.imageUrl ? (
                            <img
                              src={art.imageUrl}
                              alt={art.name}
                              className="w-8 h-8 rounded-full object-cover border border-indigo-200 shrink-0"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 font-bold text-xs flex items-center justify-center border border-indigo-200 shrink-0">
                              {art.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="truncate">
                            <div className="font-semibold text-xs sm:text-sm text-slate-900 truncate">
                              {art.name}
                            </div>
                            <div className="text-[10px] text-slate-500 truncate">
                              {art.country || 'Artista'}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeArtist(art.id);
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 px-4 border border-dashed border-slate-300 rounded-2xl text-center space-y-3">
                  <p className="text-xs text-slate-500">
                    Nenhum artista adicionado ainda. Adicione 3 artistas para visualizar o universo de descobertas.
                  </p>
                  <button
                    onClick={handleAddStarterSeeds}
                    className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-xl text-xs font-semibold inline-flex items-center space-x-1.5 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar Trio Inicial Recomendado (Radiohead, Portishead, Björk)</span>
                  </button>
                </div>
              )}
            </div>

            {/* Dica de UX */}
            <div className="mt-4 pt-3 border-t border-slate-200 text-[11px] text-slate-500 flex items-start space-x-2">
              <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
              <span>
                O Sonar não requer senha ou login inicial. Suas seleções ficam guardadas no seu navegador.
              </span>
            </div>
          </div>
          </div>
        </div>

        {/* Overlay com detalhes do artista selecionado */}
        {selectedArtist && (
          <div className="absolute top-4 right-4 z-20 max-w-sm w-[calc(100%-2rem)] sm:w-full max-h-[calc(100%-2rem)] overflow-y-auto animate-slide-in">
            <ArtistCard
              artist={selectedArtist}
              status={userArtists[selectedArtist.id]?.status}
              discoveryInfo={selectedDiscovery || undefined}
              onSetStatus={setArtistStatus}
              onRemoveStatus={removeArtist}
              onOpenWhyThis={(cand) => setWhyThisCandidate(cand)}
              onClose={() => setSelectedArtist(null)}
            />
          </div>
        )}
      </div>

      {/* Modal Por que este artista apareceu? */}
      <WhyThisArtistModal
        candidate={whyThisCandidate}
        onClose={() => setWhyThisCandidate(null)}
      />

      {/* Modal Salvar Perfil Supabase Auth */}
      <SaveProfileModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        seedsCount={seedArtists.length}
      />
    </main>
  );
}
