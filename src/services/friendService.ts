/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { API_ENDPOINTS } from '../events';

/**
 * Service for handling friend request operations
 */
export class FriendService {
  /**
   * Get authorization header with Firebase token
   */
  private static async getAuthHeader(): Promise<{ Authorization: string }> {
    const { auth } = await import('../firebase');
    const token = await auth.currentUser?.getIdToken();
    if (!token) {
      throw new Error('unauthorized');
    }
    return { Authorization: `Bearer ${token}` };
  }

  /**
   * Send a friend request to another user
   * @param toUserId - Target user ID
   * @throws Error with specific error codes
   */
  static async sendFriendRequest(toUserId: string): Promise<void> {
    const headers = await this.getAuthHeader();
    const response = await fetch(API_ENDPOINTS.FRIEND_REQUEST, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({ toUserId }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({ error: 'request_failed' }));
      throw new Error(payload.error || 'request_failed');
    }
  }

  /**
   * Accept a friend request
   * @param fromUserId - User ID who sent the request
   * @throws Error with specific error codes
   */
  static async acceptFriendRequest(fromUserId: string): Promise<void> {
    const headers = await this.getAuthHeader();
    const response = await fetch(API_ENDPOINTS.FRIEND_ACCEPT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({ fromUserId }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({ error: 'accept_failed' }));
      throw new Error(payload.error || 'accept_failed');
    }
  }

  /**
   * Decline a friend request
   * @param fromUserId - User ID who sent the request
   * @throws Error with specific error codes
   */
  static async declineFriendRequest(fromUserId: string): Promise<void> {
    const headers = await this.getAuthHeader();
    const response = await fetch(API_ENDPOINTS.FRIEND_DECLINE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({ fromUserId }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({ error: 'decline_failed' }));
      throw new Error(payload.error || 'decline_failed');
    }
  }
}
