'use client';

import React from 'react';
import { X, Sparkles, HelpCircle } from 'lucide-react';
import { DiscoveryCandidate } from '@/lib/types/sonar';

interface WhyThisArtistModalProps {
  candidate: DiscoveryCandidate | null;
  onClose: () => void;
}

export const WhyThisArtistModal: React.FC<WhyThisArtistModalProps> = ({
  candidate,
  onClose,
}) => {
  if (!candidate) return null;

  const { artist, score, reasons, distanceCategory } = candidate;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 text-slate-900 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">Por que este artista apareceu?</h3>
              <p className="text-xs text-slate-500">Explicação do algoritmo de afinidade</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-4 space-y-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <div className="font-semibold text-indigo-700 text-base">{artist.name}</div>
              <div className="text-xs text-slate-500 mt-0.5">
                Categoria: <span className="text-slate-700 font-medium">{distanceCategory}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black text-indigo-600">
                {Math.round(score * 100)}%
              </div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                Afinidade
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Conexões com o seu gosto musical:
            </div>
            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {reasons.map((reason, idx) => {
                const percent = Math.round(reason.similarityScore * 100);
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-700 font-medium">
                        Similares a <strong className="text-indigo-700">{reason.seedArtistName}</strong>
                      </span>
                      <span className="text-indigo-600 font-mono font-semibold">{percent}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                      <div
                        className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-slate-200 text-center">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl text-sm transition shadow-sm"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
