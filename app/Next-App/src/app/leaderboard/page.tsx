// src/app/leaderboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Trophy } from 'lucide-react';
import { GameSession, Player } from '@/lib/types';

interface LeaderboardEntry {
  rank: number;
  playerName: string;
  totalPnl: number;
  battles: number;
  player: Player;
}

export default function LeaderboardPage() {
  const firestore = useFirestore();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!firestore) return;

    const fetchLeaderboardData = async () => {
      setIsLoading(true);
      try {
        const sessionsRef = collection(firestore, 'gameSessions');
        const q = query(sessionsRef, where('status', '==', 'finished'));
        
        const querySnapshot = await getDocs(q);
        const playerStats: { [userId: string]: { totalPnl: number; battles: number; player: Player } } = {};

        querySnapshot.forEach(doc => {
          const session = doc.data() as GameSession;
          // Filter out AI games
          if (session.players.length !== 2 || session.players.some(p => p.userId.endsWith('-ai'))) {
              return;
          }
          
          session.players.forEach(player => {
            if (!playerStats[player.userId]) {
              playerStats[player.userId] = { totalPnl: 0, battles: 0, player: player };
            }
            playerStats[player.userId].totalPnl += player.totalPnl;
            playerStats[player.userId].battles += 1;
          });
        });
        
        const sortedLeaderboard = Object.values(playerStats)
          .sort((a, b) => b.totalPnl - a.totalPnl)
          .map((entry, index) => ({
            rank: index + 1,
            playerName: entry.player.name,
            totalPnl: entry.totalPnl,
            battles: entry.battles,
            player: entry.player,
          }));

        setLeaderboard(sortedLeaderboard);
      } catch (error) {
        console.error("Error fetching leaderboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboardData();
  }, [firestore]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };
  
  const getRankColor = (rank: number) => {
    if (rank === 1) return 'text-yellow-400';
    if (rank === 2) return 'text-gray-400';
    if (rank === 3) return 'text-yellow-600';
    return '';
  };


  return (
    <div className="container mx-auto max-w-4xl p-4">
       <Card className="border-0 shadow-none bg-transparent">
        <CardHeader>
          <CardTitle className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl" style={{ color: 'hsl(var(--primary))' }}>
            Global Leaderboard
          </CardTitle>
          <CardDescription className="text-lg text-muted-foreground">
            See how you stack up against the best traders on VersaTrade. Ranked by total PnL.
          </CardDescription>
        </CardHeader>
      </Card>
      
       <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : leaderboard.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Rank</TableHead>
                  <TableHead>Player</TableHead>
                  <TableHead>Battles</TableHead>
                  <TableHead className="text-right">Total PnL</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboard.map(({ rank, playerName, totalPnl, battles }) => (
                  <TableRow key={rank}>
                    <TableCell className={`font-bold text-lg ${getRankColor(rank)}`}>
                        <div className="flex items-center">
                           {rank <= 3 && <Trophy className="mr-2 h-5 w-5"/>}
                           {rank}
                        </div>
                    </TableCell>
                    <TableCell>{playerName}</TableCell>
                    <TableCell>{battles}</TableCell>
                    <TableCell className={`text-right font-mono ${totalPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {formatCurrency(totalPnl)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
             <div className="text-center p-8 text-muted-foreground">No completed 1v1 matches yet. Play a game to start the leaderboard!</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
