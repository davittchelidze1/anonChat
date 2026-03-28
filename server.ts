import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import cookieParser from "cookie-parser";
import admin from "firebase-admin";

import { SERVER_CONFIG } from './server/constants';
import {
  socketToSession,
  socketToUser,
  userToSockets,
  loadData
} from './server/state';
import { createAuthMiddleware, getUserFromToken } from './server/middleware/auth';
import { FriendRequestRoutes } from './server/routes/friendRoutes';
import { SocketHandlers } from './server/handlers/socketHandlers';

async function startServer() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: "*" },
  });

  // Initialize Firebase Admin
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
          const raw = fs.readFileSync(path.resolve(process.cwd(), serviceAccountFile), "utf8");
          const parsed = normalizeServiceAccount(JSON.parse(raw));
          admin.initializeApp({
            credential: admin.credential.cert(parsed),
          });
        } else if (fs.existsSync(defaultServiceAccountPath)) {
          const raw = fs.readFileSync(defaultServiceAccountPath, "utf8");
          const parsed = normalizeServiceAccount(JSON.parse(raw));
          admin.initializeApp({
            credential: admin.credential.cert(parsed),
          });
        } else {
          console.warn("Firebase Admin not configured: set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_FILE.");
          return false;
        }
      }
      return true;
    } catch (error) {
      console.error("Firebase Admin initialization failed:", error);
      return false;
    }
  })();
  const firestore = firebaseAdminReady ? admin.firestore() : null;

  loadData();

  // Helper to get user from token for socket authentication
  const getUserFromTokenWrapper = async (token: string) => {
    return getUserFromToken(token, firebaseAdminReady);
  };

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Friend request routes
  const friendRoutes = new FriendRequestRoutes(firestore);
  const authMiddleware = createAuthMiddleware(firebaseAdminReady);

  app.post("/api/friends/request", authMiddleware, async (req, res) => {
    await friendRoutes.sendRequest(req, res, (req as any).authUser);
  });

  app.post("/api/friends/accept", authMiddleware, async (req, res) => {
    await friendRoutes.acceptRequest(req, res, (req as any).authUser);
  });

  app.post("/api/friends/decline", authMiddleware, async (req, res) => {
    await friendRoutes.declineRequest(req, res, (req as any).authUser);
  });

  // Socket.IO connection handling
  const socketHandlers = new SocketHandlers(io, getUserFromTokenWrapper);

  // Helper to notify friends about status change
  const notifyFriendsStatus = (userId: string, isOnline: boolean) => {
    // This would need access to users map to get friends list
    // Simplified for now
  };

  io.on("connection", async (socket) => {
    const sessionId = socket.handshake.auth.sessionId;
    if (!sessionId) {
      console.log("Connection rejected: No sessionId");
      socket.disconnect();
      return;
    }
    socketToSession.set(socket.id, sessionId);

    // Handle authenticated users connecting
    let token = socket.handshake.auth.token;

    // If no token in auth payload, try to parse from cookie header
    if (!token && socket.handshake.headers.cookie) {
      const match = socket.handshake.headers.cookie.match(/(?:^|; )token=([^;]*)/);
      if (match) {
        token = match[1];
      }
    }

    if (token) {
      const user = await getUserFromTokenWrapper(token);
      if (user) {
        socketToUser.set(socket.id, user.id);
        const isNew = !userToSockets.has(user.id);
        if (!userToSockets.has(user.id)) {
          userToSockets.set(user.id, new Set());
        }
        userToSockets.get(user.id)!.add(socket.id);
        if (isNew) notifyFriendsStatus(user.id, true);
        console.log("Authenticated user connected:", user.username, "Socket:", socket.id);
      }
    }

    console.log("User connected:", socket.id, "Session:", sessionId);
    io.emit("online-count", io.engine.clientsCount);

    // Setup all socket handlers
    socketHandlers.setupAllHandlers(socket, sessionId);
  });

  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = SERVER_CONFIG.PORT;
  const HOST = SERVER_CONFIG.HOST;
  httpServer.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
  });
}

startServer();
