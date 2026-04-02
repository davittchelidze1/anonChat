/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import cookieParser from 'cookie-parser';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

import { SERVER_CONFIG } from './server/constants';
import { getStateManager } from './server/core/StateManager';
import { createAuthMiddleware, getUserFromToken } from './server/middleware/auth';
import { FriendRequestRoutes } from './server/routes/friendRoutes';
import { SocketHandlers } from './server/handlers/socketHandlersRefactored';
import { SERVER_EVENTS } from './server/types/socketEvents';

/**
 * Main server entry point with improved architecture
 */
async function startServer() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: '*' },
  });

  // ============================================================================
  // Firebase Admin Setup
  // ============================================================================

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const serviceAccountFile = process.env.FIREBASE_SERVICE_ACCOUNT_FILE;
  const defaultServiceAccountPath = path.resolve(process.cwd(), 'firebase-service-account.json');

  const normalizeServiceAccount = (input: any) => {
    if (input?.private_key && typeof input.private_key === 'string') {
      return {
        ...input,
        private_key: input.private_key.replace(/\\n/g, '\n'),
      };
    }
    return input;
  };

  const firebaseAdminReady = (() => {
    try {
      if (!admin.apps.length) {
        if (serviceAccountJson) {
          const parsed = normalizeServiceAccount(JSON.parse(serviceAccountJson));
          admin.initializeApp({
            credential: admin.credential.cert(parsed),
          });
        } else if (serviceAccountFile) {
          const raw = fs.readFileSync(path.resolve(process.cwd(), serviceAccountFile), 'utf8');
          const parsed = normalizeServiceAccount(JSON.parse(raw));
          admin.initializeApp({
            credential: admin.credential.cert(parsed),
          });
        } else if (fs.existsSync(defaultServiceAccountPath)) {
          const raw = fs.readFileSync(defaultServiceAccountPath, 'utf8');
          const parsed = normalizeServiceAccount(JSON.parse(raw));
          admin.initializeApp({
            credential: admin.credential.cert(parsed),
          });
        } else {
          console.warn(
            'Firebase Admin not configured: set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_FILE.'
          );
          return false;
        }
      }
      return true;
    } catch (error) {
      console.error('Firebase Admin initialization failed:', error);
      return false;
    }
  })();

  const firestoreDatabaseId = process.env.FIREBASE_DATABASE_ID || process.env.VITE_FIREBASE_DATABASE_ID;
  const firestore = firebaseAdminReady
    ? firestoreDatabaseId
      ? getFirestore(admin.app(), firestoreDatabaseId)
      : getFirestore(admin.app())
    : null;

  if (firebaseAdminReady) {
    console.log(
      firestoreDatabaseId
        ? `[Server] Firebase Admin Firestore DB: ${firestoreDatabaseId}`
        : '[Server] Firebase Admin Firestore DB: (default)'
    );
  }

  // ============================================================================
  // State Manager Setup
  // ============================================================================

  const stateManager = getStateManager();
  stateManager.loadData();

  // Periodically save state to disk
  const SAVE_INTERVAL = 30000; // 30 seconds
  setInterval(() => {
    stateManager.saveData();
  }, SAVE_INTERVAL);

  // Log stats periodically
  setInterval(() => {
    const stats = stateManager.getStats();
    console.log('[Server] Stats:', stats);
  }, 60000); // Every minute

  // ============================================================================
  // API Routes
  // ============================================================================

  app.get('/api/health', (req, res) => {
    const stats = stateManager.getStats();
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      stats,
    });
  });

  // Friend request routes
  const friendRoutes = new FriendRequestRoutes(firestore);
  const authMiddleware = createAuthMiddleware(firebaseAdminReady);

  app.post('/api/friends/request', authMiddleware, async (req, res) => {
    await friendRoutes.sendRequest(req, res, (req as any).authUser);
  });

  app.post('/api/friends/accept', authMiddleware, async (req, res) => {
    await friendRoutes.acceptRequest(req, res, (req as any).authUser);
  });

  app.post('/api/friends/decline', authMiddleware, async (req, res) => {
    await friendRoutes.declineRequest(req, res, (req as any).authUser);
  });

  // ============================================================================
  // Socket.IO Connection Handling
  // ============================================================================

  // Helper to get user from token for socket authentication
  const getUserFromTokenWrapper = async (token: string) => {
    return getUserFromToken(token, firebaseAdminReady);
  };

  const socketHandlers = new SocketHandlers(io, stateManager, getUserFromTokenWrapper, firestore);

  io.on('connection', (socket) => {
    const sessionId = socket.handshake.auth.sessionId;

    if (!sessionId) {
      console.log('[Server] Connection rejected: No sessionId');
      socket.disconnect();
      return;
    }

    stateManager.setSocketSession(socket.id, sessionId);

    console.log(`[Server] User connected: ${socket.id} | Session: ${sessionId}`);
    io.emit(SERVER_EVENTS.ONLINE_COUNT, io.engine.clientsCount);

    // Setup all socket handlers
    socketHandlers.setupAllHandlers(socket, sessionId);
  });

  // ============================================================================
  // Vite Integration
  // ============================================================================

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // ============================================================================
  // Server Start & Graceful Shutdown
  // ============================================================================

  const PORT = SERVER_CONFIG.PORT;
  const HOST = SERVER_CONFIG.HOST;

  httpServer.listen(PORT, HOST, () => {
    console.log(`[Server] Running on http://${HOST}:${PORT}`);
    console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n[Server] ${signal} received. Starting graceful shutdown...`);

    // Save state one last time
    stateManager.saveData();
    console.log('[Server] State saved to disk');

    // Close server
    httpServer.close(() => {
      console.log('[Server] HTTP server closed');
      process.exit(0);
    });

    // Force exit after 10 seconds
    setTimeout(() => {
      console.error('[Server] Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// Start the server
startServer().catch((error) => {
  console.error('[Server] Fatal error during startup:', error);
  process.exit(1);
});
