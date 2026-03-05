import { UserRecord, DirectMessage, ChatSession, WaitingUser } from './types';
import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), "data.json");

export const users = new Map<string, UserRecord>();
export const usernameToId = new Map<string, string>();
export const directMessages = new Map<string, DirectMessage[]>();

export const waitingQueue: WaitingUser[] = [];

export const replaceWaitingQueue = (newQueue: WaitingUser[]) => {
  waitingQueue.length = 0;
  waitingQueue.push(...newQueue);
};

export const activeChats = new Map<string, ChatSession>();
export const socketToSession = new Map<string, string>();
export const socketToUser = new Map<string, string>();
export const userToSockets = new Map<string, Set<string>>();
export const skippedPairs = new Map<string, number>();

export const loadData = () => {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const fileContent = fs.readFileSync(DATA_FILE, "utf8");
      if (!fileContent.trim()) return;
      
      const data = JSON.parse(fileContent);
      if (data.users) {
        Object.entries(data.users).forEach(([k, v]) => users.set(k, v as UserRecord));
      }
      if (data.usernameToId) {
        Object.entries(data.usernameToId).forEach(([k, v]) => usernameToId.set(k, v as string));
      }
      if (data.directMessages) {
        Object.entries(data.directMessages).forEach(([k, v]) => directMessages.set(k, v as DirectMessage[]));
      }
      console.log("Data loaded from disk:", users.size, "users");
    }
  } catch (e) {
    console.error("Error loading data from disk. Starting with fresh state.", e);
  }
};

export const saveData = () => {
  try {
    const data = {
      users: Object.fromEntries(users),
      usernameToId: Object.fromEntries(usernameToId),
      directMessages: Object.fromEntries(directMessages)
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("Error saving data:", e);
  }
};
