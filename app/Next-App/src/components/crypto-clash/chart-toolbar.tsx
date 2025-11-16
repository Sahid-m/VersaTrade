'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, TrendingUp, Minus, MapPin, MoveUpRight } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useSound } from '@/hooks/use-sound';

export type DrawingTool = 'trend-line' | 'horizontal-line' | 'arrow-marker' | null;

interface ChartToolbarProps {
  activeTool: DrawingTool;
  onToolSelect: (tool: DrawingTool) => void;
  onClearDrawings: () => void;
}

export function ChartToolbar({ activeTool, onToolSelect, onClearDrawings }: ChartToolbarProps) {
  const { playSound } = useSound();

  const handleToolSelect = (tool: DrawingTool) => {
    playSound('click');
    onToolSelect(activeTool === tool ? null : tool);
  };
  
  const handleClear = () => {
    playSound('click');
    onClearDrawings();
  }

  return (
    <div className="absolute top-12 left-2 z-10 bg-background/80 p-1 rounded-md border border-border shadow-sm flex items-center gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant={activeTool ? 'secondary' : 'ghost'} size="icon" onClick={() => playSound('click')}>
            <Pencil className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={() => handleToolSelect('trend-line')}>
            <TrendingUp className="mr-2 h-4 w-4" />
            <span>Trend Line</span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => handleToolSelect('horizontal-line')}>
            <Minus className="mr-2 h-4 w-4" />
            <span>Horizontal Line</span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => handleToolSelect('arrow-marker')}>
            <MapPin className="mr-2 h-4 w-4" />
            <span>Arrow Marker</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button variant="ghost" size="icon" onClick={handleClear}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
