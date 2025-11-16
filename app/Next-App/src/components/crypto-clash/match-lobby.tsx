'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Bot, Users, Sword, Swords, Timer, ArrowLeft, PlusCircle, LogIn, ChevronDown } from 'lucide-react';
import { type OpponentType, type GameMode } from './game-container';
import { useUser } from '@/hooks/use-user';
import { Input } from '../ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth, useFirestore, useMemoFirebase } from '@/firebase';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { nanoid } from 'nanoid';
import { GameSession, Player } from '@/lib/types';
import { signInAnonymously } from 'firebase/auth';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '../ui/dropdown-menu';
import { getRandomNftAvatar } from '@/lib/nfts';
import { createOnChainGame, joinOnChainGame } from '@/app/multiplayer-actions';
import { useDoc } from '@/firebase/firestore/use-doc';

interface MatchLobbyProps {
  onStart: (opponentType: OpponentType, mode: GameMode, sessionId?: string) => void;
}

interface UserProfile {
    uid: string;
    displayName: string;
    email: string;
    photoURL: string;
    walletAddress: string;
    privateKey: string;
}

const INITIAL_CASH = 100000;
const RUSH_DURATION = 180; // 3 minutes
const RAPID_DURATION = 480; // 8 minutes
const CUSTOM_AVATAR_EMAIL = "adithyapraveen.work@gmail.com";
const CUSTOM_AVATAR_URL = "https://firebasestorage.googleapis.com/v0/b/firebase-st-v-2-backend-9395518541-698f2.appspot.com/o/2d-pixel-art-boy-face_8829-2810.avif?alt=media";

type LobbyScreen = 'main' | 'ai' | 'player';

export function MatchLobby({ onStart }: MatchLobbyProps) {
  const [screen, setScreen] = useState<LobbyScreen>('main');
  const { user, isLoading } = useUser();
  const { toast } = useToast();
  const [joinCode, setJoinCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const firestore = useFirestore();
  const auth = useAuth();

  const userDocRef = useMemoFirebase(() => (firestore && user ? doc(firestore, 'users', user.uid) : null), [firestore, user]);
  const { data: userProfile } = useDoc<UserProfile>(userDocRef);
  
  const getPlayerAvatar = (uid: string, email?: string | null) => {
    if (email === CUSTOM_AVATAR_EMAIL) {
      return CUSTOM_AVATAR_URL;
    }
    const existingAvatar = localStorage.getItem(`avatar_${uid}`);
    if (existingAvatar) {
      return existingAvatar;
    }
    const newAvatar = getRandomNftAvatar();
    localStorage.setItem(`avatar_${uid}`, newAvatar);
    return newAvatar;
  };

  const handleCreateGame = async (mode: GameMode) => {
    setIsCreating(true);
    try {
      let currentUser = user;
      if (!currentUser && auth) {
        const userCredential = await signInAnonymously(auth);
        currentUser = userCredential.user;
      }
      
      if (!firestore || !currentUser || !userProfile) {
        throw new Error("Firestore, user, or user profile not available");
      }

      const sessionId = nanoid(6).toUpperCase();
      const gameSessionRef = doc(firestore, 'gameSessions', sessionId);
      const gameDuration = mode === 'blitz' ? RUSH_DURATION : RAPID_DURATION;

      // Call the on-chain function first
      toast({ title: 'Approving token transfer...' });
      const onChainResult = await createOnChainGame({ privateKey: userProfile.privateKey });
      
      if (onChainResult.success && onChainResult.transactionHash && typeof onChainResult.gameId !== 'undefined') {
        toast({
          title: 'On-chain game created!',
          description: (
            <a
              href={`https://testnet.arcscan.app/tx/${onChainResult.transactionHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline break-all"
            >
              {onChainResult.transactionHash}
            </a>
          ),
        });
      
        const hostPlayer: Player = {
          userId: currentUser.uid,
          name: currentUser.displayName || `Player ${currentUser.uid.substring(0, 4)}`,
          avatarUrl: currentUser.photoURL || getPlayerAvatar(currentUser.uid, currentUser.email),
          cash: INITIAL_CASH,
          initialValue: INITIAL_CASH,
          leverage: 1,
          longs: [],
          shorts: [],
          totalPnl: 0,
          tradeHistory: [],
        };

        const newSession: GameSession = {
          id: sessionId,
          players: [hostPlayer],
          status: 'waiting',
          marketSymbol: 'BTCUSDT',
          candlestickData: [],
          createdAt: Date.now(),
          gameDuration: gameDuration,
          timer: gameDuration,
          hostId: currentUser.uid,
          chatMessages: [],
          onChainGameId: onChainResult.gameId,
        };

        await setDoc(gameSessionRef, newSession);
        onStart('human', mode, sessionId);
      } else {
        throw new Error(onChainResult.error || "Failed to create on-chain game.");
      }


    } catch (error: any) {
      console.error('Error creating game session:', error);
      toast({
        title: 'Error Creating Game',
        description: error.message || 'Could not create game session.',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinGame = async (mode: GameMode) => {
    if (!user || !auth || !firestore || !userProfile) {
      toast({ title: 'Authentication or profile not available', variant: 'destructive' });
      if (auth && !user) await signInAnonymously(auth);
      return;
    }
    if (!joinCode) {
      toast({ title: 'Code Required', description: 'Please enter a game code.', variant: 'destructive' });
      return;
    }
    
    setIsJoining(true);
    
    try {
      const sessionRef = doc(firestore, 'gameSessions', joinCode.toUpperCase());
      const sessionSnap = await getDoc(sessionRef);

      if (!sessionSnap.exists()) throw new Error('Game session not found. Check the code.');
      
      const sessionData = sessionSnap.data() as GameSession;

      if (sessionData.hostId === user.uid) {
        throw new Error("You cannot join your own game.");
      }

      if (sessionData.players.length >= 2) throw new Error('This game session is already full.');

      if(typeof sessionData.onChainGameId === 'undefined') {
        throw new Error('On-chain game ID not found for this session.');
      }
      
      // Call on-chain join function
      toast({ title: 'Approving token transfer...' });
      const joinResult = await joinOnChainGame({ privateKey: userProfile.privateKey, gameId: sessionData.onChainGameId });
      
      if (joinResult.success && joinResult.transactionHash) {
         toast({
          title: 'Successfully joined on-chain game!',
          description: (
            <a
              href={`https://testnet.arcscan.app/tx/${joinResult.transactionHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline break-all"
            >
              {joinResult.transactionHash}
            </a>
          ),
        });

        const guestPlayer: Player = {
            userId: user.uid, 
            name: user.displayName || `Player ${user.uid.substring(0,4)}`, 
            avatarUrl: user.photoURL || getPlayerAvatar(user.uid, user.email),
            cash: INITIAL_CASH, 
            initialValue: INITIAL_CASH, 
            leverage: 1, 
            longs: [], 
            shorts: [], 
            totalPnl: 0, 
            tradeHistory: [],
        };

        await updateDoc(sessionRef, {
          players: [...sessionData.players, guestPlayer],
          status: 'playing',
        });

        onStart('human', mode, joinCode.toUpperCase());
      } else {
         throw new Error(joinResult.error || 'Failed to join on-chain game.');
      }

    } catch (error: any) {
       console.error("Error joining game:", error);
       toast({ title: 'Error Joining Game', description: error.message, variant: 'destructive' });
    } finally {
      setIsJoining(false);
    }
  };

  const renderMainMenu = () => (
    <div className="animate-fade-in space-y-4">
        <Button size="lg" className="w-full justify-start h-20 text-left text-lg" onClick={() => setScreen('ai')}>
            <Bot className="mr-4 h-8 w-8" />
            Play vs AI
        </Button>
        <Button size="lg" className="w-full justify-start h-20 text-left text-lg" onClick={() => setScreen('player')}>
            <Users className="mr-4 h-8 w-8" />
            Play vs Player
        </Button>
    </div>
  );

  const renderSubMenu = (opponentType: OpponentType) => (
     <div className="animate-fade-in space-y-4">
       <Button variant="ghost" onClick={() => setScreen('main')} className="absolute top-4 left-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
       </Button>
       
       <div className="space-y-2">
         <h3 className="font-semibold text-lg flex items-center justify-center">
            {opponentType === 'ai' ? <Bot className="mr-2"/> : <Users className="mr-2" />}
            {opponentType === 'ai' ? 'Play vs AI' : 'Play vs Player'}
         </h3>
         <p className="text-sm text-muted-foreground text-center">Choose your game mode.</p>
       </div>
       
       {opponentType === 'ai' ? (
         <>
            <Button size="lg" className="w-full justify-start h-16 text-left" onClick={() => onStart('ai', 'blitz')}>
                <Timer className="mr-3 h-5 w-5" />
                <div><p className="font-semibold">Blitz</p><p className="font-normal text-xs">3 Minute Game</p></div>
            </Button>
            <Button size="lg" className="w-full justify-start h-16 text-left" onClick={() => onStart('ai', 'rapid')}>
                 <Timer className="mr-3 h-5 w-5" />
                <div><p className="font-semibold">Rapid</p><p className="font-normal text-xs">8 Minute Game</p></div>
            </Button>
         </>
       ): (
          <>
            {renderPlayerModeOption('blitz', 'Blitz', '3 Minute Game')}
            {renderPlayerModeOption('rapid', 'Rapid', '8 Minute Game')}
          </>
       )}
     </div>
  );
  
  const renderPlayerModeOption = (mode: GameMode, title: string, description: string) => (
    <Card className="p-4">
        <div className="flex justify-between items-center">
             <div className="flex items-center">
                <Timer className="mr-3 h-5 w-5 text-primary" />
                <div>
                    <p className="font-semibold">{title}</p>
                    <p className="text-xs text-muted-foreground">{description}</p>
                </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button>
                    Play <ChevronDown className="ml-2 h-4 w-4"/>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleCreateGame(mode)} disabled={isCreating}>
                  <PlusCircle className="mr-2 h-4 w-4"/> Create Game
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                   <div className="flex items-center w-full">
                     <LogIn className="mr-2 h-4 w-4"/>
                     <Input 
                        placeholder="Game Code"
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                        className="h-8 mr-2 uppercase"
                        onClick={(e) => e.stopPropagation()}
                     />
                     <Button size="sm" onClick={() => handleJoinGame(mode)} disabled={isJoining}>Join</Button>
                   </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
        </div>
    </Card>
  );


  const renderContent = () => {
    switch (screen) {
      case 'ai': return renderSubMenu('ai');
      case 'player': return renderSubMenu('human');
      default: return renderMainMenu();
    }
  }

  return (
    <div className="flex h-[60vh] items-center justify-center">
      <Card className="w-full max-w-md text-center shadow-lg bg-background relative overflow-hidden">
        <CardHeader>
          <CardTitle className="text-3xl font-bold tracking-tighter" style={{ color: 'hsl(var(--primary))' }}>
            <div className="flex items-center justify-center">
                <Swords className="mr-2 h-8 w-8" /> VersaTrade
            </div>
          </CardTitle>
          <CardDescription className="text-muted-foreground pt-2">
            Choose your battle.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
}
