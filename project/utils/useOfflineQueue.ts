"use client";
import { useState, useEffect, useCallback } from 'react';

type QueueItem = { id: string; actionName: string; payload: any; timestamp: number };

export function useOfflineQueue() {
  const [isOnline, setIsOnline] = useState(true);
  const [queue, setQueue] = useState<QueueItem[]>([]);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    
    // In a real app, use localForage here to load saved queue
    const saved = localStorage.getItem('offline_queue');
    if (saved) {
      try { setQueue(JSON.parse(saved)); } catch (e) {}
    }

    const setOnline = () => setIsOnline(true);
    const setOffline = () => setIsOnline(false);

    window.addEventListener('online', setOnline);
    window.addEventListener('offline', setOffline);

    return () => {
      window.removeEventListener('online', setOnline);
      window.removeEventListener('offline', setOffline);
    };
  }, []);

  const syncQueue = useCallback(async (handler: (item: QueueItem) => Promise<boolean>) => {
    if (!isOnline || queue.length === 0) return;
    
    const newQueue = [...queue];
    for (let i = newQueue.length - 1; i >= 0; i--) {
      const item = newQueue[i];
      const success = await handler(item);
      if (success) {
        newQueue.splice(i, 1);
      }
    }
    setQueue(newQueue);
    localStorage.setItem('offline_queue', JSON.stringify(newQueue));
  }, [isOnline, queue]);

  const pushToQueue = (actionName: string, payload: any) => {
    const newItem = { id: Date.now().toString(), actionName, payload, timestamp: Date.now() };
    const newQueue = [...queue, newItem];
    setQueue(newQueue);
    localStorage.setItem('offline_queue', JSON.stringify(newQueue));
  };

  return { isOnline, queue, pushToQueue, syncQueue };
}
