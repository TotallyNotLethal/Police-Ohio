import Link from 'next/link';
import { BookText, Clock3, Heart, Home, Settings, WifiOff } from 'lucide-react';
import GlobalSearchBar from './GlobalSearchBar';
import OfflineBadge from './OfflineBadge';
import ThemeToggle from './ThemeToggle';
import ReferenceDisclaimerBanner from './ReferenceDisclaimerBanner';

const navItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/titles', label: 'Titles', icon: BookText },
  { href: '/recent', label: 'Recent', icon: Clock3 },
  { href: '/favorites', label: 'Favorites', icon: Heart },
  { href: '/offline', label: 'Offline', icon: WifiOff },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto grid min-h-screen max-w-7xl md:grid-cols-[250px_1fr]">
        <aside className="hidden border-r border-slate-200 bg-white p-4 md:block">
          <p className="text-lg font-bold">Police Ohio</p>
          <nav className="mt-4 space-y-2">
            {navItems.map(({ href, label }) => (
              <Link key={href} href={href} className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
                {label}
              </Link>
            ))}
          </nav>
        </aside>

        <div className="flex min-h-screen flex-col pb-16 md:pb-0">
          <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 p-3 backdrop-blur">
            <div className="flex items-center gap-2">
              <GlobalSearchBar />
              <ThemeToggle />
              <OfflineBadge />
            </div>
          </header>
          <main className="flex-1 space-y-4 p-4 md:p-6">
            <ReferenceDisclaimerBanner />
            {children}
          </main>
        </div>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white p-2 md:hidden">
        <ul className="grid grid-cols-6 gap-1">
          {navItems.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link href={href} className="flex flex-col items-center gap-1 rounded-lg py-1 text-[11px] font-medium text-slate-600">
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
