export type Message = {
  id: string;
  text: string;
  image?: string;
  video?: string;
  sender: 'me' | 'partner' | 'system';
  timestamp: string;
  viewCount?: number;
  maxViews?: number;
  isViewed?: boolean;
  reactions?: Record<string, number>;
};

export type AppState = 'landing' | 'waiting' | 'chatting' | 'friends' | 'direct-chat';

export type User = {
  id: string;
  username: string;
  avatarColor: string;
  friends?: string[];
  friendRequests?: string[];
  deviceId?: string;
  createdAt?: string;
  authType?: 'anonymous' | 'registered';
  anonymousDisabled?: boolean;
};

export type Friend = {
  id: string;
  username: string;
  avatarColor: string;
  isOnline: boolean;
  lastMessage?: string;
  lastMessageAt?: string;
};

export type FriendRequest = {
  fromId: string;
  fromUsername: string;
  toId?: string;
};

export type GameType = 'tictactoe' | 'rps' | 'doodle';

export type GameState = {
  type: GameType;
  status: 'inviting' | 'playing' | 'ended';
  turn: 'me' | 'partner';
  board?: (string | null)[]; // For Tic-Tac-Toe
  myMove?: string; // For RPS
  partnerMove?: string; // For RPS
  winner?: 'me' | 'partner' | 'draw';
  strokes?: { x: number; y: number; color: string; isStart: boolean }[]; // For Doodle
};
