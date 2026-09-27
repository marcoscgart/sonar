import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sonar - Descoberta Musical Personalizada',
  description:
    'Navegue por universos musicais e descubra novos artistas com base na sua afinidade real, sem questionários ou cadastros obrigatórios.',
};

// Trava o pinch-zoom / double-tap-zoom nativo do Safari: sem isso, um duplo toque sem
// querer num nó do grafo (gesto natural ao explorar) dá zoom na PÁGINA inteira (não só
// no canvas do Cytoscape), empurrando o header pra fora da área visível e distorcendo o
// layout — parecia a logo "sumindo" e a página "deslocada/escalada". O grafo já tem seu
// próprio pan/zoom por gesto, então zoom de página só atrapalha.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="h-dvh overflow-hidden bg-[#0b0e14] text-slate-900 antialiased selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
