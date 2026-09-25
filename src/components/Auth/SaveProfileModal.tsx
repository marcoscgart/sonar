'use client';

import React, { useState } from 'react';
import { X, Mail, ShieldCheck, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';

interface SaveProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  seedsCount: number;
}

export const SaveProfileModal: React.FC<SaveProfileModalProps> = ({
  isOpen,
  onClose,
  seedsCount,
}) => {
  const [email, setEmail] = useState('');
  const [isSent, setIsSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setErrorMessage('Por favor, insira um e-mail válido.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    if (!isSupabaseConfigured || !supabase) {
      // Simulação visual quando Supabase ainda não configurou as chaves de API no .env
      setTimeout(() => {
        setLoading(false);
        setIsSent(true);
      }, 1000);
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) {
        setErrorMessage(error.message);
      } else {
        setIsSent(true);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao enviar o Magic Link.');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: 'google' | 'apple') => {
    if (!isSupabaseConfigured || !supabase) {
      alert(`Autenticação com ${provider} ativada quando as chaves Supabase forem configuradas no .env.local.`);
      return;
    }

    try {
      await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin,
        },
      });
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 text-slate-900 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">Salvar Perfil Musical</h3>
              <p className="text-xs text-slate-500">Preserve seus {seedsCount} artistas e descobertas</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        {isSent ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-bold">Magic Link Enviado!</h4>
            <p className="text-xs text-slate-600 max-w-xs mx-auto leading-relaxed">
              Enviamos um link de acesso rápido sem senha para <strong className="text-indigo-700">{email}</strong>. Clique no link para sincronizar seu perfil.
            </p>
            <button
              onClick={onClose}
              className="mt-4 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl text-sm transition"
            >
              Concluído
            </button>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              Não exigimos senha. Escolha uma opção de login único abaixo para manter seu histórico de descobertas sincronizado:
            </p>

            {/* OAuth Buttons */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleOAuth('google')}
                className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl font-medium text-xs flex items-center justify-center space-x-2 transition shadow-sm"
              >
                <span>Continuar com Google</span>
              </button>

              <button
                type="button"
                onClick={() => handleOAuth('apple')}
                className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl font-medium text-xs flex items-center justify-center space-x-2 transition shadow-sm"
              >
                <span>Continuar com Apple</span>
              </button>
            </div>

            <div className="flex items-center my-4">
              <div className="flex-1 border-t border-slate-200"></div>
              <span className="px-3 text-[10px] text-slate-400 uppercase tracking-wider font-bold">ou Magic Link</span>
              <div className="flex-1 border-t border-slate-200"></div>
            </div>

            {/* Magic Link Form */}
            <form onSubmit={handleMagicLink} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  E-mail para acesso sem senha:
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu.email@exemplo.com"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
                  />
                </div>
              </div>

              {errorMessage && (
                <div className="text-xs text-rose-700 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                  {errorMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-xs rounded-xl flex items-center justify-center space-x-2 transition shadow-sm disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Enviar Magic Link</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
