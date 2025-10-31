'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Symbol = '🍒' | '🍋' | '🍊' | '🔔' | '⭐' | '💎' | '7️⃣' | '🎰';

interface SlotMachineProps {
  onClose?: () => void;
}

// Vegas-style symbol weights (lower = rarer)
const SYMBOL_WEIGHTS: Record<Symbol, number> = {
  '🍒': 10, // Cherry - most common
  '🍋': 8,  // Lemon
  '🍊': 8,  // Orange
  '🔔': 5,  // Bell
  '⭐': 3,  // Star
  '💎': 2,  // Diamond - rare
  '7️⃣': 1,  // Seven - very rare
  '🎰': 1,  // Jackpot - very rare
};

const SYMBOLS: Symbol[] = Object.keys(SYMBOL_WEIGHTS) as Symbol[];

// Calculate weighted random symbol
function getRandomSymbol(): Symbol {
  const totalWeight = Object.values(SYMBOL_WEIGHTS).reduce((a, b) => a + b, 0);
  let random = Math.random() * totalWeight;
  
  for (const [symbol, weight] of Object.entries(SYMBOL_WEIGHTS)) {
    random -= weight;
    if (random <= 0) {
      return symbol as Symbol;
    }
  }
  
  return SYMBOLS[0];
}

// Win multipliers based on rarity
const WIN_MULTIPLIERS: Record<Symbol, number> = {
  '🍒': 2,
  '🍋': 3,
  '🍊': 3,
  '🔔': 5,
  '⭐': 10,
  '💎': 25,
  '7️⃣': 50,
  '🎰': 100,
};

interface WinResult {
  type: 'horizontal' | 'vertical' | 'diagonal' | 'none';
  line: number[];
  multiplier: number;
}

function checkWin(grid: Symbol[][]): WinResult {
  // Check horizontal wins (3 rows)
  for (let row = 0; row < 3; row++) {
    if (grid[row][0] === grid[row][1] && grid[row][1] === grid[row][2]) {
      const symbol = grid[row][0];
      return {
        type: 'horizontal',
        line: [row * 3, row * 3 + 1, row * 3 + 2],
        multiplier: WIN_MULTIPLIERS[symbol],
      };
    }
  }
  
  // Check vertical wins (3 columns)
  for (let col = 0; col < 3; col++) {
    if (grid[0][col] === grid[1][col] && grid[1][col] === grid[2][col]) {
      const symbol = grid[0][col];
      return {
        type: 'vertical',
        line: [col, col + 3, col + 6],
        multiplier: WIN_MULTIPLIERS[symbol],
      };
    }
  }
  
  // Check diagonal wins (top-left to bottom-right)
  if (grid[0][0] === grid[1][1] && grid[1][1] === grid[2][2]) {
    const symbol = grid[0][0];
    return {
      type: 'diagonal',
      line: [0, 4, 8],
      multiplier: WIN_MULTIPLIERS[symbol],
    };
  }
  
  // Check diagonal wins (top-right to bottom-left)
  if (grid[0][2] === grid[1][1] && grid[1][1] === grid[2][0]) {
    const symbol = grid[0][2];
    return {
      type: 'diagonal',
      line: [2, 4, 6],
      multiplier: WIN_MULTIPLIERS[symbol],
    };
  }
  
  return { type: 'none', line: [], multiplier: 0 };
}

export function SlotMachine({ onClose }: SlotMachineProps) {
  const [grid, setGrid] = useState<Symbol[][]>([
    [SYMBOLS[0], SYMBOLS[0], SYMBOLS[0]],
    [SYMBOLS[0], SYMBOLS[0], SYMBOLS[0]],
    [SYMBOLS[0], SYMBOLS[0], SYMBOLS[0]],
  ]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winResult, setWinResult] = useState<WinResult | null>(null);
  const [isSpinningCell, setIsSpinningCell] = useState<Set<number>>(new Set());

  const spin = async () => {
    if (isSpinning) return;
    
    setIsSpinning(true);
    setWinResult(null);
    setIsSpinningCell(new Set([0, 1, 2, 3, 4, 5, 6, 7, 8]));
    
    // Spin animation - each cell spins independently
    const spinDuration = 2000; // 2 seconds
    const spinSteps = 20;
    const stepDuration = spinDuration / spinSteps;
    
    // Create intermediate grids for animation
    for (let step = 0; step < spinSteps; step++) {
      await new Promise((resolve) => setTimeout(resolve, stepDuration));
      
      const newGrid: Symbol[][] = [];
      for (let row = 0; row < 3; row++) {
        newGrid[row] = [];
        for (let col = 0; col < 3; col++) {
          // More randomness as we get closer to the end
          if (step < spinSteps - 3) {
            newGrid[row][col] = getRandomSymbol();
          } else {
            // Last few steps: more likely to keep current symbol (building suspense)
            if (Math.random() > 0.3) {
              newGrid[row][col] = getRandomSymbol();
            } else {
              newGrid[row][col] = grid[row][col];
            }
          }
        }
      }
      setGrid(newGrid);
    }
    
    // Final result with controlled randomness (can adjust for more/less wins)
    const finalGrid: Symbol[][] = [];
    for (let row = 0; row < 3; row++) {
      finalGrid[row] = [];
      for (let col = 0; col < 3; col++) {
        finalGrid[row][col] = getRandomSymbol();
      }
    }
    
    setGrid(finalGrid);
    setIsSpinningCell(new Set());
    
    // Check for wins
    const result = checkWin(finalGrid);
    setWinResult(result);
    setIsSpinning(false);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl">🎰 Slot Machine</CardTitle>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              ✕
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 3x3 Grid */}
        <div className="grid grid-cols-3 gap-2 p-4 bg-gradient-to-br from-purple-900 to-blue-900 rounded-lg border-4 border-yellow-400 shadow-lg">
          {grid.flat().map((symbol, index) => {
            const row = Math.floor(index / 3);
            const col = index % 3;
            const cellSymbol = grid[row][col];
            const isWinningCell = winResult?.line.includes(index);
            
            return (
              <div
                key={index}
                className={cn(
                  "aspect-square flex items-center justify-center text-5xl md:text-6xl rounded-lg border-2 transition-all duration-300",
                  isWinningCell
                    ? "bg-green-500 border-green-300 shadow-lg scale-110 animate-pulse"
                    : "bg-white/90 border-gray-300",
                  isSpinningCell.has(index) && "animate-spin"
                )}
              >
                {cellSymbol}
              </div>
            );
          })}
        </div>

        {/* Win Message */}
        {winResult && winResult.type !== 'none' && (
          <div className="p-4 bg-gradient-to-r from-green-500 to-yellow-500 rounded-lg text-center animate-bounce">
            <div className="text-2xl font-bold text-white mb-1">
              🎉 WINNER! 🎉
            </div>
            <div className="text-lg text-white">
              {winResult.type === 'horizontal' && 'Horizontal Line!'}
              {winResult.type === 'vertical' && 'Vertical Line!'}
              {winResult.type === 'diagonal' && 'Diagonal Line!'}
            </div>
            <div className="text-xl font-bold text-white mt-2">
              {winResult.multiplier}x Multiplier!
            </div>
          </div>
        )}

        {winResult && winResult.type === 'none' && (
          <div className="p-3 bg-gray-200 rounded-lg text-center">
            <div className="text-muted-foreground">No win this time. Try again!</div>
          </div>
        )}

        {/* Spin Button */}
        <Button
          onClick={spin}
          disabled={isSpinning}
          className="w-full text-lg py-6 font-bold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
          size="lg"
        >
          {isSpinning ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin">🎰</span>
              Spinning...
            </span>
          ) : (
            '🎰 SPIN 🎰'
          )}
        </Button>

        {/* Info */}
        <div className="text-xs text-center text-muted-foreground space-y-1">
          <div>Match 3 symbols in a row, column, or diagonal to win!</div>
          <div className="flex flex-wrap justify-center gap-2 mt-2">
            <span>🍒 x2</span>
            <span>🍋 x3</span>
            <span>🍊 x3</span>
            <span>🔔 x5</span>
            <span>⭐ x10</span>
            <span>💎 x25</span>
            <span>7️⃣ x50</span>
            <span>🎰 x100</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
