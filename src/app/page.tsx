'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Sparkles,
  Search,
  BookmarkPlus,
  RefreshCw,
  Trash2,
  Music2,
  Info,
  SlidersHorizontal,
  Plus,
  GripVertical,
  User,
  X
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
  // Tab bar mobile: qual painel (Busca/Lista) está aberto como bottom sheet. Sem efeito no
  // desktop, que ignora esse estado e mantém os painéis sempre visíveis via classes sm:.
  const [activeMobilePanel, setActiveMobilePanel] = useState<'search' | 'list' | null>(null);

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

  // Assinatura id+peso de cada semente: muda tanto quando artistas entram/saem quanto quando
  // só a ordem (peso) muda — reordenar via drag não altera Object.keys(userArtists).length,
  // então usar só isso como dependência do efeito abaixo deixava a busca de descobertas (e o
  // grafo) presa nos pesos antigos, só a lista lateral reordenava visualmente.
  const seedSignature = useMemo(
    () => seedArtists.map((s) => `${s.artistId}:${s.weight.toFixed(2)}`).join('|'),
    [seedArtists]
  );

  // Recalcula descobertas sempre que os artistas semente (ou seus pesos) mudarem
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
  }, [seedSignature]);

  // useCallback por um motivo igual ao do seedArtists acima: sem isso, essa função (passada
  // como onSelectArtist) muda de referência a cada render e também dispara reconstrução do grafo.
  const handleSelectMapNode = useCallback((artist: Artist, discoveryInfo?: DiscoveryCandidate) => {
    setSelectedArtist(artist);
    setSelectedDiscovery(discoveryInfo || null);
  }, []);

  const handleAddStarterSeeds = () => {
    STARTER_SEEDS.forEach((artist) => addSeedArtist(artist));
  };

  const toggleMobilePanel = (panel: 'search' | 'list') => {
    setActiveMobilePanel((current) => (current === panel ? null : panel));
  };

  return (
    <main className="h-dvh relative bg-[#0b0e14] text-slate-900 font-sans selection:bg-indigo-500 selection:text-white overflow-hidden">

      {/* Main App Container: grafo ocupa a tela inteira (inclusive atrás do header), reforçando a sensação de "canvas" */}
      <div className="absolute inset-0">

        {/* Grafo Interativo — ocupa toda a área, sem "caixa", atrás dos painéis flutuantes */}
        <div className="absolute inset-0">
          <MusicalMap
            seeds={seedArtists}
            discoveries={discoveries}
            selectedArtistId={selectedArtist?.id || null}
            onSelectArtist={handleSelectMapNode}
          />
        </div>

        {/* Gradiente decorativo no topo: escurece pra transparente, sem barra sólida — dá a
            sensação de que o grafo é um "canvas" contínuo por trás do header flutuante. Fundo
            escuro (em vez do branco original) pra combinar com o badge "Powered by Netlify"
            (que a plataforma injeta e não dá pra remover) e destacar mais o grafo. */}
        <div className="absolute inset-x-0 top-0 h-32 sm:h-28 bg-gradient-to-b from-[#0b0e14] via-[#0b0e14]/80 to-transparent pointer-events-none z-20" />

        {/* Header flutuante — sem fundo/borda própria, só o gradiente acima garante legibilidade.
            No mobile só sobra a logo, centralizada (justify-center com um único filho visível);
            Limpar e Salvar Perfil migram pra tab bar inferior. A partir do sm: volta ao layout
            de sempre (logo à esquerda, botões à direita). */}
        <div className="absolute top-0 inset-x-0 z-30 px-4 lg:px-8 py-3.5 flex items-center justify-center sm:justify-between">
          {/* Logo Oficial Sonar Multibeam */}
          <SonarLogo size="md" animated={true} showText={true} />

          {/* Action Buttons */}
          <div className="hidden sm:flex items-center space-x-2 sm:space-x-3">
            {displaySeedArtists.length > 0 && (
              <button
                onClick={clearProfile}
                title="Limpar perfil temporário"
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-white/10 rounded-xl transition text-xs flex items-center space-x-1"
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
        </div>

        {/* Painéis Flutuantes (Busca & Seeds Selecionadas) */}
        {/* No mobile os dois painéis viram bottom sheets, abertos por toque na tab bar inferior
            (Buscar/Lista) — ficam escondidos por padrão, liberando a tela inteira pro grafo. A
            partir do sm: o wrapper volta a ser o bloco flutuante único de sempre (empilhado no
            canto superior esquerdo, sempre visível, ignorando o estado da tab bar). Top deslocado
            pra baixo do header flutuante (que não empurra mais o layout, já que virou overlay). */}
        <div className="contents sm:flex sm:flex-col sm:absolute sm:top-20 sm:left-4 lg:top-24 lg:left-6 sm:z-10 sm:w-96 sm:max-h-[calc(100%-5.5rem)] sm:space-y-4 lg:space-y-6 sm:overflow-y-auto">

          {/* Backdrop mobile: toque fora fecha o sheet aberto */}
          {activeMobilePanel && (
            <div
              onClick={() => setActiveMobilePanel(null)}
              className="fixed inset-0 z-30 bg-slate-900/20 sm:hidden"
            />
          )}

          {/* Componente de Busca */}
          <div
            className={`${
              activeMobilePanel === 'search' ? 'fixed inset-x-4 bottom-40 z-40' : 'hidden'
            } sm:block sm:static sm:z-auto`}
          >
            {/* Fechar o sheet: fica FORA da área rolável do card (abaixo), sempre visível e
                alcançável mesmo quando os resultados da busca crescem e ocupam a tela toda, ou
                quando o teclado do celular cobre a tab bar e o botão "Buscar" não dá pra tocar. */}
            <button
              onClick={() => setActiveMobilePanel(null)}
              className="sm:hidden absolute -top-2 -right-2 z-50 w-8 h-8 flex items-center justify-center bg-white text-slate-500 hover:text-slate-700 rounded-full shadow-md border border-slate-200 transition"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="bg-white p-5 rounded-3xl space-y-3 relative z-40 shrink-0 max-h-[55dvh] overflow-y-auto sm:max-h-none sm:overflow-visible">
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center">
                <Search className="w-4 h-4 mr-1.5 text-indigo-500" /> Monte seu Perfil Musical
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Pesquise de 3 a 10 artistas que você ama para ativar o motor de descobertas do Sonar.
              </p>
              <SearchBar onAddArtist={addSeedArtist} />
            </div>
          </div>

          {/* Seeds Selecionadas pelo Usuário */}
          <div
            className={`${
              activeMobilePanel === 'list'
                ? 'fixed inset-x-4 bottom-40 z-40 max-h-[55dvh] overflow-y-auto'
                : 'hidden'
            } sm:block sm:static sm:max-h-none sm:overflow-visible sm:z-auto`}
          >
          <div className="bg-white p-5 rounded-3xl flex flex-col shrink-0">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center">
                  <Music2 className="w-4 h-4 mr-1.5 text-indigo-500" /> Artistas no seu Perfil ({displaySeedArtists.length})
                </h3>
                <div className="flex items-center space-x-2">
                  {isGenerating && (
                    <span className="text-[11px] text-indigo-600 flex items-center animate-pulse">
                      <RefreshCw className="w-3 h-3 mr-1 animate-spin" /> Atualizando...
                    </span>
                  )}
                  {/* No mobile o botão Limpar do header some (vira só a logo); reaparece aqui,
                      junto da lista que ele afeta. A partir do sm: já existe no header. */}
                  {displaySeedArtists.length > 0 && (
                    <button
                      onClick={clearProfile}
                      title="Limpar perfil temporário"
                      className="sm:hidden p-1 text-slate-400 hover:text-rose-600 rounded-lg transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {/* Fechar o sheet: sempre alcançável, mesma razão do painel de busca. */}
                  <button
                    onClick={() => setActiveMobilePanel(null)}
                    className="sm:hidden p-1 text-slate-400 hover:text-slate-700 rounded-lg transition"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {displaySeedArtists.length > 0 ? (
                <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                  {displaySeedArtists.map((userArt) => {
                    const art = userArt.artist;
                    return (
                      <div
                        key={art.id}
                        onClick={() => {
                          setSelectedArtist(art);
                          setActiveMobilePanel(null);
                        }}
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
                    onClick={() => {
                      handleAddStarterSeeds();
                      setActiveMobilePanel(null);
                    }}
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

        {/* Tab Bar Inferior — mobile only: unifica Busca e Lista em botões que abrem bottom
            sheets, + Perfil pra salvar, liberando o centro da tela pro grafo. A partir do sm:
            os painéis já ficam sempre visíveis do lado esquerdo e essa barra some.
            Flutua a bottom-20 (em vez de grudar em bottom-0) pra não ficar atrás do badge
            "Powered by Netlify" que a própria Netlify injeta (iframe de z-index máximo, fora
            do nosso controle — não dá pra escondê-lo, só desviar). */}
        <div className="sm:hidden fixed bottom-20 inset-x-0 z-40 px-4">
          <div className="bg-white rounded-3xl shadow-lg shadow-slate-900/10 border border-slate-200 flex items-stretch overflow-hidden">
            <button
              onClick={() => toggleMobilePanel('search')}
              className={`flex-1 flex flex-col items-center justify-center py-2.5 transition ${
                activeMobilePanel === 'search' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-500'
              }`}
            >
              <Search className="w-5 h-5" />
              <span className="text-[10px] font-semibold mt-0.5">Buscar</span>
            </button>

            <button
              onClick={() => toggleMobilePanel('list')}
              className={`flex-1 flex flex-col items-center justify-center py-2.5 transition ${
                activeMobilePanel === 'list' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-500'
              }`}
            >
              <div className="relative">
                <Music2 className="w-5 h-5" />
                {displaySeedArtists.length > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-indigo-600 text-white text-[9px] font-bold flex items-center justify-center">
                    {displaySeedArtists.length}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-semibold mt-0.5">Lista</span>
            </button>

            <button
              onClick={() => setIsSaveModalOpen(true)}
              className="flex-1 flex flex-col items-center justify-center py-2.5 text-slate-500 transition"
            >
              <User className="w-5 h-5" />
              <span className="text-[10px] font-semibold mt-0.5">Perfil</span>
            </button>
          </div>
        </div>

        {/* Overlay com detalhes do artista selecionado — top deslocado pra não brigar com o header flutuante */}
        {selectedArtist && (
          <div className="absolute top-20 right-4 z-20 max-w-sm w-[calc(100%-2rem)] sm:w-full max-h-[calc(100%-5.5rem)] overflow-y-auto animate-slide-in">
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
