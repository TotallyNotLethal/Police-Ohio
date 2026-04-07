import type { Metadata } from 'next';
import AppShell from '../components/AppShell';
import './globals.css';
import ServiceWorkerRegistrar from '../components/offline/ServiceWorkerRegistrar';

export const metadata: Metadata = {
  title: 'Police Ohio',
  description: 'Ohio legal code exploration app foundation',
  manifest: '/manifest.webmanifest',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ServiceWorkerRegistrar />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
