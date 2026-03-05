export interface UserRecord {
  id: string;
  username: string;
  passwordHash: string;
  avatarColor: string;
  friends: string[]; // Array of user IDs
  friendRequests: string[]; // Array of user IDs who sent requests
}

export interface DirectMessage {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
  image?: string;
  video?: string;
  maxViews?: number;
  viewCount?: number;
  viewedBy?: Record<string, number>;
}

export interface WaitingUser {
  socketId: string;
  sessionId: string;
  userId?: string;
}

export interface ChatSession {
  partnerSocketId: string;
  partnerSessionId: string;
  mediaConsent: boolean;
  partnerUserId?: string;
}
