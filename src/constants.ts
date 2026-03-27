/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Avatar colors for user and partner avatars
export const AVATAR_COLORS = ['indigo', 'emerald', 'rose', 'amber', 'violet', 'cyan', 'fuchsia'] as const;

// Message reactions emoji options
export const REACTION_EMOJIS = ['❤️', '😂', '👍', '😮', '🔥', '🙏'] as const;

// Media file constraints
export const MEDIA_CONSTRAINTS = {
  MAX_FILE_SIZE: 800 * 1024, // 800KB in bytes
  MAX_VIDEO_DURATION: 10.5, // seconds
  MAX_VIEWS_DEFAULT: 2, // default max views for self-destructing media
} as const;

// Friend request rate limiting
export const FRIEND_REQUEST_LIMITS = {
  MAX_REQUESTS_PER_HOUR: 20,
  WINDOW_MS: 60 * 60 * 1000, // 1 hour in milliseconds
} as const;

// Notification timeout
export const NOTIFICATION_TIMEOUT_MS = 5000;

// Stranger alias generation range
export const STRANGER_ALIAS_RANGE = {
  MIN: 1000,
  MAX: 10000,
} as const;

// Server configuration
export const SERVER_CONFIG = {
  PORT: 3000,
  HOST: '0.0.0.0',
} as const;
