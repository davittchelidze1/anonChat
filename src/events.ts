/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Socket.IO event names with type safety
export const SOCKET_EVENTS = {
  // Connection events
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  AUTHENTICATE: 'authenticate',
  AUTHENTICATED: 'authenticated',

  // Queue and matching events
  JOIN_QUEUE: 'join-queue',
  WAITING: 'waiting',
  MATCHED: 'matched',
  LEAVE_CHAT: 'leave-chat',

  // Messaging events
  SEND_MESSAGE: 'send-message',
  RECEIVE_MESSAGE: 'receive-message',
  MESSAGE_VIEWED: 'message-viewed',
  PARTNER_MESSAGE_VIEWED: 'partner-message-viewed',
  MESSAGE_REACTION: 'message-reaction',
  PARTNER_MESSAGE_REACTION: 'partner-message-reaction',
  TYPING: 'typing',
  PARTNER_TYPING: 'partner-typing',

  // Direct messaging events
  RECEIVE_DIRECT_MESSAGE: 'receive-direct-message',
  DIRECT_MESSAGE_SENT: 'direct-message-sent',

  // Partner status events
  PARTNER_DISCONNECTED: 'partner-disconnected',
  PARTNER_AUTHENTICATED: 'partner-authenticated',
  PARTNER_NOT_LOGGED_IN: 'partner-not-logged-in',
  ONLINE_COUNT: 'online-count',
  FRIEND_STATUS: 'friend-status',

  // Media sharing events
  REQUEST_MEDIA_PERMISSION: 'request-media-permission',
  PARTNER_REQUESTED_MEDIA: 'partner-requested-media',
  MEDIA_PERMISSION_GRANTED: 'media-permission-granted',

  // Game events
  GAME_INVITE: 'game-invite',
  GAME_INVITED: 'game-invited',
  GAME_ACCEPT: 'game-accept',
  GAME_STARTED: 'game-started',
  GAME_MOVE: 'game-move',
  GAME_PARTNER_MOVE: 'game-partner-move',
  GAME_CANCEL: 'game-cancel',
  GAME_CANCELLED: 'game-cancelled',

  // Doodle game events
  DOODLE_DRAW: 'doodle-draw',
  DOODLE_PARTNER_DRAW: 'doodle-partner-draw',
  DOODLE_CLEAR: 'doodle-clear',
  DOODLE_PARTNER_CLEAR: 'doodle-partner-clear',

  // Friend request events
  FRIEND_REQUEST_SENT: 'friend-request-sent',
  RESOLVE_PARTNER_USER: 'resolve-partner-user',
  NEW_FRIEND_REQUEST: 'new-friend-request',
  FRIEND_REQUEST_ACCEPTED: 'friend-request-accepted',
  FRIEND_REQUEST_DECLINED: 'friend-request-declined',
  DECLINE_FRIEND_REQUEST: 'decline-friend-request',
  AUTH_REQUIRED_FOR_FRIEND: 'auth-required-for-friend',
  ALREADY_FRIENDS: 'already-friends',
  REQUEST_ALREADY_SENT: 'request-already-sent',
  CANNOT_ADD_SELF: 'cannot-add-self',
} as const;

// API endpoints
export const API_ENDPOINTS = {
  HEALTH: '/api/health',
  FRIEND_REQUEST: '/api/friends/request',
  FRIEND_ACCEPT: '/api/friends/accept',
  FRIEND_DECLINE: '/api/friends/decline',
} as const;
