import { useState, useCallback, useEffect } from 'react';
import { Friend, FriendRequest, User } from '../types';
import { auth, db } from '../firebase';
import { doc, getDoc, collection, query, getDocs, orderBy, limit } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export const useFriends = () => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);

  const fetchFriends = useCallback(async () => {
    try {
      if (!auth.currentUser) return;
      
      const userDocRef = doc(db, 'users', auth.currentUser.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) return;
      const userData = userDoc.data() as User;
      
      const friendsList: Friend[] = [];
      const requestsList: FriendRequest[] = [];
      
      // Fetch friends
      for (const friendId of (userData.friends || [])) {
        const friendDoc = await getDoc(doc(db, 'users', friendId));
        if (friendDoc.exists()) {
          const friendData = friendDoc.data() as User;
          
          // Get last message
          const chatId = [auth.currentUser.uid, friendId].sort().join('_');
          const messagesRef = collection(db, 'directMessages', chatId, 'messages');
          const q = query(messagesRef, orderBy('timestamp', 'desc'), limit(1));
          const messagesSnap = await getDocs(q);
          
          let lastMessageText;
          let lastMessageAt;
          
          if (!messagesSnap.empty) {
            const lastMsg = messagesSnap.docs[0].data();
            lastMessageText = lastMsg.text || (lastMsg.image ? "Sent an image" : "Sent a video");
            lastMessageAt = lastMsg.timestamp;
          }
          
          friendsList.push({
            id: friendId,
            username: friendData.username || "Unknown",
            avatarColor: friendData.avatarColor || "zinc",
            isOnline: false, // Will be updated by socket
            lastMessage: lastMessageText,
            lastMessageAt
          });
        }
      }
      
      // Fetch requests
      for (const fromId of (userData.friendRequests || [])) {
        const fromDoc = await getDoc(doc(db, 'users', fromId));
        if (fromDoc.exists()) {
          const fromData = fromDoc.data() as User;
          requestsList.push({
            fromId,
            fromUsername: fromData.username || "Unknown"
          });
        }
      }
      
      const sortedFriends = friendsList.sort((a, b) => {
        if (!a.lastMessageAt) return 1;
        if (!b.lastMessageAt) return -1;
        return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
      });
      
      setFriends(sortedFriends);
      setRequests(requestsList);
    } catch (e) {
      console.error("Failed to fetch friends", e);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchFriends();
      } else {
        setFriends([]);
        setRequests([]);
      }
    });
    return () => unsubscribe();
  }, [fetchFriends]);

  return { friends, requests, setFriends, setRequests, fetchFriends };
};
