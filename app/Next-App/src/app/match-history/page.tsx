// src/app/match-history/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Trophy, Shield, Frown } from 'lucide-react';
import { GameSession } from '@/lib/types';
import { format } from 'date-fns';

export default function MatchHistoryPage() {
  const { user, isLoading: isUserLoading } = useUser();
  const firestore = useFirestore();
  const [matches, setMatches] = useState<GameSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user || !firestore) return;

    const fetchMatches = async () => {
      setIsLoading(true);
      try {
        const sessionsRef = collection(firestore, 'gameSessions');
        const q = query(
          sessionsRef,
          where('players', 'array-contains-any', [{ userId: user.uid, name: user.displayName || `Player ${user.uid.substring(0, 4)}` }]),
          where('status', '==', 'finished'),
          orderBy('createdAt', 'desc')
        );
        
        const qUserByName = query(
          sessionsRef,
          where('players', 'array-contains-any', [{ name: user.displayName, userId: user.uid }]),
          where('status', '==', 'finished'),
          orderBy('createdAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const userMatches = querySnapshot.docs.map(doc => doc.data() as GameSession).filter(session => session.players.some(p => p.userId === user.uid));
        setMatches(userMatches);
      } catch (error) {
        console.error("Error fetching match history:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMatches();
  }, [user, firestore]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };
  
  const getMatchResult = (session: GameSession) => {
     if (!user) return { result: 'Unknown', pnl: 0 };
    const userPlayer = session.players.find(p => p.userId === user.uid);
    const opponent = session.players.find(p => p.userId !== user.uid);

    if (!userPlayer || !opponent) return { result: 'Unknown', pnl: 0, opponentName: 'N/A' };
    
    const userPnl = userPlayer.totalPnl;
    const opponentPnl = opponent.totalPnl;
    
    let result: 'Win' | 'Loss' | 'Draw';
    if (userPnl > opponentPnl) result = 'Win';
    else if (userPnl < opponentPnl) result = 'Loss';
    else result = 'Draw';
    
    return { result, pnl: userPnl, opponentName: opponent.name };
  };

  return (
    <div className="container mx-auto max-w-4xl p-4">
      <Card className="border-0 shadow-none bg-transparent">
        <CardHeader>
          <CardTitle className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl" style={{ color: 'hsl(var(--primary))' }}>
            Match History
          </CardTitle>
          <CardDescription className="text-lg text-muted-foreground">
            Review your past 1v1 battles and analyze your performance.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardContent className="p-0">
          {(isLoading || isUserLoading) ? (
            <div className="flex justify-center items-center h-48">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : matches.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Opponent</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead className="text-right">Your PnL</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {matches.map(match => {
                  const { result, pnl, opponentName } = getMatchResult(match);
                  return (
                    <TableRow key={match.id}>
                      <TableCell>{format(new Date(match.createdAt), 'MMM d, yyyy')}</TableCell>
                      <TableCell>{opponentName}</TableCell>
                      <TableCell>
                        <Badge variant={result === 'Win' ? 'default' : result === 'Loss' ? 'destructive' : 'secondary'}
                          className={result === 'Win' ? 'bg-green-600' : ''}>
                           {result === 'Win' && <Trophy className="mr-2 h-4 w-4" />}
                           {result === 'Loss' && <Frown className="mr-2 h-4 w-4" />}
                           {result === 'Draw' && <Shield className="mr-2 h-4 w-4" />}
                          {result}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right font-mono ${pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {formatCurrency(pnl)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center p-8 text-muted-foreground">You have no completed matches.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
