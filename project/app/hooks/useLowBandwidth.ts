"use client";
import { useState, useEffect } from 'react';

export function useLowBandwidth() {
  const [isLowBandwidth, setIsLowBandwidth] = useState(false);
  
  useEffect(() => {
    // Uses Network Information API if available
    if (typeof window !== 'undefined' && 'connection' in navigator) {
      const conn = (navigator as any).connection;
      
      const checkConnection = () => {
        if (conn.saveData || ['slow-2g', '2g', '3g'].includes(conn.effectiveType)) {
          setIsLowBandwidth(true);
        } else {
          setIsLowBandwidth(false);
        }
      };

      checkConnection();
      conn.addEventListener('change', checkConnection);
      return () => conn.removeEventListener('change', checkConnection);
    }
  }, []);

  return isLowBandwidth;
}
