
'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { nanoid } from 'nanoid';
import { MatchLobby } from './match-lobby';
import { PlayerCard } from './player-card';
import { TradingChart } from './trading-chart';
import { TradeControls } from './trade-controls';
import { SessionEndModal } from './session-end-modal';
import { Card } from '@/components/ui/card';
import { type Player, type CandlestickData, type Trade, type GameSession, DrawnLine, DrawnHorizontalLine, DrawnArrowMarker } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { CircleAlert, Bot, LineChart, CandlestickChart, Users, Loader2, Volume2, VolumeX } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { TradeHistoryTabs } from './trade-history-tabs';
import { useUser } from '@/hooks/use-user';
import { useFirestore, useMemoFirebase } from '@/firebase';
import { handleTradeAction, handleClosePositionsAction, updateTimerAction, updateLeverageAction, sendChatMessageAction } from '@/app/multiplayer-actions';
import { ChartToolbar, DrawingTool } from './chart-toolbar';
import { useSound } from '@/hooks/use-sound';
import { Button } from '@/components/ui/button';
import { ScoreBar } from './score-bar';
import { Timer } from './timer';
import { GameChat } from './game-chat';
import { getRandomNftAvatar } from '@/lib/nfts';

const INITIAL_CASH = 100000;
const RUSH_DURATION = 180; // 3 minutes
const RAPID_DURATION = 480; // 8 minutes
const TRADE_FEE = 0.001; // 0.1%

export type OpponentType = 'ai' | 'human';
export type GameMode = 'blitz' | 'rapid';


export function GameContainer() {
  const [matchState, setMatchState] = useState<'lobby' | 'playing' | 'finished'>('lobby');
  const [opponentType, setOpponentType] = useState<OpponentType>('ai');
  const [gameDuration, setGameDuration] = useState(RAPID_DURATION);
  const [timer, setTimer] = useState(gameDuration);
  const [player1, setPlayer1] = useState<Player | null>(null);
  const [player2, setPlayer2] = useState<Player | null>(null);
  const [candlestickData, setCandlestickData] = useState<CandlestickData[]>([]);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [showCandlesticks, setShowCandlesticks] = useState(true);
  const [showOpponentPopups, setShowOpponentPopups] = useState(true);
  const { toast } = useToast();
  const [marketSymbol, setMarketSymbol] = useState('BTCUSDT');
  const { user } = useUser();
  const firestore = useFirestore();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [gameSession, setGameSession] = useState<GameSession | null>(null);
  const [isWaiting, setIsWaiting] = useState(false);
  const [localLeverage, setLocalLeverage] = useState(1);
  const [activeDrawingTool, setActiveDrawingTool] = useState<DrawingTool>(null);
  const [drawnLines, setDrawnLines] = useState<DrawnLine[]>([]);
  const [drawnHorizontalLines, setDrawnHorizontalLines] = useState<DrawnHorizontalLine[]>([]);
  const [drawnArrowMarkers, setDrawnArrowMarkers] = useState<DrawnArrowMarker[]>([]);
  const [volatility, setVolatility] = useState<'high' | 'low' | null>(null);

  const { isMuted, toggleMute, playSound } = useSound();
  const previousP1Portfolio = useRef<number | null>(null);
  const previousP2Portfolio = useRef<number | null>(null);
  const priceDirectionRef = useRef<'up' | 'down' | null>(null);
  const player2Ref = useRef(player2);

  useEffect(() => {
    player2Ref.current = player2;
  }, [player2]);

  const sessionDocRef = useMemoFirebase(() => (firestore && sessionId ? doc(firestore, "gameSessions", sessionId) : null), [firestore, sessionId]);

  useEffect(() => {
    if (!sessionDocRef) return;

    const unsubscribe = onSnapshot(sessionDocRef, (doc) => {
      if (doc.exists()) {
        const sessionData = doc.data() as GameSession;
        setGameSession(sessionData);
        setGameDuration(sessionData.gameDuration);

        if(sessionData.candlestickData && sessionData.candlestickData.length > 0) {
          setCandlestickData(sessionData.candlestickData);
           if (sessionData.candlestickData.length > 0) {
            setCurrentPrice(sessionData.candlestickData[sessionData.candlestickData.length - 1].close);
          }
        }
        
        setTimer(sessionData.timer);
        setMarketSymbol(sessionData.marketSymbol);
        
        const hostPlayer = sessionData.players.find(p => p.userId === sessionData.hostId);
        const otherPlayer = sessionData.players.find(p => p.userId !== sessionData.hostId);

        let p1, p2;
        if(user?.uid === sessionData.hostId) {
          p1 = hostPlayer;
          p2 = otherPlayer;
        } else {
          p1 = otherPlayer;
          p2 = hostPlayer;
        }
        
        setPlayer1(p1 || null);
        setPlayer2(p2 || null);

        if (p1 && p1.leverage !== localLeverage) {
            setLocalLeverage(p1.leverage);
        }

        if(sessionData.status === 'playing') {
          setIsWaiting(false);
          setMatchState('playing');
        } else if(sessionData.status === 'finished') {
          setMatchState('finished');
        } else if (sessionData.status === 'waiting') {
           setMatchState('lobby'); // Remain in lobby
           setIsWaiting(true); // Host is waiting
        }
      }
    });

    return () => unsubscribe();
  }, [sessionDocRef, user?.uid, localLeverage]);
  
  const allTrades = useMemo(() => {
    if (!gameSession) return [];
    return gameSession.players.flatMap(p => p.tradeHistory || []).sort((a,b) => b.timestamp - a.timestamp);
  }, [gameSession]);


  const resetAiGame = useCallback(async (duration: number) => {
    setGameDuration(duration);
    setTimer(duration);
    const p1Name = user?.displayName || 'You';
    const p2Name = 'Opponent';
    setPlayer1(getInitialPlayerState(p1Name, user?.uid || 'p1'));
    setPlayer2(getInitialPlayerState(p2Name, 'p2-ai', true));
    setOpponentType('ai');
    setMatchState('playing');
    setCandlestickData([]);
    setSessionId(null);
    setGameSession(null);
    setMarketSymbol('BTCUSDT');
    setLocalLeverage(1);
    setDrawnLines([]);
    setDrawnHorizontalLines([]);
    setDrawnArrowMarkers([]);

    try {
        const klinesResponse = await fetch(`https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1s&limit=60`);
        if (!klinesResponse.ok) throw new Error('Failed to fetch klines');
        const data = await klinesResponse.json();
        const initialCandles: CandlestickData[] = data.map((d: any) => ({
            time: d[0] / 1000,
            open: parseFloat(d[1]),
            high: parseFloat(d[2]),
            low: parseFloat(d[3]),
            close: parseFloat(d[4]),
        }));

        setCandlestickData(initialCandles);
        if (initialCandles.length > 0) {
            const firstPrice = initialCandles[initialCandles.length - 1].close;
            setCurrentPrice(firstPrice);
            priceDirectionRef.current = null;
        }
    } catch (error) {
        console.error("Failed to fetch initial market data for AI game", error);
        toast({
            title: 'Data Fetch Error',
            description: 'Could not load initial market data.',
            variant: 'destructive',
        });
    }
  }, [toast, user]);


  const getInitialPlayerState = (name: string, userId: string, isOpponent = false): Player => ({
      userId,
      name: name,
      avatarUrl: isOpponent ? getRandomNftAvatar() : (user?.photoURL || localStorage.getItem(`avatar_${userId}`) || getRandomNftAvatar()),
      isOpponent,
      cash: INITIAL_CASH,
      initialValue: INITIAL_CASH,
      leverage: 1,
      longs: [],
      shorts: [],
      totalPnl: 0,
      tradeHistory: [],
  });
  
  const handleStartMatch = (type: OpponentType, mode: GameMode, newSessionId?: string) => {
    playSound('click');
    const duration = mode === 'blitz' ? RUSH_DURATION : RAPID_DURATION;
    if (type === 'ai') {
      resetAiGame(duration);
    } else if (newSessionId) {
      setGameDuration(duration);
      setCandlestickData([]);
      setSessionId(newSessionId);
      setOpponentType('human');
      setMatchState('lobby'); // Go to waiting state
      setIsWaiting(true); // Manually set waiting for joining
      setDrawnLines([]);
      setDrawnHorizontalLines([]);
      setDrawnArrowMarkers([]);
    }
  };
  
  // This useEffect now handles both the WebSocket connection and the AI logic.
  useEffect(() => {
    if (matchState !== 'playing' || !marketSymbol) return;

    let aiInterval: NodeJS.Timeout | undefined;
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${marketSymbol.toLowerCase()}@kline_1s`);
    
    // AI Logic as a separate function for clarity
    const runAiLogic = (price: number) => {
      const currentPlayer2 = player2Ref.current;
      if (!currentPlayer2 || candlestickData.length < 5) return;

      const decision = Math.random();
      let newPlayerState = { ...currentPlayer2 };

      // Close positions logic
      if (newPlayerState.longs.length > 0 || newPlayerState.shorts.length > 0) {
          if (decision < 0.4) { // 40% chance to close
              let cashGained = 0;
              let totalPnl = 0;
              const now = Date.now();
              const closedTrades: Trade[] = [];

              newPlayerState.longs.forEach(long => {
                  const pnl = (price - long.entryPrice) * long.amountBtc;
                  totalPnl += pnl;
                  cashGained += long.collateral + pnl;
                  closedTrades.push({ id: nanoid(), side: 'long', amountBtc: long.amountBtc, price, leverage: long.leverage, pnl, status: 'closed', timestamp: now, type: 'close', collateral: long.collateral, isOpponent: true });
              });
              newPlayerState.shorts.forEach(short => {
                  const pnl = (short.entryPrice - price) * short.amountBtc;
                  totalPnl += pnl;
                  cashGained += short.collateral + pnl;
                  closedTrades.push({ id: nanoid(), side: 'short', amountBtc: short.amountBtc, price, leverage: short.leverage, pnl, status: 'closed', timestamp: now, type: 'close', collateral: short.collateral, isOpponent: true });
              });

              newPlayerState.cash += cashGained;
              newPlayerState.longs = [];
              newPlayerState.shorts = [];
              newPlayerState.totalPnl += totalPnl;
              newPlayerState.tradeHistory.push(...closedTrades);

              if (showOpponentPopups) toast({ title: 'AI Opponent', description: `Closed positions for a PnL of ${totalPnl.toFixed(2)}` });
              setPlayer2(newPlayerState);
              return;
          }
      }
      
      // Open positions logic
      if (newPlayerState.longs.length === 0 && newPlayerState.shorts.length === 0) {
          if (decision < 0.8) { // 80% chance to open a trade if none are open
              const side = Math.random() > 0.5 ? 'long' : 'short';
              const leverageOptions = [1, 40, 80, 20, 50, 100];
              const leverage = leverageOptions[Math.floor(Math.random() * leverageOptions.length)];
              const collateral = (newPlayerState.cash * (Math.random() * 0.4 + 0.4)); // Risk 40-80% of cash

              if (newPlayerState.cash > collateral) {
                  const positionSizeUsd = collateral * leverage;
                  const btcAmount = positionSizeUsd / price;

                  newPlayerState.cash -= collateral;

                  const tradeRecord: Trade = { id: nanoid(), side, amountBtc: btcAmount, price, leverage, pnl: 0, status: 'open', timestamp: Date.now(), isOpponent: true, type: 'open', collateral };

                  if (side === 'long') {
                      newPlayerState.longs.push({ entryPrice: price, amountBtc: btcAmount, collateral, leverage });
                  } else {
                      newPlayerState.shorts.push({ entryPrice: price, amountBtc: btcAmount, collateral, leverage });
                  }
                  newPlayerState.tradeHistory.push(tradeRecord);
                  if (showOpponentPopups) toast({ title: 'AI Opponent', description: `Opened a ${leverage}x ${side} position.` });
                  setPlayer2(newPlayerState);
              }
          }
      }
    };

    ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        const kline = message.k;
        const newCandle: CandlestickData = {
          time: Math.floor(kline.t / 1000),
          open: parseFloat(kline.o),
          high: parseFloat(kline.h),
          low: parseFloat(kline.l),
          close: parseFloat(kline.c),
        };
        const newPrice = newCandle.close;

        setCurrentPrice(prevPrice => {
            if (prevPrice !== 0 && prevPrice !== newPrice) {
                const newDirection = newPrice > prevPrice ? 'up' : 'down';
                if (priceDirectionRef.current && priceDirectionRef.current !== newDirection) {
                    playSound(newDirection === 'up' ? 'price-up' : 'price-down', { volume: 0.3 });
                }
                priceDirectionRef.current = newDirection;
            }
            return newPrice;
        });

        const priceChange = Math.abs(newPrice - currentPrice) / currentPrice;
        if (priceChange > 0.0005) {
          setVolatility('high');
          setTimeout(() => setVolatility(null), 500);
        }
        
        setCandlestickData(prevData => {
            const lastCandle = prevData[prevData.length - 1];
            if (lastCandle && lastCandle.time === newCandle.time) {
                const newData = [...prevData];
                newData[prevData.length - 1] = newCandle;
                return newData;
            }
            return [...prevData, newCandle];
        });
    };
    
    ws.onerror = (error) => {
      // Ignore errors if the socket is intentionally closing
      if (ws.readyState === WebSocket.CLOSING || ws.readyState === WebSocket.CLOSED) {
        return;
      }
      console.error('WebSocket Error:', error);
      toast({
        title: 'Connection Error',
        description: 'Could not connect to real-time price feed.',
        variant: 'destructive',
      });
    };

    ws.onopen = () => {
      if (opponentType === 'ai') {
        aiInterval = setInterval(() => runAiLogic(currentPrice), 200);
      }
    }

    return () => {
      if (aiInterval) {
        clearInterval(aiInterval);
      }
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    };
  }, [matchState, marketSymbol, toast, playSound, opponentType, candlestickData.length, showOpponentPopups, currentPrice]);

  const handleTrade = async (usdtAmount: number, side: 'long' | 'short') => {
      if (!user || !player1 || !firestore) return;
      
      if (player1.cash < Math.abs(usdtAmount)) {
          toast({ title: 'Insufficient Collateral', description: "You don't have enough cash for this position.", variant: 'destructive' });
          return;
      }
      playSound('woosh', { pitch: side === 'long' ? 'high' : 'low' });
      
      if (opponentType === 'ai') {
         const positionSizeUsd = usdtAmount * localLeverage;
         const fee = positionSizeUsd * TRADE_FEE;
         const btcAmount = (positionSizeUsd - fee) / currentPrice;

         const newPlayerState = { ...player1 };
         newPlayerState.cash -= usdtAmount;

          const tradeRecord: Trade = {
            id: nanoid(),
            side: side,
            amountBtc: btcAmount,
            price: currentPrice,
            leverage: localLeverage,
            pnl: 0,
            status: 'open',
            timestamp: Date.now(),
            isOpponent: false,
            type: 'open',
            collateral: usdtAmount
          };
          if (side === 'long') newPlayerState.longs.push({ entryPrice: currentPrice, amountBtc: btcAmount, collateral: usdtAmount, leverage: localLeverage });
          else newPlayerState.shorts.push({ entryPrice: currentPrice, amountBtc: btcAmount, collateral: usdtAmount, leverage: localLeverage });
          
          newPlayerState.tradeHistory.push(tradeRecord);
          setPlayer1(newPlayerState);
          toast({ title: `${side === 'long' ? 'Long' : 'Short'} Order Executed`, description: `Opened a ${localLeverage}x ${side} of ${btcAmount.toFixed(6)} BTC.`});

      } else if (sessionId) {
        await handleTradeAction(firestore, sessionId, user.uid, usdtAmount, side, currentPrice);
      }
  };

  const handleClosePositions = async () => {
    if (!user || !player1 || !firestore) return;
    playSound('woosh');

     if (opponentType === 'ai') {
        let cashGained = 0;
        let totalPnl = 0;
        const closedTrades: Trade[] = [];
        const now = Date.now();
        
        player1.longs.forEach(long => {
            const pnl = (currentPrice - long.entryPrice) * long.amountBtc;
            totalPnl += pnl;
            cashGained += long.collateral + pnl;
            closedTrades.push({ id: nanoid(), side: 'long', amountBtc: long.amountBtc, price: currentPrice, leverage: long.leverage, pnl, status: 'closed', timestamp: now, type: 'close', collateral: long.collateral });
        });

        player1.shorts.forEach(short => {
            const pnl = (short.entryPrice - currentPrice) * short.amountBtc;
            totalPnl += pnl;
            cashGained += short.collateral + pnl;
            closedTrades.push({ id: nanoid(), side: 'short', amountBtc: short.amountBtc, price: currentPrice, leverage: short.leverage, pnl, status: 'closed', timestamp: now, type: 'close', collateral: short.collateral });
        });
        
        if(closedTrades.length === 0) return;

        setPlayer1({ ...player1, cash: player1.cash + cashGained, longs: [], shorts: [], totalPnl: player1.totalPnl + totalPnl, tradeHistory: [...player1.tradeHistory, ...closedTrades] });
        toast({ title: "Positions Closed", description: `Realized PnL: ${totalPnl.toFixed(2)}`});
    } else if (sessionId) {
      await handleClosePositionsAction(firestore, sessionId, user.uid, currentPrice);
    }
  };

  const handleLeverageChange = (newLeverage: number) => {
    if (!user || !firestore) return;
    playSound('click', { volume: 0.5 });
    setLocalLeverage(newLeverage);
    if (opponentType === 'ai') {
        setPlayer1(p => p ? ({ ...p, leverage: newLeverage }) : null);
    } else if (sessionId) {
        updateLeverageAction(firestore, sessionId, user.uid, newLeverage);
    }
  };
  
  const handleSendMessage = async (message: string) => {
    if (opponentType !== 'human' || !sessionId || !user || !firestore) return;
    await sendChatMessageAction(firestore, sessionId, user.uid, player1?.name || 'Player', message);
  };

  const calculatePortfolioForAI = useCallback((p: Player | null, price: number) => {
      if (!p) return { portfolioValue: 0, unrealizedPnl: 0 };
      
      let unrealizedPnl = 0;
      p.longs.forEach(long => {
          unrealizedPnl += (price - long.entryPrice) * long.amountBtc;
      });
      p.shorts.forEach(short => {
          unrealizedPnl += (short.entryPrice - price) * short.amountBtc;
      });
      
      const portfolioValue = p.cash + (p.longs.reduce((sum, pos) => sum + pos.collateral, 0) + p.shorts.reduce((sum, pos) => sum + pos.collateral, 0)) + unrealizedPnl;
      
      return { portfolioValue, unrealizedPnl };
  }, []);

  useEffect(() => {
    if (matchState !== 'playing') return;
    
    const isHost = opponentType === 'human' ? user?.uid === gameSession?.hostId : true;
    if (!isHost) return;

    let heartbeatInterval: NodeJS.Timeout;
    const timerInterval = setInterval(() => {
      const newTime = timer - 1;
      
      if (newTime <= 10 && newTime > 0) {
          if (!heartbeatInterval) {
              playSound('heartbeat', { volume: 0.3 });
              heartbeatInterval = setInterval(() => {
                  if (timer <= 5) {
                      playSound('heartbeat', { volume: 0.5 });
                  } else {
                      playSound('heartbeat', { volume: 0.3 });
                  }
              }, 1000);
          }
      }
      
      if (newTime >= 0) {
        if (opponentType === 'human' && sessionId && firestore) {
          updateTimerAction(firestore, sessionId, newTime);
        } else {
          setTimer(newTime);
        }
        if (newTime === 0) {
          setMatchState('finished');
        }
      } else {
        clearInterval(timerInterval);
        if (heartbeatInterval) clearInterval(heartbeatInterval);
      }
    }, 1000);
    
    return () => {
        clearInterval(timerInterval);
        if (heartbeatInterval) clearInterval(heartbeatInterval);
    };
  }, [matchState, sessionId, gameSession, user, opponentType, playSound, timer, firestore]);

  const player1Portfolio = useMemo(() => {
    if (!player1) return { portfolioValue: 0, pnl: 0 };
    const unrealizedPnl = player1.longs.reduce((pnl, pos) => pnl + (currentPrice - pos.entryPrice) * pos.amountBtc, 0) +
                        player1.shorts.reduce((pnl, pos) => pnl + (pos.entryPrice - currentPrice) * pos.amountBtc, 0);
    const portfolioValue = player1.cash + player1.longs.reduce((sum, p) => sum + p.collateral, 0) + player1.shorts.reduce((sum, p) => sum + p.collateral, 0) + unrealizedPnl;
    return { portfolioValue, pnl: unrealizedPnl };
  }, [player1, currentPrice]);

  const player2Portfolio = useMemo(() => {
    if (!player2) return { portfolioValue: 0, pnl: 0 };
    const unrealizedPnl = player2.longs.reduce((pnl, pos) => pnl + (currentPrice - pos.entryPrice) * pos.amountBtc, 0) +
                        player2.shorts.reduce((pnl, pos) => pnl + (pos.entryPrice - currentPrice) * pos.amountBtc, 0);
    const portfolioValue = player2.cash + player2.longs.reduce((sum, p) => sum + p.collateral, 0) + player2.shorts.reduce((sum, p) => sum + p.collateral, 0) + unrealizedPnl;
    return { portfolioValue, pnl: unrealizedPnl };
  }, [player2, currentPrice]);
  
  useEffect(() => {
    const p1Val = player1Portfolio.portfolioValue;
    const p2Val = player2Portfolio.portfolioValue;

    if (previousP1Portfolio.current !== null && previousP2Portfolio.current !== null) {
      const wasP1Leading = previousP1Portfolio.current > previousP2Portfolio.current;
      const isP1Leading = p1Val > p2Val;

      if (!wasP1Leading && isP1Leading) {
        playSound('ding', { pitch: 'high' });
      } else if (wasP1Leading && !isP1Leading) {
        playSound('ding', { pitch: 'low' });
      }
    }

    previousP1Portfolio.current = p1Val;
    previousP2Portfolio.current = p2Val;
  }, [player1Portfolio, player2Portfolio, playSound]);

  if (!user) {
     return <MatchLobby onStart={handleStartMatch} />;
  }

  if (matchState === 'lobby' && !isWaiting) {
    return <MatchLobby onStart={handleStartMatch} />;
  }
  
  if (isWaiting) {
    return (
      <div className="flex h-[calc(100vh-80px)] flex-col items-center justify-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-lg text-muted-foreground">Waiting for opponent to join...</p>
        <Card className="p-4 bg-muted">
          <p className="text-sm text-center text-muted-foreground">Share this game code with your friend:</p>
          <p className="text-2xl font-mono tracking-widest text-center">{sessionId}</p>
        </Card>
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    if (seconds < 0) seconds = 0;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };
  
  const combinedTrades = opponentType === 'ai' ? (player1?.tradeHistory || []).concat(player2?.tradeHistory || []) : allTrades;


  return (
    <>
      <ScoreBar p1={player1} p2={player2} p1Portfolio={player1Portfolio.portfolioValue} p2Portfolio={player2Portfolio.portfolioValue} />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[calc(100vh-80px)] p-1 md:p-4">
        <div className="lg:col-span-3 flex flex-col gap-4">
          <PlayerCard player={player1} currentPrice={currentPrice} volatility={volatility} />
          <PlayerCard player={player2} currentPrice={currentPrice} volatility={volatility} />
        </div>
        
        <div className="lg:col-span-6 flex flex-col gap-4 min-h-[50vh] lg:min-h-0">
            <Card className="flex-grow p-1 md:p-2 relative">
                <Badge variant="outline" className="absolute top-2 left-2 z-10 text-sm md:text-base px-3 py-1 font-mono bg-background/80">
                  {marketSymbol}
                </Badge>
                <ChartToolbar 
                  activeTool={activeDrawingTool} 
                  onToolSelect={setActiveDrawingTool}
                  onClearDrawings={() => {
                    setDrawnLines([]);
                    setDrawnHorizontalLines([]);
                    setDrawnArrowMarkers([]);
                  }}
                />
                <TradingChart
                  data={candlestickData}
                  showCandlesticks={showCandlesticks}
                  drawingTool={activeDrawingTool}
                  drawnLines={drawnLines}
                  setDrawnLines={setDrawnLines}
                  drawnHorizontalLines={drawnHorizontalLines}
                  setDrawnHorizontalLines={setDrawnHorizontalLines}
                  drawnArrowMarkers={drawnArrowMarkers}
                  setDrawnArrowMarkers={setDrawnArrowMarkers}
                />
            </Card>
            <div className="flex-grow-0">
                <TradeControls
                  leverage={localLeverage}
                  onTrade={handleTrade}
                  onClose={handleClosePositions}
                  onLeverageChange={handleLeverageChange}
                  currentPrice={currentPrice}
                  marketSymbol={marketSymbol}
                />
            </div>
             <div className="lg:col-span-12">
                  <TradeHistoryTabs allTrades={combinedTrades} currentPrice={currentPrice} opponentType={opponentType} player1={player1} player2={player2}/>
             </div>
        </div>
        
        <div className="lg:col-span-3 flex flex-col gap-4">
          <Card className="flex flex-col gap-4 p-4">
            <div className="flex justify-center items-center w-full">
              <Timer currentTime={timer} totalTime={gameDuration} />
            </div>
            <div className="grid grid-cols-2 gap-4 w-full border-t pt-4">
              <div className="flex items-center justify-center space-x-2">
                <Switch
                  id="candlestick-toggle"
                  checked={showCandlesticks}
                  onCheckedChange={(checked) => {
                    playSound('click');
                    setShowCandlesticks(checked);
                  }}
                />
                <Label
                  htmlFor="candlestick-toggle"
                  className="flex items-center gap-1"
                >
                  {showCandlesticks ? (
                    <CandlestickChart className="h-4 w-4" />
                  ) : (
                    <LineChart className="h-4 w-4" />
                  )}
                  <span>Candles</span>
                </Label>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <Switch
                  id="opponent-popups-toggle"
                  checked={showOpponentPopups}
                  onCheckedChange={(checked) => {
                    playSound('click');
                    setShowOpponentPopups(checked);
                  }}
                  disabled={opponentType === 'human'}
                />
                <Label
                  htmlFor="opponent-popups-toggle"
                  className="flex items-center gap-1"
                >
                  <Bot className="h-4 w-4" />
                  <span>AI Popups</span>
                </Label>
              </div>
            </div>
            <div className="flex justify-between items-center w-full border-t pt-4">
              <Badge variant="outline" className="flex-grow-0">
                {opponentType === 'ai' ? (
                  <>
                    <Bot className="h-4 w-4 mr-2" /> AI Match
                  </>
                ) : (
                  <>
                    <Users className="h-4 w-4 mr-2" />
                    1v1 Match
                  </>
                )}
              </Badge>
              <Button variant="ghost" size="icon" onClick={toggleMute}>
                {isMuted ? (
                  <VolumeX className="h-5 w-5" />
                ) : (
                  <Volume2 className="h-5 w-5" />
                )}
              </Button>
            </div>
          </Card>

          {opponentType === 'human' && gameSession && user && (
            <GameChat
              messages={gameSession.chatMessages}
              onSendMessage={handleSendMessage}
              currentUser={user}
            />
          )}
        </div>
        
      </div>
      {matchState === 'finished' && player1 && player2 && (
        <SessionEndModal
          isOpen={matchState === 'finished'}
          onClose={() => {
            setMatchState('lobby');
            setSessionId(null);
            setGameSession(null);
            setCandlestickData([]);
          }}
          player1={player1}
          player2={player2}
          player1Pnl={player1Portfolio.portfolioValue - player1.initialValue}
          player2Pnl={player2Portfolio.portfolioValue - player2.initialValue}
        />
      )}
    </>
  );
}
