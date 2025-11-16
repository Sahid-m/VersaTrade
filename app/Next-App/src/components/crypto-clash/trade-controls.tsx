'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Layers, Minus, Plus, X, TrendingUp } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface TradeControlsProps {
  leverage: number;
  onTrade: (amount: number, side: 'long' | 'short') => void;
  onClose: () => void;
  onLeverageChange: (leverage: number) => void;
  currentPrice: number;
  marketSymbol: string;
}

export function TradeControls({ leverage, onTrade, onClose, onLeverageChange, currentPrice, marketSymbol }: TradeControlsProps) {
  const [amount, setAmount] = useState('100');

  const handleTrade = (side: 'long' | 'short') => {
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) return;
    onTrade(numericAmount, side);
  };

  const handleLeverageChange = (value: string) => {
    const newLeverage = parseInt(value, 10);
    if (!isNaN(newLeverage)) {
        onLeverageChange(newLeverage);
    }
  };

  const positionSize = (parseFloat(amount) || 0) * leverage;
  const assetValue = currentPrice > 0 ? positionSize / currentPrice : 0;
  const assetName = marketSymbol.replace('USDT', '');
  const leverageOptions = [1, 5, 10, 20, 40, 60, 80, 100];

  return (
    <Card className="bg-card/50">
      <CardContent className="p-4 flex flex-col items-center justify-between gap-4">
        <div className="w-full flex flex-col md:flex-row items-center gap-4">
            <div className="w-full md:w-1/3">
                 <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-xs">USDT</span>
                    <Input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Collateral"
                    className="text-center md:text-left text-base h-12 pl-14"
                    />
                </div>
                 <p className="text-xs text-muted-foreground mt-1 text-center md:text-left">
                    Size: ${positionSize.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </p>
            </div>
            <div className="w-full md:w-2/3 flex flex-col gap-2">
                 <div className="flex items-center gap-3">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Layers className="h-5 w-5" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Leverage</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                     <Select onValueChange={handleLeverageChange} value={leverage.toString()}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select leverage" />
                        </SelectTrigger>
                        <SelectContent>
                            {leverageOptions.map(option => (
                                <SelectItem key={option} value={option.toString()}>{option}x</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                    ≈ {assetValue.toFixed(6)} {assetName}
                </p>
            </div>
        </div>
        
        <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-2 items-center">
            <div className="hidden md:flex items-center justify-center p-2 rounded-md bg-secondary/50 col-span-1">
                <TrendingUp className="h-5 w-5 mr-2 text-primary" />
                <span className="font-mono text-lg font-semibold tracking-wider">
                    ${currentPrice.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </span>
            </div>

            <Button
                onClick={() => handleTrade('long')}
                className="h-12 text-base bg-green-600 hover:bg-green-600/90 text-white"
            >
                <Plus className="mr-2 h-5 w-5" />
                Long
            </Button>
            <Button
                onClick={() => handleTrade('short')}
                className="h-12 text-base bg-red-600 hover:bg-red-600/90 text-white"
            >
                <Minus className="mr-2 h-5 w-5" />
                Short
            </Button>
            <Button
                onClick={onClose}
                variant="destructive"
                className="h-12 text-base"
            >
                <X className="mr-2 h-5 w-5" />
                Close All
            </Button>
        </div>
      </CardContent>
    </Card>
  );
}
