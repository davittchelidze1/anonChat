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
  
  loadData();

  // Helper to get chat ID from two user IDs
  const getChatId = (id1: string, id2: string) => [id1, id2].sort().join("_");

  // Helper to get user from token
  const getUserFromToken = (token: string): UserRecord | null => {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      return users.get(decoded.userId) || null;
    } catch (e) {
      return null;
    }
  };

  // Auth Routes
  app.post("/api/auth/device-login", async (req, res) => {
    const { deviceId } = req.body;
    if (!deviceId) return res.status(400).json({ error: "Missing deviceId" });

    let userId = deviceIdToUserId.get(deviceId);
    let user = userId ? users.get(userId) : null;

    if (!user) {
      // Create new anonymous user
      const id = Math.random().toString(36).substring(2, 15);
      // Generate a unique username
      let username = `Anon-${Math.floor(Math.random() * 10000)}`;
      while (usernameToId.has(username.toLowerCase())) {
        username = `Anon-${Math.floor(Math.random() * 10000)}`;
      }
      
      const colors = ['indigo', 'emerald', 'rose', 'amber', 'violet', 'cyan', 'fuchsia'];
      const avatarColor = colors[Math.floor(Math.random() * colors.length)];

      const newUser: UserRecord = {
        id,
        username,
        passwordHash: "", // No password for anonymous users
        avatarColor,
        friends: [],
        friendRequests: [],
        deviceId
      };

      users.set(id, newUser);
      usernameToId.set(username.toLowerCase(), id);
      deviceIdToUserId.set(deviceId, id);
      saveData();
      user = newUser;
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET);
    res.cookie("token", token, { httpOnly: true, sameSite: 'none', secure: true });
    res.json({ user: { id: user.id, username: user.username, avatarColor: user.avatarColor }, token });
  });

  app.post("/api/auth/register", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Missing fields" });
    if (usernameToId.has(username.toLowerCase())) return res.status(400).json({ error: "Username taken" });

    const id = Math.random().toString(36).substring(2, 15);
    const passwordHash = await bcrypt.hash(password, 10);
    const colors = ['indigo', 'emerald', 'rose', 'amber', 'violet', 'cyan', 'fuchsia'];
    const avatarColor = colors[Math.floor(Math.random() * colors.length)];

    const newUser: UserRecord = {
      id,
      username,
      passwordHash,
      avatarColor,
      friends: [],
      friendRequests: []
    };

    users.set(id, newUser);
    usernameToId.set(username.toLowerCase(), id);
    saveData();

    const token = jwt.sign({ userId: id }, JWT_SECRET);
    res.cookie("token", token, { httpOnly: true, sameSite: 'none', secure: true });
    res.json({ user: { id, username, avatarColor }, token });
  });

  app.post("/api/auth/login", async (req, res) => {
    const { username, password } = req.body;
    const userId = usernameToId.get(username.toLowerCase());
    const user = userId ? users.get(userId) : null;

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET);
    res.cookie("token", token, { httpOnly: true, sameSite: 'none', secure: true });
    res.json({ user: { id: user.id, username: user.username, avatarColor: user.avatarColor }, token });
  });

  app.get("/api/auth/me", (req, res) => {
    const user = getUserFromToken(req.cookies.token);
    if (!user) return res.status(401).json({ error: "Not logged in" });
    res.json({ user: { id: user.id, username: user.username, avatarColor: user.avatarColor } });
  });

  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie("token");
    res.json({ success: true });
  });

  app.get("/api/friends", (req, res) => {
    const user = getUserFromToken(req.cookies.token);
    if (!user) return res.status(401).json({ error: "Not logged in" });
    
    const friendsList = (user.friends || []).map(fId => {
      const f = users.get(fId);
      const chatId = getChatId(user.id, fId);
      const msgs = directMessages.get(chatId) || [];
      const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;

      return {
        id: fId,
        username: f?.username || "Unknown",
        avatarColor: f?.avatarColor || "zinc",
        isOnline: userToSockets.has(fId),
        lastMessage: lastMsg ? (lastMsg.text || (lastMsg.image ? "Sent an image" : "Sent a video")) : undefined,
        lastMessageAt: lastMsg ? lastMsg.timestamp : undefined
      };
    });
    
    const requests = (user.friendRequests || []).map(fId => {
      const f = users.get(fId);
      return {
        fromId: fId,
        fromUsername: f?.username || "Unknown"
      };
    });

    res.json({ friends: friendsList, requests });
  });

  app.get("/api/messages/:friendId", (req, res) => {
    const user = getUserFromToken(req.cookies.token);
    if (!user) return res.status(401).json({ error: "Not logged in" });
    
    const friendId = req.params.friendId;
    if (!user.friends || !user.friends.includes(friendId)) {
      return res.status(403).json({ error: "Not friends" });
    }

    const chatId = getChatId(user.id, friendId);
    const messages = directMessages.get(chatId) || [];
    
    // Return messages with viewCount specific to the requesting user
    const userMessages = messages.map(m => ({
      ...m,
      viewCount: m.viewedBy ? (m.viewedBy[user.id] || 0) : (m.viewCount || 0)
    }));
    
    res.json(userMessages);
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
      const user = getUserFromToken(token);
      if (user) {
        socketToUser.set(socket.id, user.id);
        const isNew = addUserSocket(user.id, socket.id);
        if (isNew) notifyFriendsStatus(user.id, true);
        console.log("Authenticated user connected:", user.username, "Socket:", socket.id);
      }
    }

    console.log("User connected:", socket.id, "Session:", sessionId);
    io.emit("online-count", io.engine.clientsCount);

    socket.on("authenticate", (token) => {
      if (token) {
        const user = getUserFromToken(token);
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

    socket.on("send-friend-request", () => {
      const chat = activeChats.get(socket.id);
      const myUserId = socketToUser.get(socket.id);
      
      if (!myUserId) {
        socket.emit("auth-required-for-friend");
        return;
      }

      if (chat && chat.partnerUserId) {
        if (chat.partnerUserId === myUserId) {
          socket.emit("cannot-add-self");
          return;
        }
        const partner = users.get(chat.partnerUserId);
        const me = users.get(myUserId);
        if (partner && me) {
          if (partner.friends.includes(myUserId)) {
            socket.emit("already-friends");
            return;
          }
          if (partner.friendRequests.includes(myUserId)) {
            socket.emit("request-already-sent");
            return;
          }
          if (me.friendRequests.includes(partner.id)) {
            // They already sent us a request, just accept it
            me.friendRequests = me.friendRequests.filter(id => id !== partner.id);
            if (!me.friends.includes(partner.id)) me.friends.push(partner.id);
            if (!partner.friends.includes(myUserId)) partner.friends.push(myUserId);
            saveData();
            
            socket.emit("friend-request-accepted", partner.id);
            const partnerSockets = userToSockets.get(partner.id);
            if (partnerSockets) {
              partnerSockets.forEach(sId => {
                io.to(sId).emit("friend-request-accepted", myUserId);
              });
            }
            return;
          }
          partner.friendRequests.push(myUserId);
          saveData();
          const partnerSockets = userToSockets.get(partner.id);
          if (partnerSockets) {
            partnerSockets.forEach(sId => {
              io.to(sId).emit("new-friend-request", { fromId: me.id, fromUsername: me.username });
            });
          }
            socket.emit("friend-request-sent");
        }
      } else if (chat && !chat.partnerUserId) {
        socket.emit("partner-not-logged-in");
      }
    });

    socket.on("accept-friend-request", (fromId) => {
      const myUserId = socketToUser.get(socket.id);
      if (!myUserId) return;

      const me = users.get(myUserId);
      const fromUser = users.get(fromId);

      if (me && fromUser && me.friendRequests.includes(fromId)) {
        me.friendRequests = me.friendRequests.filter(id => id !== fromId);
        if (!me.friends.includes(fromId)) me.friends.push(fromId);
        if (!fromUser.friends.includes(myUserId)) fromUser.friends.push(myUserId);
        saveData();

        socket.emit("friend-request-accepted", fromId);
        const fromSockets = userToSockets.get(fromId);
        if (fromSockets) {
          fromSockets.forEach(sId => {
            io.to(sId).emit("friend-request-accepted", myUserId);
          });
        }
      }
    });

    socket.on("decline-friend-request", (fromId) => {
      const myUserId = socketToUser.get(socket.id);
      if (!myUserId) return;

      const me = users.get(myUserId);
      if (me && me.friendRequests.includes(fromId)) {
        me.friendRequests = me.friendRequests.filter(id => id !== fromId);
        saveData();
        socket.emit("friend-request-declined", fromId);
      }
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

    socket.on("send-direct-message", (payload) => {
      const userId = socketToUser.get(socket.id);
      if (!userId) return;

      const { toId, text, image, video, id, maxViews } = payload;
      const user = users.get(userId);
      if (!user || !user.friends || !user.friends.includes(toId)) {
        console.log("Direct message failed: Not friends or user not found", userId, toId);
        return;
      }

      const chatId = getChatId(userId, toId);
      const messageId = id || Math.random().toString(36).substring(2, 15);
      const timestamp = new Date().toISOString();

      let cleanText = text;
      try {
        if (text) cleanText = filter.clean(text);
      } catch (e) {}

      const msg: DirectMessage = {
        id: messageId,
        senderId: userId,
        text: cleanText,
        timestamp,
        image,
        video,
        maxViews,
        viewCount: 0,
        viewedBy: {}
      };

      if (!directMessages.has(chatId)) {
        directMessages.set(chatId, []);
      }
      directMessages.get(chatId)!.push(msg);
      saveData();

      // Send to recipient (all their sockets)
      const recipientSockets = userToSockets.get(toId);
      if (recipientSockets) {
        recipientSockets.forEach(sId => {
          io.to(sId).emit("receive-direct-message", {
            ...msg,
            sender: 'partner'
          });
        });
      }
      
      // Send confirmation to all of sender's sockets (sync across tabs)
      const senderSockets = userToSockets.get(userId);
      if (senderSockets) {
        senderSockets.forEach(sId => {
          io.to(sId).emit("direct-message-sent", {
            ...msg,
            toId,
            sender: 'me'
          });
        });
      }
    });

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
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });

  app.use(vite.middlewares);

  const PORT = 3000;
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
