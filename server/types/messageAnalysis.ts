/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Message analysis result from AI moderation system
 */
export interface MessageAnalysis {
  severity: number; // 0.0 to 1.0 (0 = safe, 1 = extremely harmful)
  label: string; // e.g., "safe", "mild toxicity", "severe abuse", "spam"
  category: string; // e.g., "toxicity", "sexual", "spam", "threats", "safe"
  action: 'allow' | 'flag' | 'warn' | 'block';
  reason: string; // Short explanation
}

/**
 * Context for message analysis
 */
export interface MessageContext {
  text: string;
  senderId?: string;
  messageId: string;
  timestamp: string;
  sessionContext?: {
    partnerId?: string;
    messageCount?: number;
    sessionDuration?: number;
  };
}

/**
 * User moderation history
 */
export interface UserModerationHistory {
  userId: string;
  flaggedMessages: number;
  warnedMessages: number;
  blockedMessages: number;
  lastViolation?: string;
}
