'use client';

import React, { useMemo } from 'react';
import { type Player } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowDown, ArrowUp, DollarSign, Wallet, Layers, Minus, Plus, CircleAlert } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { cn } from '@/lib/utils';

interface PlayerCardProps {
  player: Player | null;
  currentPrice: number;
  volatility: 'high' | 'low' | null;
}

const PlayerCardMemo = ({ player, currentPrice, volatility }: PlayerCardProps) => {
  const { portfolioValue, unrealizedPnl, liquidationPrice } = useMemo(() => {
    if (!player) return { portfolioValue: 0, unrealizedPnl: 0, liquidationPrice: 0 };
    
    const unrealizedPnl = player.longs.reduce((pnl, pos) => pnl + (currentPrice - pos.entryPrice) * pos.amountBtc, 0) +
                          player.shorts.reduce((pnl, pos) => pnl + (pos.entryPrice - currentPrice) * pos.amountBtc, 0);

    const portfolioValue = player.cash + 
                           player.longs.reduce((sum, pos) => sum + pos.collateral, 0) +
                           player.shorts.reduce((sum, pos) => sum + pos.collateral, 0) +
                           unrealizedPnl;

    let liquidationPrice = 0;
    if (player.leverage > 1) {
        const totalLongBtc = player.longs.reduce((s, l) => s + l.amountBtc, 0);
        const totalShortBtc = player.shorts.reduce((s, sh) => s + sh.amountBtc, 0);
        const netPositionBtc = totalLongBtc - totalShortBtc;

        if (netPositionBtc !== 0) {
            const totalCollateral = player.longs.reduce((acc, pos) => acc + pos.collateral, 0) + player.shorts.reduce((acc, pos) => acc + pos.collateral, 0);
            const maintenanceMargin = 0.005 * Math.abs(netPositionBtc * currentPrice);
            const marginBalance = player.cash + totalCollateral + unrealizedPnl;

            if (netPositionBtc > 0) { // Long position
                liquidationPrice = (player.longs.reduce((sum, pos) => sum + pos.entryPrice * pos.amountBtc, 0) / totalLongBtc) - (marginBalance - maintenanceMargin) / netPositionBtc;
            } else { // Short position
                liquidationPrice = (player.shorts.reduce((sum, pos) => sum + pos.entryPrice * pos.amountBtc, 0) / totalShortBtc) - (marginBalance - maintenanceMargin) / netPositionBtc;
            }
        }
    }
    
    return { portfolioValue, unrealizedPnl, liquidationPrice };
  }, [player, currentPrice]);

  if (!player) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 p-4 rounded-lg bg-secondary/50">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-6 w-32" />
          </div>
          <div className="grid grid-cols-1 gap-4 pt-2 text-sm">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  const pnlPercent = player.initialValue > 0 ? ((portfolioValue - player.initialValue) / player.initialValue) * 100 : 0;
  const isProfit = portfolioValue >= player.initialValue;

  const totalLongsBtc = player.longs.reduce((sum, p) => sum + p.amountBtc, 0);
  const totalShortsBtc = player.shorts.reduce((sum, p) => sum + p.amountBtc, 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };
  
  return (
    <Card className={cn("flex flex-col transition-all duration-300", volatility === 'high' && (isProfit ? 'volatility-flash-green' : 'volatility-flash-red'))}>
      <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-4">
        <Avatar className="h-12 w-12 border-2 border-primary">
          <AvatarImage src={player.avatarUrl} alt={player.name} />
          <AvatarFallback className="text-xl bg-primary text-primary-foreground">{player.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <CardTitle className="text-2xl">{player.name}</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow space-y-4">
        <div className="space-y-2 p-4 rounded-lg bg-secondary/50">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center">
                    <Wallet className="h-4 w-4 mr-2" />
                    Portfolio Value
                </div>
                {player.leverage && (
                  <div className="flex items-center font-semibold">
                    {player.leverage}x <Layers className="h-4 w-4 ml-1" />
                  </div>
                )}
            </div>
            <div className="text-4xl font-bold tracking-tighter">
                {formatCurrency(portfolioValue)}
            </div>
            <div
              className={`flex items-center text-lg font-semibold ${
                isProfit ? 'text-green-500' : 'text-red-500'
              }`}
            >
              {isProfit ? (
                <ArrowUp className="h-5 w-5 mr-1" />
              ) : (
                <ArrowDown className="h-5 w-5 mr-1" />
              )}
              {formatCurrency(portfolioValue - player.initialValue)} ({pnlPercent.toFixed(2)}%)
            </div>
             {liquidationPrice && liquidationPrice > 0 && (
              <div className="flex items-center text-xs text-destructive animate-pulse">
                <CircleAlert className="h-3 w-3 mr-1" />
                Liquidation at {formatCurrency(liquidationPrice)}
              </div>
            )}
        </div>
        
        <div className="grid grid-cols-1 gap-4 pt-2 text-sm">
            <div className="flex items-center space-x-3 p-3 rounded-md bg-muted/50">
                <div className="p-2 bg-muted rounded-md">
                    <DollarSign className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                    <div className="text-muted-foreground">Available Cash</div>
                    <div className="font-mono text-base font-semibold">{formatCurrency(player.cash)}</div>
                </div>
            </div>
             <div className="flex items-center space-x-3 p-3 rounded-md bg-muted/50">
                <div className="p-2 bg-green-500/20 rounded-md">
                    <Plus className="h-5 w-5 text-green-500" />
                </div>
                <div>
                    <div className="text-muted-foreground">Total Longs (BTC)</div>
                    <div className="font-mono text-base font-semibold">{totalLongsBtc.toFixed(6)}</div>
                </div>
            </div>
             <div className="flex items-center space-x-3 p-3 rounded-md bg-muted/50">
                <div className="p-2 bg-red-500/20 rounded-md">
                    <Minus className="h-5 w-5 text-red-500" />
                </div>
                <div>
                    <div className="text-muted-foreground">Total Shorts (BTC)</div>
                    <div className="font-mono text-base font-semibold">{totalShortsBtc.toFixed(6)}</div>
                </div>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}

export const PlayerCard = React.memo(PlayerCardMemo);
