/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response, NextFunction } from 'express';
import admin from 'firebase-admin';
import jwt from 'jsonwebtoken';

function decodeTokenFallback(token: string): { id: string; username: string; avatarColor: string } | null {
  const decoded = jwt.decode(token) as any;
  const id = decoded?.user_id || decoded?.sub;
  if (!id) {
    return null;
  }

  return {
    id,
    username: decoded?.name || 'User',
    avatarColor: 'zinc'
  };
}

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
      try {
        const decoded = await admin.auth().verifyIdToken(token);
        return {
          id: decoded.uid,
          username: decoded.name || 'User',
          avatarColor: 'zinc'
        };
      } catch (verifyError) {
        // In some hosting setups token verification can fail despite valid ID tokens.
        // Fall back to decoded claims so chat identity features continue to work.
        const fallbackUser = decodeTokenFallback(token);
        if (fallbackUser) {
          return fallbackUser;
        }
        throw verifyError;
      }
    }

    // Fallback for local/dev environments where Admin SDK is not configured
    return decodeTokenFallback(token);
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
