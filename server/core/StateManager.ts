/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserRecord, DirectMessage, ChatSession, WaitingUser } from '../types';
import fs from 'fs';
import path from 'path';

/**
 * Centralized state management for the chat application.
 * This provides atomic operations and proper encapsulation of state.
 * Future: Can be extended to use Redis for multi-instance support.
 */
export class StateManager {
  private users: Map<string, UserRecord>;
  private usernameToId: Map<string, string>;
  private deviceIdToUserId: Map<string, string>;
  private directMessages: Map<string, DirectMessage[]>;
  private waitingQueue: WaitingUser[];
  private activeChats: Map<string, ChatSession>;
  private socketToSession: Map<string, string>;
  private socketToUser: Map<string, string>;
  private userToSockets: Map<string, Set<string>>;
  private queueLock: boolean;
  private dataFile: string;

  constructor(dataFilePath?: string) {
    this.users = new Map();
    this.usernameToId = new Map();
    this.deviceIdToUserId = new Map();
    this.directMessages = new Map();
    this.waitingQueue = [];
    this.activeChats = new Map();
    this.socketToSession = new Map();
    this.socketToUser = new Map();
    this.userToSockets = new Map();
    this.queueLock = false;
    this.dataFile = dataFilePath || path.join(process.cwd(), 'data.json');
  }

  // ============================================================================
  // User Management
  // ============================================================================

  getUser(userId: string): UserRecord | undefined {
    return this.users.get(userId);
  }

  setUser(userId: string, user: UserRecord): void {
    this.users.set(userId, user);
    this.usernameToId.set(user.username, userId);
    if (user.deviceId) {
      this.deviceIdToUserId.set(user.deviceId, userId);
    }
  }

  getUserIdByUsername(username: string): string | undefined {
    return this.usernameToId.get(username);
  }

  getUserIdByDeviceId(deviceId: string): string | undefined {
    return this.deviceIdToUserId.get(deviceId);
  }

  getAllUsers(): Map<string, UserRecord> {
    return this.users;
  }

  // ============================================================================
  // Direct Messages
  // ============================================================================

  getDirectMessages(chatId: string): DirectMessage[] {
    return this.directMessages.get(chatId) || [];
  }

  setDirectMessages(chatId: string, messages: DirectMessage[]): void {
    this.directMessages.set(chatId, messages);
  }

  // ============================================================================
  // Waiting Queue (with atomic operations)
  // ============================================================================

  /**
   * Atomically add a user to the waiting queue
   */
  async addToQueue(waitingUser: WaitingUser): Promise<void> {
    // Wait for lock
    while (this.queueLock) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    this.queueLock = true;
    try {
      // Check if already in queue
      const alreadyInQueue = this.waitingQueue.some(u => u.socketId === waitingUser.socketId);
      if (!alreadyInQueue) {
        this.waitingQueue.push(waitingUser);
      }
    } finally {
      this.queueLock = false;
    }
  }

  /**
   * Atomically remove a user from the queue
   */
  async removeFromQueue(socketId: string): Promise<boolean> {
    while (this.queueLock) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    this.queueLock = true;
    try {
      const initialLength = this.waitingQueue.length;
      this.waitingQueue = this.waitingQueue.filter(u => u.socketId !== socketId);
      return this.waitingQueue.length < initialLength;
    } finally {
      this.queueLock = false;
    }
  }

  /**
   * Atomically find and remove a match from the queue
   */
  async findMatch(requestingSocketId: string): Promise<WaitingUser | null> {
    while (this.queueLock) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    this.queueLock = true;
    try {
      // Find first available partner (not self)
      const partnerIndex = this.waitingQueue.findIndex(u => u.socketId !== requestingSocketId);

      if (partnerIndex !== -1) {
        const partner = this.waitingQueue.splice(partnerIndex, 1)[0];
        return partner;
      }

      return null;
    } finally {
      this.queueLock = false;
    }
  }

  /**
   * Check if user is in queue
   */
  isInQueue(socketId: string): boolean {
    return this.waitingQueue.some(u => u.socketId === socketId);
  }

  /**
   * Get queue size
   */
  getQueueSize(): number {
    return this.waitingQueue.length;
  }

  /**
   * Update user ID in queue
   */
  updateQueueUserId(socketId: string, userId: string | undefined): void {
    const entry = this.waitingQueue.find(u => u.socketId === socketId);
    if (entry) {
      entry.userId = userId;
    }
  }

  // ============================================================================
  // Active Chats
  // ============================================================================

  getChat(socketId: string): ChatSession | undefined {
    return this.activeChats.get(socketId);
  }

  setChat(socketId: string, session: ChatSession): void {
    this.activeChats.set(socketId, session);
  }

  deleteChat(socketId: string): boolean {
    return this.activeChats.delete(socketId);
  }

  hasActiveChat(socketId: string): boolean {
    return this.activeChats.has(socketId);
  }

  // ============================================================================
  // Socket Mappings
  // ============================================================================

  getSessionId(socketId: string): string | undefined {
    return this.socketToSession.get(socketId);
  }

  setSocketSession(socketId: string, sessionId: string): void {
    this.socketToSession.set(socketId, sessionId);
  }

  deleteSocketSession(socketId: string): void {
    this.socketToSession.delete(socketId);
  }

  getUserId(socketId: string): string | undefined {
    return this.socketToUser.get(socketId);
  }

  setSocketUser(socketId: string, userId: string): void {
    this.socketToUser.set(socketId, userId);
  }

  deleteSocketUser(socketId: string): void {
    this.socketToUser.delete(socketId);
  }

  // ============================================================================
  // User to Sockets Mapping (for presence)
  // ============================================================================

  addUserSocket(userId: string, socketId: string): boolean {
    let isNew = false;
    if (!this.userToSockets.has(userId)) {
      this.userToSockets.set(userId, new Set());
      isNew = true;
    }
    this.userToSockets.get(userId)!.add(socketId);
    return isNew;
  }

  removeUserSocket(userId: string, socketId: string): boolean {
    const sockets = this.userToSockets.get(userId);
    if (sockets) {
      sockets.delete(socketId);
      if (sockets.size === 0) {
        this.userToSockets.delete(userId);
        return true; // User is now offline
      }
    }
    return false;
  }

  getUserSockets(userId: string): Set<string> | undefined {
    return this.userToSockets.get(userId);
  }

  isUserOnline(userId: string): boolean {
    return this.userToSockets.has(userId);
  }

  // ============================================================================
  // Persistence
  // ============================================================================

  loadData(): void {
    try {
      if (fs.existsSync(this.dataFile)) {
        const fileContent = fs.readFileSync(this.dataFile, 'utf8');
        if (!fileContent.trim()) return;

        const data = JSON.parse(fileContent);

        if (data.users) {
          Object.entries(data.users).forEach(([k, v]) => {
            const user = v as UserRecord;
            this.users.set(k, user);
            if (user.deviceId) {
              this.deviceIdToUserId.set(user.deviceId, user.id);
            }
          });
        }

        if (data.usernameToId) {
          Object.entries(data.usernameToId).forEach(([k, v]) =>
            this.usernameToId.set(k, v as string)
          );
        }

        if (data.directMessages) {
          Object.entries(data.directMessages).forEach(([k, v]) =>
            this.directMessages.set(k, v as DirectMessage[])
          );
        }

        console.log(`[StateManager] Data loaded from disk: ${this.users.size} users`);
      }
    } catch (e) {
      console.error('[StateManager] Error loading data from disk. Starting with fresh state.', e);
    }
  }

  saveData(): void {
    try {
      const data = {
        users: Object.fromEntries(this.users),
        usernameToId: Object.fromEntries(this.usernameToId),
        directMessages: Object.fromEntries(this.directMessages),
      };
      fs.writeFileSync(this.dataFile, JSON.stringify(data, null, 2));
    } catch (e) {
      console.error('[StateManager] Error saving data:', e);
    }
  }

  // ============================================================================
  // Cleanup & Stats
  // ============================================================================

  /**
   * Clean up disconnected socket
   */
  cleanupSocket(socketId: string): void {
    const userId = this.socketToUser.get(socketId);
    if (userId) {
      this.removeUserSocket(userId, socketId);
      this.socketToUser.delete(socketId);
    }

    this.socketToSession.delete(socketId);
    this.removeFromQueue(socketId);

    const chat = this.activeChats.get(socketId);
    if (chat) {
      this.activeChats.delete(socketId);
      this.activeChats.delete(chat.partnerSocketId);
    }
  }

  /**
   * Get statistics about current state
   */
  getStats() {
    return {
      users: this.users.size,
      activeChats: this.activeChats.size / 2, // Divided by 2 because each chat has 2 entries
      waitingInQueue: this.waitingQueue.length,
      connectedSockets: this.socketToSession.size,
      onlineUsers: this.userToSockets.size,
    };
  }
}

// Singleton instance
let stateManager: StateManager | null = null;

/**
 * Get the singleton instance of StateManager
 */
export function getStateManager(): StateManager {
  if (!stateManager) {
    stateManager = new StateManager();
  }
  return stateManager;
}
