'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, Sparkles, Loader2, Music } from 'lucide-react';
import { Artist } from '@/lib/types/sonar';
import { formatCountryAndYear } from '@/lib/services/musicbrainz';

interface SearchBarProps {
  onAddArtist: (artist: Artist) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({ onAddArtist }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Artist[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    // Cancelar requisições em voo anteriores para evitar race condition
    const controller = new AbortController();
    setIsLoading(true);

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/artists/search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error('Search failed');
        const data = await res.json();
        setResults(data.artists || []);
        setIsOpen(true);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Search request failed:', err);
        }
      } finally {
        setIsLoading(false);
      }
    }, 200);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const handleSelect = (artist: Artist) => {
    onAddArtist(artist);
    setQuery('');
    setIsOpen(false);
  };

  return (
    <div className="relative w-full max-w-xl mx-auto z-50" ref={dropdownRef}>
      <div className="relative flex items-center">
        <Search className="absolute left-4 w-5 h-5 text-indigo-500 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim().length >= 2 && setIsOpen(true)}
          placeholder="Pesquise um artista ou banda (ex: Mastodon, Tool, Radiohead)..."
          className="w-full pl-12 pr-10 py-3.5 bg-white border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm text-sm sm:text-base"
        />
        {isLoading && (
          <Loader2 className="absolute right-4 w-5 h-5 text-indigo-500 animate-spin" />
        )}
      </div>

      {isOpen && (
        <div className="relative mt-2 bg-white border border-slate-200 rounded-2xl overflow-hidden max-h-96 overflow-y-auto z-50">
          {results.length > 0 ? (
            <div className="p-2 divide-y divide-slate-100">
              {results.map((artist) => {
                const countryYearStr = formatCountryAndYear(artist.country, artist.formed);
                return (
                  <button
                    key={artist.id}
                    onClick={() => handleSelect(artist)}
                    className="w-full text-left p-3 hover:bg-indigo-50 rounded-xl transition flex items-center justify-between group"
                  >
                    <div className="flex items-center space-x-3 truncate">
                      {artist.imageUrl ? (
                        <img
                          src={artist.imageUrl}
                          alt={artist.name}
                          className="w-10 h-10 rounded-full object-cover border border-indigo-200 shrink-0"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 font-bold text-sm shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition">
                          {artist.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="truncate">
                        <div className="font-semibold text-slate-900 group-hover:text-indigo-700 transition text-sm sm:text-base truncate">
                          {artist.name}
                        </div>
                        <div className="text-xs text-slate-500 truncate">
                          {countryYearStr} • {artist.genres.slice(0, 2).join(', ') || 'Música'}
                          {artist.bioSummary ? ` (${artist.bioSummary})` : ''}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center text-xs text-indigo-700 bg-indigo-50 px-2.5 py-1.5 rounded-lg border border-indigo-200 group-hover:bg-indigo-600 group-hover:text-white transition shrink-0 ml-2">
                      <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            !isLoading && (
              <div className="p-6 text-center text-slate-500 text-sm flex flex-col items-center">
                <Music className="w-8 h-8 mb-2 text-slate-300" />
                Nenhum artista encontrado para &quot;{query}&quot;. Tente outro nome.
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
};
