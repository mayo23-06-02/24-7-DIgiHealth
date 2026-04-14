import { useState, useEffect } from 'react';
import localForage from 'localforage';

export function useOfflineQueue() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // Check initial status
    setIsOffline(!navigator.onLine);

    const handleOnline = () => {
      setIsOffline(false);
      processQueue();
    };
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => { 
        window.removeEventListener('online', handleOnline); 
        window.removeEventListener('offline', handleOffline); 
    };
  }, []);

  const queueMessage = async (msg: any) => {
    const queue: any[] = await localForage.getItem('messageQueue') || [];
    queue.push(msg);
    await localForage.setItem('messageQueue', queue);
  };

  const processQueue = async () => {
    const queue: any[] = await localForage.getItem('messageQueue') || [];
    if (queue.length === 0) return;

    for (const msg of queue) {
      try {
          await fetch('/api/chat/messages', { 
              method: 'POST', 
              body: JSON.stringify(msg), 
              headers: { 'Content-Type': 'application/json' } 
          });
      } catch (err) {
          console.error("Failed to send queued message", err);
      }
    }
    await localForage.removeItem('messageQueue');
  };

  return { isOffline, queueMessage };
}
