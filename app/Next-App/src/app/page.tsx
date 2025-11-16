import { Button } from '@/components/ui/button';
import { ArrowRight, CandlestickChart, Crown, DollarSign, Swords, Trophy, UserPlus, Wallet } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col min-h-dvh bg-background text-foreground">
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative w-full h-[80vh] flex items-center justify-center text-center overflow-hidden">
          {/* Grid Background */}
          <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))]">
             <div 
              className="absolute inset-0 z-[-1]"
              style={{
                backgroundImage: 'linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)',
                backgroundSize: '40px 40px',
                maskImage: 'radial-gradient(ellipse 50% 50% at 50% 50%, #000 60%, transparent 100%)',
              }}
            />
          </div>

          {/* Floating Icons */}
          <CandlestickChart className="absolute top-20 left-20 h-16 w-16 text-primary/50 opacity-50 -rotate-12" />
          <Trophy className="absolute top-24 right-24 h-16 w-16 text-primary/50 opacity-50 rotate-12" />
          <DollarSign className="absolute bottom-40 left-32 h-20 w-20 text-primary/30 opacity-40" />
          <Swords className="absolute bottom-20 left-1/4 h-14 w-14 text-primary/50 opacity-50 -rotate-12" />
          <Crown className="absolute bottom-16 right-1/4 h-14 w-14 text-primary/50 opacity-50 rotate-12" />
           <div className="absolute top-1/2 right-1/4 h-12 w-24 bg-muted/50 rounded-lg flex items-center justify-center p-2 gap-1 rotate-12">
            <span className="text-xs font-bold text-green-500">BUY</span>
            <span className="text-xs font-bold text-red-500">SELL</span>
           </div>


          <div className="z-10 container px-4 md:px-6 animate-fade-in-up">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tighter mb-4 text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary/80 to-primary">
              World's First Competitive Trading Platform
            </h1>
            <p className="max-w-[600px] mx-auto text-muted-foreground md:text-xl mb-8">
              Trade head-to-head against real traders using real-time market data. Stake money, join a match, trade, and win pots.
            </p>
            <Button asChild size="lg" className="text-lg">
              <Link href="/play">
                Play Now <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-16 md:py-24 bg-secondary/30">
          <div className="container px-4 md:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tighter">How It Works</h2>
              <p className="max-w-[600px] mx-auto text-muted-foreground mt-2">A simple path to becoming a trading champion.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
              {/* Step 1 */}
              <div className="flex flex-col items-center text-center">
                <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 border-2 border-primary mb-4">
                  <UserPlus className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Create Account</h3>
                <p className="text-muted-foreground">Sign up quickly and securely.</p>
              </div>
              {/* Step 2 */}
              <div className="flex flex-col items-center text-center">
                <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 border-2 border-primary mb-4">
                  <Wallet className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Stake Money</h3>
                <p className="text-muted-foreground">Add funds to your virtual wallet.</p>
              </div>
              {/* Step 3 */}
              <div className="flex flex-col items-center text-center">
                <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 border-2 border-primary mb-4">
                  <Swords className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Join a Match</h3>
                <p className="text-muted-foreground">Challenge the AI or a real player.</p>
              </div>
              {/* Step 4 */}
              <div className="flex flex-col items-center text-center">
                <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 border-2 border-primary mb-4">
                  <DollarSign className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Trade and Win</h3>
                <p className="text-muted-foreground">Use your skills to outperform opponents.</p>
              </div>
               {/* Step 5 */}
              <div className="flex flex-col items-center text-center">
                <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 border-2 border-primary mb-4">
                  <Trophy className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Improve Strategies</h3>
                <p className="text-muted-foreground">Learn and refine with every match.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
