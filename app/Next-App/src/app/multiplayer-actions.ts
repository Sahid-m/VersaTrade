

'use client';

import { 
    doc, 
    runTransaction, 
    updateDoc,
    arrayUnion,
    type Firestore 
} from 'firebase/firestore';
import { GameSession, Player, Trade, Position, ChatMessage } from '@/lib/types';
import { nanoid } from 'nanoid';
import { ethers, parseUnits } from 'ethers';

const ARC_TESTNET_RPC = "https://arc-testnet.g.alchemy.com/v2/R4_BWzH4o-v4_c9jRvKWj";
const GAME_CONTRACT_ADDRESS = "0xeE82D81f67CC102f738693393eE6A536D629848E";
const USDC_TOKEN_ADDRESS = "0x3600000000000000000000000000000000000000";

const GAME_ABI = [
    {
      "type":"function",
      "name":"createGame",
      "inputs":[
          {"name":"token","type":"address","internalType":"address"},
          {"name":"betAmount","type":"uint256","internalType":"uint256"}
      ],
      "outputs":[],
      "stateMutability":"payable"
    },
    {
        "type": "function",
        "name": "joinGame",
        "inputs": [{"name":"gameId","type":"uint256","internalType":"uint256"}],
        "outputs": [],
        "stateMutability": "payable"
    },
    {
        "type": "event",
        "name": "GameCreated",
        "inputs": [
            {"name":"gameId","type":"uint256","indexed":true,"internalType":"uint256"},
            {"name":"creator","type":"address","indexed":true,"internalType":"address"},
            {"name":"token","type":"address","indexed":false,"internalType":"address"},
            {"name":"betAmount","type":"uint256","indexed":false,"internalType":"uint256"}
        ],
        "anonymous": false
    }
];

const ERC20_ABI = [
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)"
];


type CreateOnChainGameParams = {
  privateKey: string;
};

export async function createOnChainGame(params: CreateOnChainGameParams): Promise<{ success: boolean; transactionHash?: string; error?: string; approvalHash?: string; gameId?: number; }> {
    try {
        const provider = new ethers.JsonRpcProvider(ARC_TESTNET_RPC);
        const wallet = new ethers.Wallet(params.privateKey, provider);
        const gameContract = new ethers.Contract(GAME_CONTRACT_ADDRESS, GAME_ABI, wallet);
        const usdcContract = new ethers.Contract(USDC_TOKEN_ADDRESS, ERC20_ABI, wallet);

        const betAmount = parseUnits("0.69", 6);

        const approveTx = await usdcContract.approve(GAME_CONTRACT_ADDRESS, betAmount);
        const approveReceipt = await approveTx.wait();
        if (approveReceipt.status !== 1) {
            return { success: false, error: 'USDC approval transaction failed' };
        }
        
        const createGameTx = await gameContract.createGame(USDC_TOKEN_ADDRESS, betAmount);
        const receipt = await createGameTx.wait();

        if (receipt.status === 1) {
            const iface = new ethers.Interface(GAME_ABI);
            let gameId: number | undefined;

            for (const log of receipt.logs) {
                try {
                    const parsedLog = iface.parseLog(log);
                    if (parsedLog && parsedLog.name === 'GameCreated') {
                        gameId = Number(parsedLog.args.gameId);
                        break;
                    }
                } catch(e) {
                    // ignore logs that don't match the ABI
                }
            }

            if(typeof gameId === 'undefined'){
                return { success: false, error: 'Could not find GameCreated event in transaction logs.'}
            }

            return { success: true, transactionHash: receipt.hash, approvalHash: approveReceipt.hash, gameId };
        } else {
            return { success: false, error: 'Create game transaction failed' };
        }
    } catch (error: any) {
        console.error("Error creating on-chain game:", error);
        return { success: false, error: error.reason || error.message || 'An unknown error occurred' };
    }
}

type JoinOnChainGameParams = {
  privateKey: string;
  gameId: number;
};

export async function joinOnChainGame(params: JoinOnChainGameParams): Promise<{ success: boolean; transactionHash?: string; error?: string; approvalHash?: string }> {
    try {
        const provider = new ethers.JsonRpcProvider(ARC_TESTNET_RPC);
        const wallet = new ethers.Wallet(params.privateKey, provider);
        const gameContract = new ethers.Contract(GAME_CONTRACT_ADDRESS, GAME_ABI, wallet);
        const usdcContract = new ethers.Contract(USDC_TOKEN_ADDRESS, ERC20_ABI, wallet);
        
        const betAmount = parseUnits("0.69", 6);

        const approveTx = await usdcContract.approve(GAME_CONTRACT_ADDRESS, betAmount);
        const approveReceipt = await approveTx.wait();
        if (approveReceipt.status !== 1) {
            return { success: false, error: 'USDC approval for joining failed' };
        }

        const joinGameTx = await gameContract.joinGame(params.gameId);
        const receipt = await joinGameTx.wait();

        if (receipt.status === 1) {
            return { success: true, transactionHash: receipt.hash, approvalHash: approveReceipt.hash };
        } else {
            return { success: false, error: 'Join game transaction failed' };
        }

    } catch(error: any) {
        console.error("Error joining on-chain game:", error);
        return { success: false, error: error.reason || error.message || 'An unknown error occurred' };
    }
}



export async function handleTradeAction(firestore: Firestore, sessionId: string, userId: string, usdtAmount: number, side: 'long' | 'short', currentPrice: number) {
    const sessionRef = doc(firestore, "gameSessions", sessionId);
    
    if (currentPrice === 0) {
        console.error("Invalid price, trade not executed.");
        return;
    }
    
    try {
        await runTransaction(firestore, async (transaction) => {
            const sessionSnap = await transaction.get(sessionRef);
            if (!sessionSnap.exists()) {
                throw "Game session not found!";
            }
            
            const sessionData = sessionSnap.data() as GameSession;
            const playerIndex = sessionData.players.findIndex(p => p.userId === userId);

            if (playerIndex !== -1) {
                const player = sessionData.players[playerIndex];
                const { leverage } = player;

                if (player.cash < usdtAmount) {
                    console.error("Insufficient cash for trade");
                    return;
                }

                const positionSizeUsd = usdtAmount * leverage;
                const fee = positionSizeUsd * 0.001;
                const btcAmount = (positionSizeUsd - fee) / currentPrice;

                const tradeRecord: Trade = {
                    id: nanoid(),
                    side: side,
                    amountBtc: btcAmount,
                    price: currentPrice,
                    leverage: leverage,
                    pnl: 0,
                    status: 'open',
                    timestamp: Date.now(),
                    isOpponent: player.userId !== sessionData.hostId,
                    type: 'open',
                    collateral: usdtAmount
                };

                const updatedPlayers = [...sessionData.players];
                const updatedPlayer = {...updatedPlayers[playerIndex]};
                
                updatedPlayer.cash -= usdtAmount;
                const newPosition: Position = { entryPrice: currentPrice, amountBtc: btcAmount, collateral: usdtAmount, leverage: leverage };

                if (side === 'long') {
                    updatedPlayer.longs.push(newPosition);
                } else {
                    updatedPlayer.shorts.push(newPosition);
                }
                updatedPlayer.tradeHistory.push(tradeRecord);
                updatedPlayers[playerIndex] = updatedPlayer;

                transaction.update(sessionRef, { players: updatedPlayers });
            }
        });
    } catch (error) {
        console.error("Error in handleTradeAction:", error);
    }
}


export async function handleClosePositionsAction(firestore: Firestore, sessionId: string, userId: string, currentPrice: number) {
    const sessionRef = doc(firestore, "gameSessions", sessionId);

     if (currentPrice === 0) {
        console.error("Invalid price, close positions not executed.");
        return;
    }
    
     try {
        await runTransaction(firestore, async (transaction) => {
            const sessionSnap = await transaction.get(sessionRef);
            if(!sessionSnap.exists()) {
                throw "Game session not found!";
            }
            
            const sessionData = sessionSnap.data() as GameSession;
            const playerIndex = sessionData.players.findIndex(p => p.userId === userId);

            if(playerIndex !== -1) {
                const player = sessionData.players[playerIndex];
                
                if(player.longs.length === 0 && player.shorts.length === 0) return;

                let cashGained = 0;
                let totalPnl = 0;
                const closedTrades: Trade[] = [];
                const now = Date.now();
                
                player.longs.forEach(long => {
                    const pnl = (currentPrice - long.entryPrice) * long.amountBtc;
                    totalPnl += pnl;
                    cashGained += long.collateral + pnl;
                    closedTrades.push({ id: nanoid(), side: 'long', amountBtc: long.amountBtc, price: currentPrice, leverage: long.leverage, pnl, status: 'closed', timestamp: now, type: 'close', collateral: long.collateral, isOpponent: player.userId !== sessionData.hostId, });
                });

                player.shorts.forEach(short => {
                    const pnl = (short.entryPrice - currentPrice) * short.amountBtc;
                    totalPnl += pnl;
                    cashGained += short.collateral + pnl;
                    closedTrades.push({ id: nanoid(), side: 'short', amountBtc: short.amountBtc, price: currentPrice, leverage: short.leverage, pnl, status: 'closed', timestamp: now, type: 'close', collateral: short.collateral, isOpponent: player.userId !== sessionData.hostId, });
                });

                const updatedPlayers = [...sessionData.players];
                const updatedPlayer = {
                  ...updatedPlayers[playerIndex],
                   cash: player.cash + cashGained, 
                   longs: [], 
                   shorts: [], 
                   totalPnl: player.totalPnl + totalPnl, 
                   tradeHistory: [...player.tradeHistory, ...closedTrades]
                };
                updatedPlayers[playerIndex] = updatedPlayer;
                
                transaction.update(sessionRef, { players: updatedPlayers });
            }
        });
    } catch (error) {
        console.error("Error in handleClosePositionsAction:", error);
    }
}


export async function updateLeverageAction(firestore: Firestore, sessionId: string, userId: string, newLeverage: number) {
    const sessionRef = doc(firestore, "gameSessions", sessionId);
    
    try {
        await runTransaction(firestore, async (transaction) => {
            const sessionSnap = await transaction.get(sessionRef);
             if (!sessionSnap.exists()) {
                throw "Document does not exist!";
            }
            
            const sessionData = sessionSnap.data() as GameSession;
            const playerIndex = sessionData.players.findIndex(p => p.userId === userId);

            if (playerIndex !== -1) {
                const updatedPlayers = [...sessionData.players];
                updatedPlayers[playerIndex].leverage = newLeverage;
                transaction.update(sessionRef, { players: updatedPlayers });
            }
        });
    } catch (e) {
        console.log("Transaction failed: ", e);
    }
}


export async function updateTimerAction(firestore: Firestore, sessionId: string, newTime: number) {
    const sessionRef = doc(firestore, "gameSessions", sessionId);
    await updateDoc(sessionRef, { 
      timer: newTime,
      status: newTime <= 0 ? 'finished' : 'playing'
    });
}

export async function sendChatMessageAction(firestore: Firestore, sessionId: string, senderId: string, senderName: string, text: string) {
    if (!text.trim()) return;

    const sessionRef = doc(firestore, "gameSessions", sessionId);
    
    const newMessage: ChatMessage = {
        id: nanoid(),
        senderId,
        senderName,
        text: text.trim(),
        timestamp: Date.now()
    };
    
    try {
        await updateDoc(sessionRef, {
            chatMessages: arrayUnion(newMessage)
        });
    } catch (error) {
        console.error("Error sending chat message:", error);
    }
}
