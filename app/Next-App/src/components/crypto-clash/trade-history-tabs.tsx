'use client';

import React, { useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { type Player, type Trade } from '@/lib/types';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { OpponentType } from './game-container';

interface TradeHistoryTabsProps {
  player1: Player | null;
  player2: Player | null;
  allTrades: Trade[];
  currentPrice: number;
  opponentType: OpponentType;
}

const TradeHistoryTabsMemo = ({ player1, player2, allTrades, currentPrice, opponentType }: TradeHistoryTabsProps) => {
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };
  
  const openPositions = useMemo(() => {
    if (!player1) return [];
    
    const extractPositions = (p: Player, isOpponent: boolean) => {
      const longs = p.longs.map(l => ({ player: p.name, id: `long-${p.userId}-${l.entryPrice}-${l.amountBtc}`, side: 'long' as const, amountBtc: l.amountBtc, entryPrice: l.entryPrice, pnl: (currentPrice - l.entryPrice) * l.amountBtc }));
      const shorts = p.shorts.map(s => ({ player: p.name, id: `short-${p.userId}-${s.entryPrice}-${s.amountBtc}`, side: 'short' as const, amountBtc: s.amountBtc, entryPrice: s.entryPrice, pnl: (s.entryPrice - currentPrice) * s.amountBtc }));
      return [...longs, ...shorts];
    }
    
    const p1Positions = extractPositions(player1, false);
    const p2Positions = player2 ? extractPositions(player2, true) : [];
    
    return [...p1Positions, ...p2Positions];
  }, [player1, player2, currentPrice]);

  return (
    <Tabs defaultValue="positions" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="positions">Current Positions ({openPositions.length})</TabsTrigger>
        <TabsTrigger value="history">Trade History</TabsTrigger>
      </TabsList>
      <TabsContent value="positions">
        <ScrollArea className="h-48">
          <Table>
            <TableHeader>
              <TableRow>
                {opponentType === 'human' && <TableHead>Player</TableHead>}
                <TableHead>Side</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Entry Price</TableHead>
                <TableHead>Unrealized PnL</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {openPositions.length > 0 ? (
                openPositions.map((pos) => (
                  <TableRow key={pos.id}>
                    {opponentType === 'human' && <TableCell>{pos.player}</TableCell>}
                    <TableCell>
                       <Badge variant={pos.side === 'long' ? 'default' : 'destructive'} className={pos.side === 'long' ? 'bg-green-600' : 'bg-red-600'}>
                        {pos.side}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono">{pos.amountBtc.toFixed(6)}</TableCell>
                    <TableCell className="font-mono">{formatCurrency(pos.entryPrice)}</TableCell>
                    <TableCell className={`font-mono ${pos.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>{formatCurrency(pos.pnl)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={opponentType === 'human' ? 5 : 4} className="text-center text-muted-foreground">
                    No open positions
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </TabsContent>
      <TabsContent value="history">
        <ScrollArea className="h-48">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Player</TableHead>
                <TableHead>Side</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>PnL</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
               {allTrades.map((trade) => (
                 <TableRow key={trade.id}>
                    <TableCell className="text-xs text-muted-foreground">{format(trade.timestamp, 'HH:mm:ss')}</TableCell>
                    <TableCell>{trade.isOpponent ? player2?.name : player1?.name}</TableCell>
                    <TableCell>
                      <Badge variant={trade.side === 'long' ? 'default' : 'destructive'} className={trade.side === 'long' ? 'bg-green-600' : 'bg-red-600'}>
                        {trade.side}
                      </Badge>
                    </TableCell>
                    <TableCell>
                        <Badge variant="secondary">{trade.type}</Badge>
                    </TableCell>
                    <TableCell className="font-mono">{trade.amountBtc.toFixed(6)}</TableCell>
                    <TableCell className="font-mono">{formatCurrency(trade.price)}</TableCell>
                    <TableCell className={`font-mono ${trade.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {trade.type === 'close' ? formatCurrency(trade.pnl) : 'N/A'}
                    </TableCell>
                 </TableRow>
               ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </TabsContent>
    </Tabs>
  );
}

export const TradeHistoryTabs = React.memo(TradeHistoryTabsMemo);
