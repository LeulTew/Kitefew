import { useEffect } from 'react';
import './index.css';
import { GameCanvas } from './components/GameCanvas';
import WebApp from '@twa-dev/sdk';

function App() {
  useEffect(() => {
    // Initialize Telegram Mini App only if running inside Telegram
    if (typeof window !== 'undefined' &&
      (window as any).Telegram?.WebApp?.initDataUnsafe &&
      Object.keys((window as any).Telegram.WebApp.initDataUnsafe).length > 0) {
      try {
        WebApp.ready();
        WebApp.expand();
        WebApp.setHeaderColor('#050505');
        WebApp.setBackgroundColor('#050505');
      } catch (e) {
        // Silently fail outside Telegram
      }
    }
  }, []);

  return <GameCanvas />;
}

export default App;
