/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response, NextFunction } from 'express';
import admin from 'firebase-admin';
import jwt from 'jsonwebtoken';

/**
 * Extract auth token from request headers or cookies
 */
export function getAuthToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  const cookieToken = req.cookies?.token;
  if (typeof cookieToken === 'string' && cookieToken.length > 0) {
    return cookieToken;
  }

  return null;
}

/**
 * Get user from Firebase token
 */
export async function getUserFromToken(
  token: string,
  firebaseAdminReady: boolean
): Promise<any | null> {
  try {
    if (firebaseAdminReady) {
      const decoded = await admin.auth().verifyIdToken(token);
      return {
        id: decoded.uid,
        username: decoded.name || 'User',
        avatarColor: 'zinc'
      };
    }

    // Fallback for local/dev environments where Admin SDK is not configured
    const decoded = jwt.decode(token) as any;
    if (decoded && decoded.user_id) {
      return {
        id: decoded.user_id,
        username: decoded.name || 'User',
        avatarColor: 'zinc'
      };
    }

    return null;
  } catch (e) {
    return null;
  }
}

/**
 * Express middleware to authenticate requests
 */
export function createAuthMiddleware(firebaseAdminReady: boolean) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const token = getAuthToken(req);
    if (!token) {
      res.status(401).json({ error: 'unauthorized' });
      return;
    }

    const authUser = await getUserFromToken(token, firebaseAdminReady);
    if (!authUser) {
      res.status(401).json({ error: 'unauthorized' });
      return;
    }

    (req as any).authUser = authUser;
    next();
  };
}
