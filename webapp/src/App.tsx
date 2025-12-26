import { useEffect } from 'react';
import './index.css';
import { GameCanvas } from './components/GameCanvas';
import WebApp from '@twa-dev/sdk';

function App() {
  useEffect(() => {
    // Initialize Telegram Mini App only if running inside Telegram
    if (typeof window !== 'undefined') {
      const telegram = (window as typeof window & { Telegram?: { WebApp?: { initDataUnsafe?: unknown } } }).Telegram;
      if (telegram?.WebApp?.initDataUnsafe && typeof telegram.WebApp.initDataUnsafe === 'object' && telegram.WebApp.initDataUnsafe !== null &&
          Object.keys(telegram.WebApp.initDataUnsafe).length > 0) {
        try {
          WebApp.ready();
          WebApp.expand();
          WebApp.setHeaderColor('#050505');
          WebApp.setBackgroundColor('#050505');
        } catch {
          // Silently fail outside Telegram
        }
      }
    }
  }, []);

  return <GameCanvas />;
}

export default App;
