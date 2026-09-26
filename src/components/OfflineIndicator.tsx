import React, { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-slate-900/90 dark:bg-white/90 text-white dark:text-slate-900 backdrop-blur-md px-4 py-2 text-xs font-medium shadow-xl border border-slate-700/50 animate-bounce">
      <WifiOff className="w-3.5 h-3.5 text-amber-400 dark:text-amber-600" />
      <span>Offline mode — Internet connection needed for pairing</span>
    </div>
  );
};
