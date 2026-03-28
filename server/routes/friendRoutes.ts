/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response } from 'express';
import admin from 'firebase-admin';
import { FRIEND_REQUEST_LIMITS } from '../constants';

export class FriendRequestRoutes {
  constructor(private firestore: admin.firestore.Firestore | null) {}

  /**
   * Send a friend request
   */
  async sendRequest(req: Request, res: Response, authUser: any) {
    if (!this.firestore) {
      res.status(503).json({ error: 'server_not_configured' });
      return;
    }

    const toUserId = String(req.body?.toUserId || '').trim();
    if (!toUserId) {
      res.status(400).json({ error: 'invalid_target' });
      return;
    }
    if (toUserId === authUser.id) {
      res.status(400).json({ error: 'cannot_add_self' });
      return;
    }

    try {
      const now = Date.now();

      await this.firestore.runTransaction(async (tx) => {
        const fromRef = this.firestore!.collection('users').doc(authUser.id);
        const toRef = this.firestore!.collection('users').doc(toUserId);
        const quotaRef = this.firestore!.collection('friendRequestRate').doc(authUser.id);

        const [fromSnap, toSnap, quotaSnap] = await Promise.all([
          tx.get(fromRef),
          tx.get(toRef),
          tx.get(quotaRef),
        ]);

        if (!fromSnap.exists || !toSnap.exists) {
          throw new Error('invalid_target');
        }

        const fromData = fromSnap.data() as any;
        const toData = toSnap.data() as any;
        const fromFriends: string[] = Array.isArray(fromData?.friends) ? fromData.friends : [];
        const toRequests: string[] = Array.isArray(toData?.friendRequests) ? toData.friendRequests : [];

        if (fromFriends.includes(toUserId)) {
          throw new Error('already_friends');
        }
        if (toRequests.includes(authUser.id)) {
          throw new Error('request_already_sent');
        }

        const quotaData = quotaSnap.exists ? (quotaSnap.data() as any) : {};
        const windowStart = typeof quotaData.windowStart === 'number' ? quotaData.windowStart : now;
        const inWindow = now - windowStart < FRIEND_REQUEST_LIMITS.WINDOW_MS;
        const currentCount = inWindow && typeof quotaData.count === 'number' ? quotaData.count : 0;

        if (currentCount >= FRIEND_REQUEST_LIMITS.MAX_REQUESTS_PER_HOUR) {
          throw new Error('quota_exceeded');
        }

        tx.set(
          quotaRef,
          {
            windowStart: inWindow ? windowStart : now,
            count: currentCount + 1,
            updatedAt: now,
          },
          { merge: true }
        );

        tx.update(toRef, {
          friendRequests: admin.firestore.FieldValue.arrayUnion(authUser.id),
        });
      });

      res.json({ ok: true });
    } catch (error: any) {
      const rawCode = String(error?.message || 'request_failed');
      const knownCodes = new Set([
        'quota_exceeded',
        'already_friends',
        'request_already_sent',
        'invalid_target',
        'cannot_add_self',
      ]);

      let code = rawCode;
      let status = 400;

      if (code === 'quota_exceeded') {
        status = 429;
      } else if (!knownCodes.has(code)) {
        const lower = rawCode.toLowerCase();
        if (lower.includes('default credentials') || lower.includes('insufficient permissions')) {
          code = 'server_not_configured';
          status = 503;
        } else {
          code = 'request_failed';
          status = 500;
        }
        console.error('sendRequest unexpected error:', rawCode);
      }

      res.status(status).json({ error: code });
    }
  }

  /**
   * Accept a friend request
   */
  async acceptRequest(req: Request, res: Response, authUser: any) {
    if (!this.firestore) {
      res.status(503).json({ error: 'server_not_configured' });
      return;
    }

    const fromUserId = String(req.body?.fromUserId || '').trim();
    if (!fromUserId) {
      res.status(400).json({ error: 'invalid_source' });
      return;
    }

    try {
      await this.firestore.runTransaction(async (tx) => {
        const myRef = this.firestore!.collection('users').doc(authUser.id);
        const fromRef = this.firestore!.collection('users').doc(fromUserId);

        const [mySnap, fromSnap] = await Promise.all([tx.get(myRef), tx.get(fromRef)]);
        if (!mySnap.exists || !fromSnap.exists) {
          throw new Error('invalid_source');
        }

        const myData = mySnap.data() as any;
        const myRequests: string[] = Array.isArray(myData?.friendRequests) ? myData.friendRequests : [];
        if (!myRequests.includes(fromUserId)) {
          throw new Error('request_not_found');
        }

        tx.update(myRef, {
          friends: admin.firestore.FieldValue.arrayUnion(fromUserId),
          friendRequests: admin.firestore.FieldValue.arrayRemove(fromUserId),
        });

        tx.update(fromRef, {
          friends: admin.firestore.FieldValue.arrayUnion(authUser.id),
        });
      });

      res.json({ ok: true });
    } catch (error: any) {
      res.status(400).json({ error: error?.message || 'accept_failed' });
    }
  }

  /**
   * Decline a friend request
   */
  async declineRequest(req: Request, res: Response, authUser: any) {
    if (!this.firestore) {
      res.status(503).json({ error: 'server_not_configured' });
      return;
    }

    const fromUserId = String(req.body?.fromUserId || '').trim();
    if (!fromUserId) {
      res.status(400).json({ error: 'invalid_source' });
      return;
    }

    try {
      const myRef = this.firestore.collection('users').doc(authUser.id);
      await myRef.update({
        friendRequests: admin.firestore.FieldValue.arrayRemove(fromUserId),
      });

      res.json({ ok: true });
    } catch (error: any) {
      res.status(400).json({ error: error?.message || 'decline_failed' });
    }
  }
}
