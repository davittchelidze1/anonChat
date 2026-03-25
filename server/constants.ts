/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Friend request rate limiting
export const FRIEND_REQUEST_LIMITS = {
  MAX_REQUESTS_PER_HOUR: 20,
  WINDOW_MS: 60 * 60 * 1000, // 1 hour in milliseconds
} as const;

// Media constraints
export const MEDIA_CONSTRAINTS = {
  MAX_FILE_SIZE: 800 * 1024, // 800KB in bytes
} as const;

// Server configuration
export const SERVER_CONFIG = {
  PORT: 3000,
  HOST: '0.0.0.0',
} as const;

// JWT configuration
export const JWT_SECRET = process.env.JWT_SECRET || 'anon-chat-secret-key';
