/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Socket Event Type Definitions
 *
 * This file contains all socket event types for type-safe communication
 * between client and server.
 */

// ============================================================================
// Client -> Server Events
// ============================================================================

export interface AuthenticateEvent {
  token: string | null;
}

export interface SendMessageEvent {
  id: string;
  text: string;
  image?: string;
  video?: string;
  maxViews?: number;
}

export interface MessageViewedEvent {
  messageId: string;
  partnerId?: string | null;
}

export interface MessageReactionEvent {
  messageId: string;
  emoji: string;
}

export interface GameInviteEvent {
  gameType: string;
  toUserId?: string;
}

export interface GameAcceptEvent {
  gameType: string;
  toUserId?: string;
}

export interface GameMoveEvent {
  move: any;
  toUserId?: string;
}

export interface DoodleDrawEvent {
  stroke: any;
  toUserId?: string;
}

export interface DoodleClearEvent {
  toUserId?: string;
}

export interface GameCancelEvent {
  toUserId?: string;
}

// ============================================================================
// Server -> Client Events
// ============================================================================

export interface OnlineCountEvent {
  count: number;
}

export interface MatchedEvent {
  partnerUserId: string | null;
}

export interface ReceiveMessageEvent {
  id: string;
  text: string;
  image?: string;
  video?: string;
  maxViews?: number;
  viewCount: number;
  sender: 'me' | 'partner' | 'system';
  timestamp: string;
}

export interface PartnerTypingEvent {
  isTyping: boolean;
}

export interface PartnerMessageViewedEvent {
  messageId: string;
}

export interface PartnerMessageReactionEvent {
  messageId: string;
  emoji: string;
}

export interface PartnerAuthenticatedEvent {
  userId: string | null;
}

export interface MediaPermissionGrantedEvent {}

export interface PartnerRequestedMediaEvent {}

export interface GameInvitedEvent {
  gameType: string;
}

export interface GameStartedEvent {
  gameType: string;
  starter: 'me' | 'partner';
}

export interface GamePartnerMoveEvent {
  move: any;
}

export interface DoodlePartnerDrawEvent {
  stroke: any;
}

export interface DoodlePartnerClearEvent {}

export interface GameCancelledEvent {}

export interface FriendStatusEvent {
  userId: string;
  isOnline: boolean;
}

export interface FriendsOnlineSnapshotEvent {
  statuses: Record<string, boolean>;
}

export interface NewFriendRequestEvent {
  fromId: string;
}

export interface FriendRequestAcceptedEvent {
  userId: string;
}

export interface FriendRequestDeclinedEvent {
  fromId: string;
}

export interface AuthenticatedEvent {
  id: string;
  username: string;
  avatarColor: string;
}

export interface ResolvePartnerUserResponse {
  partnerUserId: string | null;
}

// ============================================================================
// Event Names (for consistency)
// ============================================================================

export const CLIENT_EVENTS = {
  AUTHENTICATE: 'authenticate',
  JOIN_QUEUE: 'join-queue',
  LEAVE_CHAT: 'leave-chat',
  SEND_MESSAGE: 'send-message',
  MESSAGE_VIEWED: 'message-viewed',
  MESSAGE_REACTION: 'message-reaction',
  TYPING: 'typing',
  REQUEST_MEDIA_PERMISSION: 'request-media-permission',
  GAME_INVITE: 'game-invite',
  GAME_ACCEPT: 'game-accept',
  GAME_MOVE: 'game-move',
  GAME_CANCEL: 'game-cancel',
  DOODLE_DRAW: 'doodle-draw',
  DOODLE_CLEAR: 'doodle-clear',
  FRIEND_REQUEST_SENT: 'friend-request-sent',
  FRIEND_REQUEST_ACCEPTED: 'friend-request-accepted',
  DECLINE_FRIEND_REQUEST: 'decline-friend-request',
  RESOLVE_PARTNER_USER: 'resolve-partner-user',
  REQUEST_FRIENDS_ONLINE_STATUS: 'request-friends-online-status',
} as const;

export const SERVER_EVENTS = {
  ONLINE_COUNT: 'online-count',
  WAITING: 'waiting',
  MATCHED: 'matched',
  PARTNER_DISCONNECTED: 'partner-disconnected',
  RECEIVE_MESSAGE: 'receive-message',
  PARTNER_TYPING: 'partner-typing',
  PARTNER_MESSAGE_VIEWED: 'partner-message-viewed',
  PARTNER_MESSAGE_REACTION: 'partner-message-reaction',
  PARTNER_AUTHENTICATED: 'partner-authenticated',
  MEDIA_PERMISSION_GRANTED: 'media-permission-granted',
  PARTNER_REQUESTED_MEDIA: 'partner-requested-media',
  GAME_INVITED: 'game-invited',
  GAME_STARTED: 'game-started',
  GAME_PARTNER_MOVE: 'game-partner-move',
  GAME_CANCELLED: 'game-cancelled',
  DOODLE_PARTNER_DRAW: 'doodle-partner-draw',
  DOODLE_PARTNER_CLEAR: 'doodle-partner-clear',
  FRIEND_STATUS: 'friend-status',
  FRIENDS_ONLINE_SNAPSHOT: 'friends-online-snapshot',
  NEW_FRIEND_REQUEST: 'new-friend-request',
  FRIEND_REQUEST_ACCEPTED: 'friend-request-accepted',
  FRIEND_REQUEST_DECLINED: 'friend-request-declined',
  AUTHENTICATED: 'authenticated',
} as const;

// ============================================================================
// Type-safe socket event map
// ============================================================================

export interface ServerToClientEvents {
  [SERVER_EVENTS.ONLINE_COUNT]: (count: number) => void;
  [SERVER_EVENTS.WAITING]: () => void;
  [SERVER_EVENTS.MATCHED]: (data: MatchedEvent) => void;
  [SERVER_EVENTS.PARTNER_DISCONNECTED]: () => void;
  [SERVER_EVENTS.RECEIVE_MESSAGE]: (data: ReceiveMessageEvent) => void;
  [SERVER_EVENTS.PARTNER_TYPING]: (isTyping: boolean) => void;
  [SERVER_EVENTS.PARTNER_MESSAGE_VIEWED]: (messageId: string) => void;
  [SERVER_EVENTS.PARTNER_MESSAGE_REACTION]: (data: PartnerMessageReactionEvent) => void;
  [SERVER_EVENTS.PARTNER_AUTHENTICATED]: (userId: string | null) => void;
  [SERVER_EVENTS.MEDIA_PERMISSION_GRANTED]: () => void;
  [SERVER_EVENTS.PARTNER_REQUESTED_MEDIA]: () => void;
  [SERVER_EVENTS.GAME_INVITED]: (gameType: string) => void;
  [SERVER_EVENTS.GAME_STARTED]: (data: GameStartedEvent) => void;
  [SERVER_EVENTS.GAME_PARTNER_MOVE]: (move: any) => void;
  [SERVER_EVENTS.GAME_CANCELLED]: () => void;
  [SERVER_EVENTS.DOODLE_PARTNER_DRAW]: (stroke: any) => void;
  [SERVER_EVENTS.DOODLE_PARTNER_CLEAR]: () => void;
  [SERVER_EVENTS.FRIEND_STATUS]: (data: FriendStatusEvent) => void;
  [SERVER_EVENTS.FRIENDS_ONLINE_SNAPSHOT]: (statuses: Record<string, boolean>) => void;
  [SERVER_EVENTS.NEW_FRIEND_REQUEST]: (data: NewFriendRequestEvent) => void;
  [SERVER_EVENTS.FRIEND_REQUEST_ACCEPTED]: (userId: string) => void;
  [SERVER_EVENTS.FRIEND_REQUEST_DECLINED]: (fromId: string) => void;
  [SERVER_EVENTS.AUTHENTICATED]: (data: AuthenticatedEvent) => void;
}

export interface ClientToServerEvents {
  [CLIENT_EVENTS.AUTHENTICATE]: (token: string | null) => void;
  [CLIENT_EVENTS.JOIN_QUEUE]: () => void;
  [CLIENT_EVENTS.LEAVE_CHAT]: () => void;
  [CLIENT_EVENTS.SEND_MESSAGE]: (data: SendMessageEvent) => void;
  [CLIENT_EVENTS.MESSAGE_VIEWED]: (data: MessageViewedEvent) => void;
  [CLIENT_EVENTS.MESSAGE_REACTION]: (data: MessageReactionEvent) => void;
  [CLIENT_EVENTS.TYPING]: (isTyping: boolean) => void;
  [CLIENT_EVENTS.REQUEST_MEDIA_PERMISSION]: () => void;
  [CLIENT_EVENTS.GAME_INVITE]: (data: GameInviteEvent | string) => void;
  [CLIENT_EVENTS.GAME_ACCEPT]: (data: GameAcceptEvent | string) => void;
  [CLIENT_EVENTS.GAME_MOVE]: (data: GameMoveEvent | any) => void;
  [CLIENT_EVENTS.GAME_CANCEL]: (data?: GameCancelEvent) => void;
  [CLIENT_EVENTS.DOODLE_DRAW]: (data: DoodleDrawEvent | any) => void;
  [CLIENT_EVENTS.DOODLE_CLEAR]: (data?: DoodleClearEvent) => void;
  [CLIENT_EVENTS.FRIEND_REQUEST_SENT]: (partnerUserId: string) => void;
  [CLIENT_EVENTS.FRIEND_REQUEST_ACCEPTED]: (fromId: string) => void;
  [CLIENT_EVENTS.DECLINE_FRIEND_REQUEST]: (fromId: string) => void;
  [CLIENT_EVENTS.RESOLVE_PARTNER_USER]: (
    callback: (data: ResolvePartnerUserResponse) => void
  ) => void;
  [CLIENT_EVENTS.REQUEST_FRIENDS_ONLINE_STATUS]: (friendIds: string[]) => void;
}
