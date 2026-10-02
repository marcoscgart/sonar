'use client';

import React, { useState, useEffect } from 'react';
import {
  Heart,
  ThumbsDown,
  ExternalLink,
  HelpCircle,
  Disc,
  Globe,
  Tag,
  Users,
  Sparkles,
  Loader2,
  X,
  Info,
  Play,
  SkipForward,
  Plus,
  Minus
} from 'lucide-react';
import { Artist, ArtistStatus, DiscoveryCandidate } from '@/lib/types/sonar';
import { formatCountryAndYear } from '@/lib/services/musicbrainz';

// Converte o país do artista (sigla ISO "BR" ou nome por extenso "United Kingdom") na sigla de
// 2 letras; devolve null se não reconhecer.
let countryNameToCode: Map<string, string> | null = null;
function resolveCountryCode(country?: string | null): string | null {
  if (!country) return null;
  const value = country.trim();
  if (/^[A-Za-z]{2}$/.test(value)) return value.toUpperCase() === 'UK' ? 'GB' : value.toUpperCase();
  if (!countryNameToCode) {
    countryNameToCode = new Map();
    try {
      const names = ['en', 'pt'].map((l) => new Intl.DisplayNames([l], { type: 'region' }));
      for (let a = 65; a <= 90; a++) {
        for (let b = 65; b <= 90; b++) {
          const code = String.fromCharCode(a, b);
          // "UK" é código reservado (o ISO oficial do Reino Unido é "GB") e também resolve p/ "United Kingdom".
          if (code === 'UK') continue;
          for (const n of names) {
            const name = n.of(code);
            if (name && name !== code) countryNameToCode.set(name.toLowerCase(), code);
          }
        }
      }
    } catch {
      // Intl.DisplayNames indisponível: segue sem bandeira
    }
  }
  return countryNameToCode.get(value.toLowerCase()) ?? null;
}

// Sigla de 2 letras -> emoji de bandeira (letras viram "regional indicators").
function flagEmoji(code: string): string {
  return String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

interface ArtistCardProps {
  artist: Artist;
  status?: ArtistStatus;
  discoveryInfo?: DiscoveryCandidate;
  onSetStatus: (artist: Artist, status: ArtistStatus) => void;
  onRemoveStatus: (artistId: string) => void;
  onOpenWhyThis?: (candidate: DiscoveryCandidate) => void;
  onClose?: () => void;
}

export const ArtistCard: React.FC<ArtistCardProps> = ({
  artist,
  status,
  discoveryInfo,
  onSetStatus,
  onRemoveStatus,
  onOpenWhyThis,
  onClose,
}) => {
  const [fullArtist, setFullArtist] = useState<Artist>(artist);
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);
  // Id do artista cujos detalhes (gêneros/tags reais) já terminaram de carregar. A prévia espera
  // por isso: os gêneros da busca são provisórios e desambiguam mal artistas homônimos no iTunes.
  const [detailsLoadedFor, setDetailsLoadedFor] = useState<string | null>(null);
  const [previews, setPreviews] = useState<Array<{ trackName: string; previewUrl: string }>>([]);
  const [trackIndex, setTrackIndex] = useState(0);
  // Vira true quando o usuário já interagiu (próxima faixa ou fim de faixa): aí as faixas
  // seguintes começam sozinhas. A 1ª nunca toca sem o usuário apertar play (política dos browsers).
  const [autoplayNext, setAutoplayNext] = useState(false);
  const preview = previews[trackIndex] ?? null;
  const goToNextTrack = () => {
    if (previews.length < 2) return;
    setAutoplayNext(true);
    setTrackIndex((i) => (i + 1) % previews.length);
  };

  // Busca detalhes adicionais (discografia completa, foto e biografia) se ainda não foram carregados
  useEffect(() => {
    setFullArtist(artist);

    if (artist.identity.musicbrainzId && (artist.discography.length === 0 || !artist.bioSummary)) {
      setIsLoadingDetails(true);
      fetch(`/api/artists/${artist.identity.musicbrainzId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data) {
            setFullArtist((prev) => ({
              ...prev,
              formed: data.formed ?? prev.formed,
              country: data.country ?? prev.country,
              genres: data.genres?.length ? data.genres : prev.genres,
              tags: data.tags?.length ? data.tags : prev.tags,
              commonTags: data.commonTags ?? prev.commonTags,
              discography: data.discography?.length ? data.discography : prev.discography,
              imageUrl: data.imageUrl ?? prev.imageUrl,
              bioSummary: data.bioSummary ?? prev.bioSummary,
            }));
          }
        })
        .catch((err) => console.error('Failed to load full artist details:', err))
        .finally(() => {
          setIsLoadingDetails(false);
          setDetailsLoadedFor(artist.id);
        });
    }
  }, [artist]);

  // Busca uma prévia de 30s do artista (iTunes, sem necessidade de credenciais). Só dispara
  // quando os detalhes completos estão prontos (ou nunca foram necessários), pra usar os
  // gêneros reais na desambiguação.
  const needsDetails =
    !!artist.identity.musicbrainzId && (artist.discography.length === 0 || !artist.bioSummary);
  const detailsReady = !needsDetails || detailsLoadedFor === artist.id;

  useEffect(() => {
    setPreviews([]);
    setTrackIndex(0);
    setAutoplayNext(false);
    if (!detailsReady) return;
    const hints = [...(fullArtist.genres || []), ...(fullArtist.tags || [])].slice(0, 8).join(',');
    fetch(`/api/preview?artist=${encodeURIComponent(artist.name)}&genres=${encodeURIComponent(hints)}`)
      .then((res) => res.json())
      .then((data) => setPreviews(Array.isArray(data) ? data : []))
      .catch((err) => console.error('Failed to load artist preview:', err));
    // fullArtist só entra via detailsReady: não refaz (e troca a faixa) a cada atualização dele.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artist.id, detailsReady]);

  const countryCode = resolveCountryCode(fullArtist.country);
  // Com sigla reconhecida mostra "BR, 1985" (a bandeira vem antes, no JSX); senão mantém o texto original.
  const countryYearStr = countryCode
    ? [countryCode, fullArtist.formed].filter(Boolean).join(', ')
    : formatCountryAndYear(fullArtist.country, fullArtist.formed);

  return (
    <div className="bg-white/95 border border-slate-200 rounded-3xl p-5 text-slate-900 max-w-md w-full relative overflow-hidden backdrop-blur-xl">
      {/* Botão Fechar se fornecido */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition z-10"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      {/* Header do Artista */}
      <div className="flex items-start space-x-4 mb-4">
        {fullArtist.imageUrl ? (
          <img
            src={fullArtist.imageUrl}
            alt={fullArtist.name}
            className="w-16 h-16 rounded-2xl object-cover shrink-0 border border-indigo-200"
          />
        ) : (
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-2xl font-black text-white shrink-0 border border-indigo-200">
            {fullArtist.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="pr-6">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 leading-snug">{fullArtist.name}</h2>
            {/* Atalho rápido ao lado do nome: adicionar/tirar do painel de perfil, sem precisar rolar até as Ações Rápidas abaixo */}
            <button
              onClick={() => onSetStatus(fullArtist, 'liked')}
              title="Adicionar ao painel"
              className="w-6 h-6 shrink-0 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center transition"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={() => onRemoveStatus(fullArtist.id)}
              title="Tirar do painel"
              className="w-6 h-6 shrink-0 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center transition"
            >
              <Minus className="w-4 h-4" />
            </button>
          </div>

          {/* Regra 9: Country + Year unificados na UI */}
          <div className="text-xs font-semibold text-indigo-600 flex items-center mt-1">
            <Globe className="w-3.5 h-3.5 mr-1 inline" />
            {countryCode && <span className="mr-1 text-sm leading-none">{flagEmoji(countryCode)}</span>}
            {countryYearStr}
          </div>

          {status && (
            <div className="mt-2 inline-block">
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                  status === 'liked'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : status === 'known'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : status === 'disliked'
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : 'bg-purple-50 text-purple-700 border-purple-200'
                }`}
              >
                {status === 'liked'
                  ? 'Gostou'
                  : status === 'known'
                  ? 'Já Conheço'
                  : status === 'disliked'
                  ? 'Não Gosta'
                  : 'Descoberta'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Ações Rápidas (Feedback) */}
      <div className="grid grid-cols-2 gap-2 mb-5">
        <button
          onClick={() => (status === 'liked' ? onRemoveStatus(fullArtist.id) : onSetStatus(fullArtist, 'liked'))}
          className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center space-x-1.5 transition ${
            status === 'liked'
              ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
              : 'bg-slate-50 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border-slate-200 hover:border-emerald-300'
          }`}
        >
          <Heart className="w-3.5 h-3.5 fill-current" />
          <span>Gostar</span>
        </button>

        <button
          onClick={() => (status === 'disliked' ? onRemoveStatus(fullArtist.id) : onSetStatus(fullArtist, 'disliked'))}
          className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center space-x-1.5 transition ${
            status === 'disliked'
              ? 'bg-rose-600 text-white border-rose-500 shadow-sm'
              : 'bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-700 border-slate-200 hover:border-rose-300'
          }`}
        >
          <ThumbsDown className="w-3.5 h-3.5" />
          <span>Não Gostar</span>
        </button>
      </div>

      {/* Botão Por que apareceu? para Descobertas */}
      {discoveryInfo && onOpenWhyThis && (
        <button
          onClick={() => onOpenWhyThis(discoveryInfo)}
          className="w-full mb-4 py-2 px-3 bg-gradient-to-r from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 border border-indigo-200 rounded-xl text-xs font-semibold text-indigo-700 flex items-center justify-center space-x-2 transition"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
          <span>Por que este artista apareceu? ({Math.round(discoveryInfo.score * 100)}% de afinidade)</span>
        </button>
      )}

      {/* Biografia / Resumo da Banda */}
      {fullArtist.bioSummary && (
        <div className="mb-4 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center">
            <Info className="w-3.5 h-3.5 mr-1.5 text-indigo-500" /> Sobre o Artista
          </div>
          <p className="text-slate-600 leading-relaxed text-[11px] max-h-36 overflow-y-auto pr-1">
            {fullArtist.bioSummary}
          </p>
        </div>
      )}

      {/* Prévia de 30s (iTunes) */}
      {preview && (
        <div className="mb-4 bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center">
            <Play className="w-3.5 h-3.5 mr-1.5 text-indigo-500" /> Prévia — {preview.trackName}
          </div>
          <div className="flex items-center gap-2">
            <audio
              key={preview.previewUrl}
              controls
              preload="none"
              className="w-full h-8"
              src={preview.previewUrl}
              autoPlay={autoplayNext}
              onEnded={goToNextTrack}
            />
            {previews.length > 1 && (
              <button
                onClick={goToNextTrack}
                title={`Próxima música (${trackIndex + 1}/${previews.length})`}
                aria-label="Próxima música"
                className="shrink-0 w-8 h-8 rounded-full bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-600 flex items-center justify-center transition"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Conteúdo Secundário (Genres, Tags, Identity, Discography) */}
      <div className="space-y-4 text-xs">
        {/* Genres */}
        {fullArtist.genres.length > 0 && (
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center">
              <Tag className="w-3 h-3 mr-1" /> Gêneros
            </div>
            <div className="flex flex-wrap gap-1.5">
              {fullArtist.genres.map((g, idx) => (
                <span
                  key={idx}
                  className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-1 rounded-lg font-medium"
                >
                  {g}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Tags (Máximo 5 com destaque de consenso MusicBrainz + Last.fm) */}
        {fullArtist.tags.length > 0 && (
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span className="flex items-center">
                <Tag className="w-3 h-3 mr-1 text-indigo-500" /> Tags
              </span>
              {fullArtist.commonTags && fullArtist.commonTags.length > 0 && (
                <span className="text-[10px] text-emerald-600 font-semibold lowercase flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  consenso mb + last.fm
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {fullArtist.tags.slice(0, 5).map((t, idx) => {
                const isCommon = fullArtist.commonTags?.some(
                  (ct) => ct.toLowerCase() === t.toLowerCase()
                );
                return (
                  <span
                    key={idx}
                    className={`px-2.5 py-0.5 rounded-md border text-[11px] font-medium transition flex items-center gap-1 ${
                      isCommon
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                        : 'bg-slate-50 text-slate-500 border-slate-200'
                    }`}
                  >
                    {isCommon && <span className="text-emerald-500 text-[10px]">★</span>}
                    #{t}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Identity Links */}
        <div>
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Identity & Links
          </div>
          <div className="flex flex-wrap gap-2 text-indigo-600 font-medium">
            {fullArtist.identity.musicbrainzId && (
              <a
                href={`https://musicbrainz.org/artist/${fullArtist.identity.musicbrainzId}`}
                target="_blank"
                rel="noreferrer"
                className="hover:underline flex items-center bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200"
              >
                MusicBrainz <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            )}
            <a
              href={`https://www.last.fm/music/${encodeURIComponent(fullArtist.name)}`}
              target="_blank"
              rel="noreferrer"
              className="hover:underline flex items-center bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200"
            >
              Last.fm <ExternalLink className="w-3 h-3 ml-1" />
            </a>
          </div>
        </div>

        {/* Discography - Regra 10: Ordem cronológica inversa */}
        <div>
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span className="flex items-center">
              <Disc className="w-3 h-3 mr-1" /> Discografia (Cronológica Inversa)
            </span>
            {isLoadingDetails && <Loader2 className="w-3 h-3 animate-spin text-indigo-500" />}
          </div>

          {fullArtist.discography.length > 0 ? (
            <div className="max-h-48 overflow-y-auto space-y-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              {fullArtist.discography.map((album, idx) => (
                <div key={idx} className="flex justify-between items-center text-slate-600 hover:text-slate-900 py-1 border-b border-slate-200/70 last:border-none">
                  <div className="flex items-center space-x-2 truncate pr-2">
                    {album.coverUrl ? (
                      <img
                        src={album.coverUrl}
                        alt={album.title}
                        className="w-7 h-7 rounded-md object-cover shrink-0 border border-slate-200"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <Disc className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                    <span className="font-medium truncate text-xs">{album.title}</span>
                  </div>
                  <span className="text-indigo-600 font-mono text-[11px] shrink-0">{album.year}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-slate-400 italic text-[11px]">
              {isLoadingDetails ? 'Carregando discografia...' : 'Nenhum álbum catalogado.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
