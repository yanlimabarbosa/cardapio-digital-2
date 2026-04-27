import type { Metadata, Viewport } from 'next';
import { QueryProvider } from '@/providers/query-provider';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import './globals.css';

export const metadata: Metadata = {
  title: 'Bem Comer Self-Service — Cardápio Digital',
  description: 'Bem Comer Self-Service — sem balança, com grelhados. Peça online com entrega ou retirada.',
};

export const viewport: Viewport = {
  themeColor: '#4A2810',
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,600;0,9..144,700;0,9..144,800;1,9..144,600&family=Poppins:wght@400;500;600;700;800&family=Roboto:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body">
        <QueryProvider>
          <ErrorBoundary>{children}</ErrorBoundary>
        </QueryProvider>
      </body>
    </html>
  );
}
