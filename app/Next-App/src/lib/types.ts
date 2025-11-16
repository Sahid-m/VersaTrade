export type Trade = {
  id: string;
  side: 'long' | 'short';
  amountBtc: number;
  price: number;
  leverage: number;
  pnl: number;
  status: 'open' | 'closed';
  timestamp: number;
  type: 'open' | 'close';
  collateral: number;
  isOpponent?: boolean;
};

export type Position = {
  entryPrice: number;
  amountBtc: number;
  collateral: number;
  leverage: number;
};

export type Player = {
  userId: string;
  name: string;
  avatarUrl: string;
  isOpponent?: boolean;
  cash: number;
  initialValue: number;
  leverage: number;
  longs: Position[];
  shorts: Position[];
  totalPnl: number;
  tradeHistory: Trade[];
};

export type ChatMessage = {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
};

export type GameSession = {
  id: string;
  players: Player[];
  status: 'waiting' | 'playing' | 'finished';
  marketSymbol: string;
  candlestickData: CandlestickData[];
  createdAt: number;
  gameDuration: number; // The total duration of the game in seconds.
  timer: number;
  hostId: string;
  chatMessages: ChatMessage[];
  onChainGameId?: number;
};

export type PriceData = {
  time: number;
  price: number;
};

export type CandlestickData = {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
}

export type TradeSide = 'buy' | 'sell';

export type Tutorial = {
  tutorialContent: string;
  recommendations: string;
};

export type Point = {
    time: number;
    price: number;
};

export type DrawnLine = {
    id: string;
    start: Point;
    end: Point;
};

export type DrawnHorizontalLine = {
    id: string;
    price: number;
};

export type DrawnArrowMarker = {
    id: string;
    point: Point;
};
