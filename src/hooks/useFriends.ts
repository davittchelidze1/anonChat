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

      const friendIds = userData.friends || [];
      const requestIds = userData.friendRequests || [];

      // Batch fetch friend user data
      const friendDocs = await Promise.all(
        friendIds.map(friendId => getDoc(doc(db, 'users', friendId)))
      );

      // Batch fetch last messages for all friends
      const lastMessagePromises = friendIds.map(async (friendId) => {
        const chatId = [auth.currentUser!.uid, friendId].sort().join('_');
        const messagesRef = collection(db, 'directMessages', chatId, 'messages');
        const q = query(messagesRef, orderBy('timestamp', 'desc'), limit(1));
        const messagesSnap = await getDocs(q);

        if (!messagesSnap.empty) {
          const lastMsg = messagesSnap.docs[0].data();
          return {
            text: lastMsg.text || (lastMsg.image ? "Sent an image" : "Sent a video"),
            timestamp: lastMsg.timestamp
          };
        }
        return null;
      });

      const lastMessages = await Promise.all(lastMessagePromises);

      // Construct friends list with all data
      const friendsList: Friend[] = friendDocs
        .map((friendDoc, index) => {
          if (!friendDoc.exists()) return null;

          const friendData = friendDoc.data() as User;
          const lastMessage = lastMessages[index];

          return {
            id: friendIds[index],
            username: friendData.username || "Unknown",
            avatarColor: friendData.avatarColor || "zinc",
            isOnline: false,
            lastMessage: lastMessage?.text,
            lastMessageAt: lastMessage?.timestamp
          } as Friend;
        })
        .filter((f): f is Friend => f !== null);

      // Batch fetch friend request user data
      const requestDocs = await Promise.all(
        requestIds.map(fromId => getDoc(doc(db, 'users', fromId)))
      );

      const requestsList: FriendRequest[] = requestDocs
        .map((fromDoc, index) => {
          if (!fromDoc.exists()) return null;

          const fromData = fromDoc.data() as User;
          return {
            fromId: requestIds[index],
            fromUsername: fromData.username || "Unknown"
          };
        })
        .filter((r): r is FriendRequest => r !== null);

      // Sort friends by last message timestamp
      const sortedFriends = friendsList.sort((a, b) => {
        if (!a.lastMessageAt) return 1;
        if (!b.lastMessageAt) return -1;
        return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
      });

      setFriends((prev) => {
        const prevOnline = new Map(prev.map((friend) => [friend.id, friend.isOnline]));
        return sortedFriends.map((friend) => ({
          ...friend,
          isOnline: prevOnline.get(friend.id) ?? false,
        }));
      });
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
