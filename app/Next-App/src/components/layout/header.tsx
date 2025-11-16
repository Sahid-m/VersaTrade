import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { BookOpen, CandlestickChart, Play, Wallet } from 'lucide-react';
import { AuthButton } from './auth-button';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <CandlestickChart
            className="h-6 w-6"
            style={{ color: 'hsl(var(--primary))' }}
          />
          <span className="font-bold sm:inline-block">VersaTrade</span>
        </Link>
        <nav className="flex items-center space-x-4 lg:space-x-6">
           <Link
            href="/play"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            Play
          </Link>
           <Link
            href="/tutorials"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            AI Tutorials
          </Link>
          <Link
            href="/match-history"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            Match History
          </Link>
           <Link
            href="/leaderboard"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            Leaderboard
          </Link>
          <Link
            href="/wallet"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            Wallet
          </Link>
        </nav>
        <div className="flex flex-1 items-center justify-end space-x-2">
          <AuthButton />
        </div>
      </div>
    </header>
  );
}
