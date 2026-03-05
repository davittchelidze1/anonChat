import { useState, useCallback, useEffect } from 'react';
import { Friend, FriendRequest } from '../types';

export const useFriends = () => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);

  const fetchFriends = useCallback(async () => {
    try {
      const res = await fetch('/api/friends');
      if (res.ok) {
        const data = await res.json();
        const sortedFriends = (data.friends as Friend[]).sort((a, b) => {
          if (!a.lastMessageAt) return 1;
          if (!b.lastMessageAt) return -1;
          return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
        });
        setFriends(sortedFriends);
        setRequests(data.requests);
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  return { friends, requests, setFriends, setRequests, fetchFriends };
};
