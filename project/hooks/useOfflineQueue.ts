import { useState, useEffect, useCallback } from 'react';
import localForage from 'localforage';

export function useOfflineQueue() {
  const [isOffline, setIsOffline] = useState(false);
  const [queueSize, setQueueSize] = useState(0);

  useEffect(() => {
    // Check initial status
    setIsOffline(!navigator.onLine);
    updateQueueSize();

    const handleOnline = () => {
      setIsOffline(false);
      processQueue();
    };
    const handleOffline = () => {
      setIsOffline(true);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Also check queue size periodically
    const interval = setInterval(updateQueueSize, 5000);
    
    return () => { 
        window.removeEventListener('online', handleOnline); 
        window.removeEventListener('offline', handleOffline);
        clearInterval(interval);
    };
  }, []);

  const updateQueueSize = async () => {
    const queue: any[] = await localForage.getItem('messageQueue') || [];
    setQueueSize(queue.length);
  };

  const queueMessage = async (msg: any) => {
    const queue: any[] = await localForage.getItem('messageQueue') || [];
    queue.push({
      ...msg,
      queuedAt: new Date().toISOString(),
      retryCount: 0
    });
    await localForage.setItem('messageQueue', queue);
    setQueueSize(queue.length);
  };

  const processQueue = async () => {
    const queue: any[] = await localForage.getItem('messageQueue') || [];
    if (queue.length === 0) return;

    const processedQueue: any[] = [];
    
    for (const msg of queue) {
      try {
        const response = await fetch('/api/chat/messages', { 
            method: 'POST', 
            body: JSON.stringify(msg), 
            headers: { 'Content-Type': 'application/json' } 
        });
        
        if (response.ok) {
          // Successfully sent, don't re-queue
          continue;
        } else {
          // Failed, increment retry count
          msg.retryCount = (msg.retryCount || 0) + 1;
          if (msg.retryCount < 3) {
            processedQueue.push(msg);
          }
        }
      } catch (err) {
          console.error("Failed to send queued message", err);
          msg.retryCount = (msg.retryCount || 0) + 1;
          if (msg.retryCount < 3) {
            processedQueue.push(msg);
          }
      }
    }
    
    // Update queue with remaining messages
    await localForage.setItem('messageQueue', processedQueue);
    setQueueSize(processedQueue.length);
  };

  const clearQueue = async () => {
    await localForage.removeItem('messageQueue');
    setQueueSize(0);
  };

  return { isOffline, queueMessage, queueSize, clearQueue, processQueue };
}
