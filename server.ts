import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { Filter } from "bad-words";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import admin from "firebase-admin";

const JWT_SECRET = process.env.JWT_SECRET || "anon-chat-secret-key";

import { UserRecord, DirectMessage, ChatSession, WaitingUser } from './server/types';
import { 
  users, usernameToId, deviceIdToUserId, directMessages, waitingQueue, activeChats, 
  socketToSession, socketToUser, userToSockets, 
  loadData, saveData, replaceWaitingQueue 
} from './server/state';

async function startServer() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: "*" },
  });

  const filter = new Filter();

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const serviceAccountFile = process.env.FIREBASE_SERVICE_ACCOUNT_FILE;
  const firebaseAdminReady = (() => {
    try {
      if (!admin.apps.length) {
        if (serviceAccountJson) {
          const parsed = JSON.parse(serviceAccountJson);
          admin.initializeApp({
            credential: admin.credential.cert(parsed),
          });
        } else if (serviceAccountFile) {
          const raw = fs.readFileSync(path.resolve(process.cwd(), serviceAccountFile), "utf8");
          const parsed = JSON.parse(raw);
          admin.initializeApp({
            credential: admin.credential.cert(parsed),
          });
        } else {
          admin.initializeApp();
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

  // Helper to get chat ID from two user IDs
  const getChatId = (id1: string, id2: string) => [id1, id2].sort().join("_");

  // Helper to get user from token
  const getUserFromToken = async (token: string): Promise<any | null> => {
    try {
      if (firebaseAdminReady) {
        const decoded = await admin.auth().verifyIdToken(token);
        // We don't have the full user object in memory anymore since we moved to Firestore.
        // But for socket presence, we just need the ID.
        // We'll return a mock user object with the ID.
        return {
          id: decoded.uid,
          username: decoded.name || 'User',
          avatarColor: 'zinc'
        };
      }

      // Fallback for local/dev environments where Admin SDK is not configured.
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
  };

  const getAuthToken = (req: express.Request): string | null => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      return authHeader.slice(7);
    }

    const cookieToken = req.cookies?.token;
    if (typeof cookieToken === "string" && cookieToken.length > 0) {
      return cookieToken;
    }

    return null;
  };

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/friends/request", async (req, res) => {
    if (!firestore) {
      res.status(503).json({ error: "server_not_configured" });
      return;
    }

    const token = getAuthToken(req);
    if (!token) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }

    const authUser = await getUserFromToken(token);
    if (!authUser) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }

    const toUserId = String(req.body?.toUserId || "").trim();
    if (!toUserId) {
      res.status(400).json({ error: "invalid_target" });
      return;
    }
    if (toUserId === authUser.id) {
      res.status(400).json({ error: "cannot_add_self" });
      return;
    }

    try {
      const now = Date.now();
      const windowMs = 60 * 60 * 1000;
      const maxRequests = 20;

      await firestore.runTransaction(async (tx) => {
        const fromRef = firestore.collection("users").doc(authUser.id);
        const toRef = firestore.collection("users").doc(toUserId);
        const quotaRef = firestore.collection("friendRequestRate").doc(authUser.id);

        const [fromSnap, toSnap, quotaSnap] = await Promise.all([
          tx.get(fromRef),
          tx.get(toRef),
          tx.get(quotaRef),
        ]);

        if (!fromSnap.exists || !toSnap.exists) {
          throw new Error("invalid_target");
        }

        const fromData = fromSnap.data() as any;
        const toData = toSnap.data() as any;
        const fromFriends: string[] = Array.isArray(fromData?.friends) ? fromData.friends : [];
        const toRequests: string[] = Array.isArray(toData?.friendRequests) ? toData.friendRequests : [];

        if (fromFriends.includes(toUserId)) {
          throw new Error("already_friends");
        }
        if (toRequests.includes(authUser.id)) {
          throw new Error("request_already_sent");
        }

        const quotaData = quotaSnap.exists ? (quotaSnap.data() as any) : {};
        const windowStart = typeof quotaData.windowStart === "number" ? quotaData.windowStart : now;
        const inWindow = now - windowStart < windowMs;
        const currentCount = inWindow && typeof quotaData.count === "number" ? quotaData.count : 0;

        if (currentCount >= maxRequests) {
          throw new Error("quota_exceeded");
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
      const code = error?.message || "request_failed";
      const status = code === "quota_exceeded" ? 429 : 400;
      res.status(status).json({ error: code });
    }
  });

  app.post("/api/friends/accept", async (req, res) => {
    if (!firestore) {
      res.status(503).json({ error: "server_not_configured" });
      return;
    }

    const token = getAuthToken(req);
    if (!token) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }

    const authUser = await getUserFromToken(token);
    if (!authUser) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }

    const fromUserId = String(req.body?.fromUserId || "").trim();
    if (!fromUserId) {
      res.status(400).json({ error: "invalid_source" });
      return;
    }

    try {
      await firestore.runTransaction(async (tx) => {
        const myRef = firestore.collection("users").doc(authUser.id);
        const fromRef = firestore.collection("users").doc(fromUserId);

        const [mySnap, fromSnap] = await Promise.all([tx.get(myRef), tx.get(fromRef)]);
        if (!mySnap.exists || !fromSnap.exists) {
          throw new Error("invalid_source");
        }

        const myData = mySnap.data() as any;
        const myRequests: string[] = Array.isArray(myData?.friendRequests) ? myData.friendRequests : [];
        if (!myRequests.includes(fromUserId)) {
          throw new Error("request_not_found");
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
      res.status(400).json({ error: error?.message || "accept_failed" });
    }
  });

  app.post("/api/friends/decline", async (req, res) => {
    if (!firestore) {
      res.status(503).json({ error: "server_not_configured" });
      return;
    }

    const token = getAuthToken(req);
    if (!token) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }

    const authUser = await getUserFromToken(token);
    if (!authUser) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }

    const fromUserId = String(req.body?.fromUserId || "").trim();
    if (!fromUserId) {
      res.status(400).json({ error: "invalid_source" });
      return;
    }

    try {
      const myRef = firestore.collection("users").doc(authUser.id);
      await myRef.update({
        friendRequests: admin.firestore.FieldValue.arrayRemove(fromUserId),
      });

      res.json({ ok: true });
    } catch (error: any) {
      res.status(400).json({ error: error?.message || "decline_failed" });
    }
  });

  // waitingQueue and maps are imported from server/state

  // Helper to notify friends about status change
  const notifyFriendsStatus = (userId: string, isOnline: boolean) => {
    const user = users.get(userId);
    if (!user) return;
    
    user.friends.forEach(friendId => {
      const friendSockets = userToSockets.get(friendId);
      if (friendSockets) {
        friendSockets.forEach(socketId => {
          io.to(socketId).emit("friend-status", { userId, isOnline });
        });
      }
    });
  };

  const addUserSocket = (userId: string, socketId: string) => {
    let isNew = false;
    if (!userToSockets.has(userId)) {
      userToSockets.set(userId, new Set());
      isNew = true;
    }
    userToSockets.get(userId)!.add(socketId);
    return isNew;
  };

  const removeUserSocket = (userId: string, socketId: string) => {
    const sockets = userToSockets.get(userId);
    if (sockets) {
      sockets.delete(socketId);
      if (sockets.size === 0) {
        userToSockets.delete(userId);
        return true;
      }
    }
    return false;
  };

  io.on("connection", (socket) => {
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
      (async () => {
        const user = await getUserFromToken(token);
        if (user) {
          socketToUser.set(socket.id, user.id);
          const isNew = addUserSocket(user.id, socket.id);
          if (isNew) notifyFriendsStatus(user.id, true);
          console.log("Authenticated user connected:", user.username, "Socket:", socket.id);
        }
      })();
    }

    console.log("User connected:", socket.id, "Session:", sessionId);
    io.emit("online-count", io.engine.clientsCount);

    socket.on("authenticate", async (token) => {
      if (token) {
        const user = await getUserFromToken(token);
        if (user) {
          socketToUser.set(socket.id, user.id);
          const isNew = addUserSocket(user.id, socket.id);
          if (isNew) notifyFriendsStatus(user.id, true);
          
          // If in an active chat, update the partner's record of this user
          const myChat = activeChats.get(socket.id);
          if (myChat) {
            const partnerChat = activeChats.get(myChat.partnerSocketId);
            if (partnerChat) {
              partnerChat.partnerUserId = user.id;
            }
            // Notify partner that their peer is now authenticated
            io.to(myChat.partnerSocketId).emit("partner-authenticated", user.id);
          }
          
          socket.emit("authenticated", { id: user.id, username: user.username, avatarColor: user.avatarColor });
          console.log("User authenticated via event:", user.username);
        }
      } else {
        // Logout case
        const userId = socketToUser.get(socket.id);
        if (userId) {
          const isOffline = removeUserSocket(userId, socket.id);
          if (isOffline) notifyFriendsStatus(userId, false);
          socketToUser.delete(socket.id);
          
          const myChat = activeChats.get(socket.id);
          if (myChat) {
            const partnerChat = activeChats.get(myChat.partnerSocketId);
            if (partnerChat) {
              partnerChat.partnerUserId = undefined;
            }
            io.to(myChat.partnerSocketId).emit("partner-authenticated", null);
          }
        }
      }
    });

    socket.on("join-queue", () => {
      if (waitingQueue.some(u => u.socketId === socket.id) || activeChats.has(socket.id)) return;

      const userId = socketToUser.get(socket.id);

      // Find a compatible partner
      let partnerIndex = -1;
      for (let i = 0; i < waitingQueue.length; i++) {
        partnerIndex = i;
        break;
      }

      if (partnerIndex !== -1) {
        const partner = waitingQueue.splice(partnerIndex, 1)[0];
        
        activeChats.set(socket.id, { 
          partnerSocketId: partner.socketId, 
          partnerSessionId: partner.sessionId, 
          mediaConsent: false,
          partnerUserId: partner.userId
        });
        activeChats.set(partner.socketId, { 
          partnerSocketId: socket.id, 
          partnerSessionId: sessionId, 
          mediaConsent: false,
          partnerUserId: userId
        });

        io.to(socket.id).emit("matched", { partnerUserId: partner.userId });
        io.to(partner.socketId).emit("matched", { partnerUserId: userId });
        console.log(`Matched ${socket.id} with ${partner.socketId}`);
      } else {
        waitingQueue.push({ socketId: socket.id, sessionId, userId });
        socket.emit("waiting");
      }
    });

    socket.on("friend-request-sent", (partnerUserId) => {
      const myUserId = socketToUser.get(socket.id);
      if (!myUserId) return;
      
      const partnerSockets = userToSockets.get(partnerUserId);
      if (partnerSockets) {
        partnerSockets.forEach(sId => {
          io.to(sId).emit("new-friend-request", { fromId: myUserId });
        });
      }
    });

    socket.on("friend-request-accepted", (fromId) => {
      const myUserId = socketToUser.get(socket.id);
      if (!myUserId) return;

      const fromSockets = userToSockets.get(fromId);
      if (fromSockets) {
        fromSockets.forEach(sId => {
          io.to(sId).emit("friend-request-accepted", myUserId);
        });
      }
    });

    socket.on("decline-friend-request", (fromId) => {
      // Just for completeness, though the client handles it via Firestore
      const myUserId = socketToUser.get(socket.id);
      if (!myUserId) return;
      socket.emit("friend-request-declined", fromId);
    });

    socket.on("request-media-permission", () => {
      const chat = activeChats.get(socket.id);
      if (chat) {
        chat.mediaConsent = true;
        const partnerChat = activeChats.get(chat.partnerSocketId);
        
        io.to(chat.partnerSocketId).emit("partner-requested-media");
        
        if (partnerChat && partnerChat.mediaConsent) {
          io.to(socket.id).emit("media-permission-granted");
          io.to(chat.partnerSocketId).emit("media-permission-granted");
        }
      }
    });

    socket.on("game-invite", (gameType) => {
      const chat = activeChats.get(socket.id);
      if (chat) {
        io.to(chat.partnerSocketId).emit("game-invited", gameType);
      }
    });

    socket.on("game-accept", (gameType) => {
      const chat = activeChats.get(socket.id);
      if (chat) {
        // Randomly decide who starts for Tic-Tac-Toe
        const starter = Math.random() > 0.5 ? socket.id : chat.partnerSocketId;
        io.to(socket.id).emit("game-started", { gameType, starter: starter === socket.id ? 'me' : 'partner' });
        io.to(chat.partnerSocketId).emit("game-started", { gameType, starter: starter === chat.partnerSocketId ? 'me' : 'partner' });
      }
    });

    socket.on("game-move", (move) => {
      const chat = activeChats.get(socket.id);
      if (chat) {
        io.to(chat.partnerSocketId).emit("game-partner-move", move);
      }
    });

    socket.on("doodle-draw", (stroke) => {
      const chat = activeChats.get(socket.id);
      if (chat) {
        io.to(chat.partnerSocketId).emit("doodle-partner-draw", stroke);
      }
    });

    socket.on("doodle-clear", () => {
      const chat = activeChats.get(socket.id);
      if (chat) {
        io.to(chat.partnerSocketId).emit("doodle-partner-clear");
      }
    });

    socket.on("game-cancel", () => {
      const chat = activeChats.get(socket.id);
      if (chat) {
        io.to(chat.partnerSocketId).emit("game-cancelled");
      }
    });

    // Direct messages are now handled by Firestore directly in the client

    socket.on("send-message", (payload) => {
      const chat = activeChats.get(socket.id);
      if (chat) {
        const text = typeof payload === 'string' ? payload : payload.text || '';
        const image = typeof payload === 'object' ? payload.image : undefined;
        const video = typeof payload === 'object' ? payload.video : undefined;
        const maxViews = typeof payload === 'object' ? payload.maxViews : undefined;
        const messageId = payload.id || Math.random().toString(36).substring(2, 15);

        // Check permissions for media
        if (image || video) {
          const partnerChat = activeChats.get(chat.partnerSocketId);
          if (!chat.mediaConsent || !partnerChat?.mediaConsent) {
            // Permission denied
            return;
          }
        }

        let cleanText = text;
        try {
          if (text) cleanText = filter.clean(text);
        } catch (e) {
          // If filter fails, use original text
        }

        io.to(chat.partnerSocketId).emit("receive-message", { 
          id: messageId,
          text: cleanText, 
          image: image,
          video: video,
          maxViews: maxViews,
          viewCount: 0,
          sender: "partner", 
          timestamp: new Date().toISOString() 
        });
      }
    });

    socket.on("message-viewed", (payload) => {
      const messageId = typeof payload === 'string' ? payload : payload.messageId;
      const partnerId = typeof payload === 'object' ? payload.partnerId : null;

      const chat = activeChats.get(socket.id);
      if (chat) {
        io.to(chat.partnerSocketId).emit("partner-message-viewed", messageId);
      } else if (partnerId) {
        // Handle direct message view
        const myUserId = socketToUser.get(socket.id);
        if (myUserId) {
          const chatId = getChatId(myUserId, partnerId);
          const messages = directMessages.get(chatId);
          if (messages) {
            const msg = messages.find(m => m.id === messageId);
            if (msg) {
              if (!msg.viewedBy) msg.viewedBy = {};
              msg.viewedBy[myUserId] = (msg.viewedBy[myUserId] || 0) + 1;
              msg.viewCount = (msg.viewCount || 0) + 1;
              saveData();
              
              // Notify partner's sockets
              const partnerSockets = userToSockets.get(partnerId);
              if (partnerSockets) {
                partnerSockets.forEach(sId => {
                  io.to(sId).emit("partner-message-viewed", messageId);
                });
              }
            }
          }
        }
      }
    });

    socket.on("message-reaction", ({ messageId, emoji }) => {
      const chat = activeChats.get(socket.id);
      if (chat) {
        io.to(chat.partnerSocketId).emit("partner-message-reaction", { messageId, emoji });
      }
    });

    socket.on("typing", (isTyping) => {
      const chat = activeChats.get(socket.id);
      if (chat) io.to(chat.partnerSocketId).emit("partner-typing", isTyping);
    });

    socket.on("leave-chat", () => {
      handleDisconnect(socket.id);
    });

    socket.on("disconnect", () => {
      const userId = socketToUser.get(socket.id);
      if (userId) {
        const isOffline = removeUserSocket(userId, socket.id);
        if (isOffline) notifyFriendsStatus(userId, false);
        socketToUser.delete(socket.id);
      }
      handleDisconnect(socket.id);
      socketToSession.delete(socket.id);
      io.emit("online-count", io.engine.clientsCount);
    });

    function handleDisconnect(socketId: string) {
      replaceWaitingQueue(waitingQueue.filter(u => u.socketId !== socketId));
      const chat = activeChats.get(socketId);
      if (chat) {
        io.to(chat.partnerSocketId).emit("partner-disconnected");
        activeChats.delete(chat.partnerSocketId);
        activeChats.delete(socketId);
      }
    }
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

  const PORT = 3000;
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
