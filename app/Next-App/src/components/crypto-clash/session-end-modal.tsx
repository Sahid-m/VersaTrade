'use client';

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { type Player } from '@/lib/types';
import { Trophy, ShieldAlert, Share2 } from 'lucide-react';
import { Button } from '../ui/button';

interface SessionEndModalProps {
  isOpen: boolean;
  onClose: () => void;
  player1: Player;
  player2: Player;
  player1Pnl: number;
  player2Pnl: number;
}

export function SessionEndModal({
  isOpen,
  onClose,
  player1,
  player2,
  player1Pnl,
  player2Pnl
}: SessionEndModalProps) {

  const winner = player1Pnl > player2Pnl ? player1 : player2;
  const isDraw = player1Pnl === player2Pnl;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };
  
  const handleShare = () => {
    const tweetText = `I just finished a trading battle on VersaTrade! Check out this awesome crypto trading game. #VersaTrade #Crypto`;
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    window.open(tweetUrl, '_blank');
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader className="items-center">
          {isDraw ? (
             <ShieldAlert className="h-16 w-16 text-yellow-400" />
          ) : (
            <Trophy className="h-16 w-16 text-yellow-400" />
          )}
          <AlertDialogTitle className="text-2xl">
            {isDraw ? "It's a Draw!" : `${winner?.name} Wins!`}
          </AlertDialogTitle>
          <AlertDialogDescription>The trading session has ended.</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="my-4 space-y-4">
          <div className="flex justify-between items-center p-3 rounded-lg bg-secondary">
            <span className="font-semibold">{player1?.name}'s Total Profit:</span>
            <span className={`font-bold ${player1Pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatCurrency(player1Pnl)}
            </span>
          </div>
          <div className="flex justify-between items-center p-3 rounded-lg bg-secondary">
            <span className="font-semibold">{player2?.name}'s Total Profit:</span>
            <span className={`font-bold ${player2Pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatCurrency(player2Pnl)}
            </span>
          </div>
        </div>
        <AlertDialogFooter className="sm:justify-between gap-2">
           <Button variant="outline" onClick={handleShare}>
              <Share2 className="mr-2 h-4 w-4" /> Share to X
            </Button>
          <AlertDialogAction onClick={onClose} className="w-full sm:w-auto">
            Play Again
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
