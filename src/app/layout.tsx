import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sonar - Descoberta Musical Personalizada',
  description:
    'Navegue por universos musicais e descubra novos artistas com base na sua afinidade real, sem questionários ou cadastros obrigatórios.',
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
