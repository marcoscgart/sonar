'use client';

import React from 'react';

interface SonarLogoProps {
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  showText?: boolean;
  className?: string;
}

export const SonarLogo: React.FC<SonarLogoProps> = ({
  size = 'md',
  animated = true,
  showText = true,
  className = '',
}) => {
  const iconDimensions = {
    sm: { w: 32, h: 32, viewW: 240, viewH: 140 },
    md: { w: 42, h: 42, viewW: 240, viewH: 140 },
    lg: { w: 56, h: 56, viewW: 240, viewH: 140 },
  }[size];

  const titleSizes = {
    sm: 'text-base',
    md: 'text-lg sm:text-xl',
    lg: 'text-2xl',
  }[size];

  const subtitleSizes = {
    sm: 'text-[9px]',
    md: 'text-[10px]',
    lg: 'text-xs',
  }[size];

  return (
    <div className={`flex items-center space-x-3 select-none ${className}`}>
      {/* Estilos de Animação do Pulso Multibeam Sonar */}
      {animated && (
        <style jsx>{`
          .pulse-node {
            transform-box: fill-box;
            transform-origin: center;
          }

          @keyframes sonarPingSweep {
            0% {
              transform: scale(1);
              opacity: 0.88;
            }
            12% {
              transform: scale(1.12);
              opacity: 1;
              filter: drop-shadow(0 0 5px currentColor);
            }
            24% {
              transform: scale(1);
              opacity: 0.88;
            }
            100% {
              transform: scale(1);
              opacity: 0.88;
            }
          }

          .col-1 { animation: sonarPingSweep 4.2s infinite ease-in-out; animation-delay: 0.0s; }
          .col-2 { animation: sonarPingSweep 4.2s infinite ease-in-out; animation-delay: 0.15s; }
          .col-3 { animation: sonarPingSweep 4.2s infinite ease-in-out; animation-delay: 0.30s; }
          .col-4 { animation: sonarPingSweep 4.2s infinite ease-in-out; animation-delay: 0.45s; }
          .col-5 { animation: sonarPingSweep 4.2s infinite ease-in-out; animation-delay: 0.60s; }
          .col-6 { animation: sonarPingSweep 4.2s infinite ease-in-out; animation-delay: 0.75s; }
        `}</style>
      )}

      {/* Ícone com os nós do Sonar Multifeixe */}
      <div
        className="rounded-2xl bg-[#030712] border border-slate-800/90 flex items-center justify-center p-1.5 shadow-md shadow-slate-950/20 shrink-0 relative overflow-hidden"
        style={{ width: iconDimensions.w, height: iconDimensions.h }}
      >
        {/* Halo de fundo sutil */}
        <div className="absolute inset-0 bg-gradient-to-tr from-cyan-950/30 via-transparent to-red-950/20 pointer-events-none" />

        <svg
          viewBox="15 20 230 140"
          className="w-full h-full relative z-10"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <filter id="sonarGlowHeader" x="-15%" y="-15%" width="130%" height="130%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <g filter="url(#sonarGlowHeader)">
            {/* Coluna 1: Origem Azul Ciano */}
            <circle
              cx="35"
              cy="90"
              r="6.5"
              fill="#00d4ff"
              className={animated ? 'pulse-node col-1' : ''}
              style={{ color: '#00d4ff' }}
            />

            {/* Coluna 2: Pulso Inicial */}
            <circle
              cx="65"
              cy="90"
              r="9"
              fill="#00e5ff"
              className={animated ? 'pulse-node col-2' : ''}
              style={{ color: '#00e5ff' }}
            />

            {/* Coluna 3: Transição Azul -> Verde-Água */}
            <circle
              cx="98"
              cy="45"
              r="5.5"
              fill="#00d4ff"
              opacity="0.8"
              className={animated ? 'pulse-node col-3' : ''}
              style={{ color: '#00d4ff' }}
            />
            <circle
              cx="98"
              cy="68"
              r="7.5"
              fill="#00f5d4"
              className={animated ? 'pulse-node col-3' : ''}
              style={{ color: '#00f5d4' }}
            />
            <circle
              cx="98"
              cy="90"
              r="11.5"
              fill="#05f1cd"
              className={animated ? 'pulse-node col-3' : ''}
              style={{ color: '#05f1cd' }}
            />
            <circle
              cx="98"
              cy="112"
              r="7.5"
              fill="#00f5d4"
              className={animated ? 'pulse-node col-3' : ''}
              style={{ color: '#00f5d4' }}
            />
            <circle
              cx="98"
              cy="135"
              r="5.5"
              fill="#00d4ff"
              opacity="0.8"
              className={animated ? 'pulse-node col-3' : ''}
              style={{ color: '#00d4ff' }}
            />

            {/* Coluna 4: Verde Sonar -> Lima */}
            <circle
              cx="136"
              cy="32"
              r="7.5"
              fill="#10b981"
              opacity="0.85"
              className={animated ? 'pulse-node col-4' : ''}
              style={{ color: '#10b981' }}
            />
            <circle
              cx="136"
              cy="59"
              r="9.5"
              fill="#22c55e"
              className={animated ? 'pulse-node col-4' : ''}
              style={{ color: '#22c55e' }}
            />
            <circle
              cx="136"
              cy="90"
              r="14"
              fill="#84cc16"
              className={animated ? 'pulse-node col-4' : ''}
              style={{ color: '#84cc16' }}
            />
            <circle
              cx="136"
              cy="121"
              r="9.5"
              fill="#22c55e"
              className={animated ? 'pulse-node col-4' : ''}
              style={{ color: '#22c55e' }}
            />
            <circle
              cx="136"
              cy="148"
              r="7.5"
              fill="#10b981"
              opacity="0.85"
              className={animated ? 'pulse-node col-4' : ''}
              style={{ color: '#10b981' }}
            />

            {/* Coluna 5: Amarelo -> Laranja */}
            <circle
              cx="178"
              cy="25"
              r="10"
              fill="#eab308"
              className={animated ? 'pulse-node col-5' : ''}
              style={{ color: '#eab308' }}
            />
            <circle
              cx="178"
              cy="55"
              r="12"
              fill="#f59e0b"
              className={animated ? 'pulse-node col-5' : ''}
              style={{ color: '#f59e0b' }}
            />
            <circle
              cx="178"
              cy="90"
              r="15"
              fill="#f97316"
              className={animated ? 'pulse-node col-5' : ''}
              style={{ color: '#f97316' }}
            />
            <circle
              cx="178"
              cy="125"
              r="12"
              fill="#f59e0b"
              className={animated ? 'pulse-node col-5' : ''}
              style={{ color: '#f59e0b' }}
            />
            <circle
              cx="178"
              cy="155"
              r="10"
              fill="#eab308"
              className={animated ? 'pulse-node col-5' : ''}
              style={{ color: '#eab308' }}
            />

            {/* Coluna 6: Arco Laranja Externo */}
            <circle
              cx="224"
              cy="38"
              r="12.5"
              fill="#ea580c"
              className={animated ? 'pulse-node col-6' : ''}
              style={{ color: '#ea580c' }}
            />
            <circle
              cx="224"
              cy="142"
              r="12.5"
              fill="#ea580c"
              className={animated ? 'pulse-node col-6' : ''}
              style={{ color: '#ea580c' }}
            />

            {/* Coluna 7: O GRANDE NÓ FOCAL VERMELHO 100% FLAT */}
            <circle
              cx="230"
              cy="90"
              r="25"
              fill="#ff2a2a"
              className={animated ? 'pulse-node col-6' : ''}
              style={{ color: '#ff2a2a' }}
            />
          </g>
        </svg>
      </div>

      {/* Tipografia Oficial SONAR */}
      {showText && (
        <div>
          <div className="flex items-center space-x-1.5">
            <h1 className={`font-black ${titleSizes} tracking-tight leading-none text-white`}>
              SONAR
            </h1>
            <span className="text-[7px] font-bold uppercase tracking-wider px-1 py-0.5 rounded bg-red-100 text-red-600 border border-red-200">
              BETA
            </span>
          </div>
          <p className={`${subtitleSizes} text-cyan-600 font-semibold tracking-wide uppercase mt-0.5`}>
            Descoberta Musical Personalizada
          </p>
        </div>
      )}
    </div>
  );
};

export default SonarLogo;
