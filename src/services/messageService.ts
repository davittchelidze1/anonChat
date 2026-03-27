/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Message } from '../types';
import { generateMessageId } from '../utils/helpers';

/**
 * Service for handling message operations
 */
export class MessageService {
  /**
   * Send a text message to Firebase direct chat
   */
  static async sendDirectMessage(
    senderId: string,
    recipientId: string,
    text: string
  ): Promise<void> {
    const { auth, db } = await import('../firebase');
    const { doc, setDoc } = await import('firebase/firestore');

    if (!auth.currentUser) {
      throw new Error('User not authenticated');
    }

    const messageId = generateMessageId();
    const timestamp = new Date().toISOString();
    const chatId = [senderId, recipientId].sort().join('_');
    const messageRef = doc(db, 'directMessages', chatId, 'messages', messageId);

    await setDoc(messageRef, {
      id: messageId,
      senderId,
      text,
      timestamp,
      viewCount: 0,
      viewedBy: {},
    });
  }

  /**
   * Send an image message to Firebase direct chat
   */
  static async sendDirectImage(
    senderId: string,
    recipientId: string,
    base64Image: string,
    maxViews: number = 2
  ): Promise<void> {
    const { auth, db } = await import('../firebase');
    const { doc, setDoc } = await import('firebase/firestore');

    if (!auth.currentUser) {
      throw new Error('User not authenticated');
    }

    const messageId = generateMessageId();
    const timestamp = new Date().toISOString();
    const chatId = [senderId, recipientId].sort().join('_');
    const messageRef = doc(db, 'directMessages', chatId, 'messages', messageId);

    await setDoc(messageRef, {
      id: messageId,
      senderId,
      text: '',
      image: base64Image,
      timestamp,
      maxViews,
      viewCount: 0,
      viewedBy: {},
    });
  }

  /**
   * Send a video message to Firebase direct chat
   */
  static async sendDirectVideo(
    senderId: string,
    recipientId: string,
    base64Video: string,
    maxViews: number = 2
  ): Promise<void> {
    const { auth, db } = await import('../firebase');
    const { doc, setDoc } = await import('firebase/firestore');

    if (!auth.currentUser) {
      throw new Error('User not authenticated');
    }

    const messageId = generateMessageId();
    const timestamp = new Date().toISOString();
    const chatId = [senderId, recipientId].sort().join('_');
    const messageRef = doc(db, 'directMessages', chatId, 'messages', messageId);

    await setDoc(messageRef, {
      id: messageId,
      senderId,
      text: '',
      video: base64Video,
      timestamp,
      maxViews,
      viewCount: 0,
      viewedBy: {},
    });
  }

  /**
   * Update message view count in Firebase
   */
  static async updateMessageView(
    userId: string,
    recipientId: string,
    messageId: string
  ): Promise<void> {
    const { auth, db } = await import('../firebase');
    const { doc, getDoc, updateDoc } = await import('firebase/firestore');

    if (!auth.currentUser) return;

    const chatId = [userId, recipientId].sort().join('_');
    const messageRef = doc(db, 'directMessages', chatId, 'messages', messageId);

    const msgDoc = await getDoc(messageRef);
    if (msgDoc.exists()) {
      const data = msgDoc.data();
      const currentViewedBy = data.viewedBy || {};
      const myViews = currentViewedBy[userId] || 0;

      if (data.maxViews && myViews < data.maxViews) {
        await updateDoc(messageRef, {
          [`viewedBy.${userId}`]: myViews + 1,
          viewCount: (data.viewCount || 0) + 1,
        });
      }
    }
  }

  /**
   * Create a local message object for anonymous chat
   */
  static createLocalMessage(
    text: string = '',
    options: {
      image?: string;
      video?: string;
      maxViews?: number;
    } = {}
  ): Message {
    return {
      id: generateMessageId(),
      text,
      sender: 'me',
      timestamp: new Date().toISOString(),
      ...(options.image && { image: options.image }),
      ...(options.video && { video: options.video }),
      ...(options.maxViews && { maxViews: options.maxViews, viewCount: 0 }),
    };
  }

  /**
   * Subscribe to direct messages in Firebase
   */
  static subscribeToDirectMessages(
    userId: string,
    friendId: string,
    onUpdate: (messages: Message[]) => void
  ): () => void {
    let unsubscribe: (() => void) | null = null;

    (async () => {
      try {
        const { auth, db } = await import('../firebase');
        const { collection, query, orderBy, onSnapshot } = await import('firebase/firestore');

        if (!auth.currentUser) return;

        const chatId = [userId, friendId].sort().join('_');
        const messagesRef = collection(db, 'directMessages', chatId, 'messages');
        const q = query(messagesRef, orderBy('timestamp', 'asc'));

        unsubscribe = onSnapshot(q, (snapshot) => {
          const messages = snapshot.docs.map(doc => {
            const m = doc.data() as Message & { senderId: string };
            return {
              ...m,
              sender: m.senderId === userId ? 'me' : 'partner',
              isViewed: m.maxViews ? (m.viewCount || 0) >= m.maxViews : false,
            } as Message;
          });

          onUpdate(messages);
        });
      } catch (e) {
        console.error('Failed to subscribe to messages', e);
      }
    })();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }
}
