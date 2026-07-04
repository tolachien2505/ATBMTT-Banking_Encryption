import app from './app';
import { initializeDatabase } from './config/db';
import { CryptoService } from './modules/crypto/crypto.service';
import { GameService } from './modules/game/game.service';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 4000;

async function bootstrap() {
  try {
    // 1. Initialize and Seed MySQL Database
    await initializeDatabase();

    // 2. Pre-warm RSA keys in background (non-blocking)
    //    This generates 1024-bit RSA pairs once and caches them in memory,
    //    so the very first "play level" request responds in ~50ms instead of ~3s.
    setImmediate(async () => {
      try {
        CryptoService.preWarmKeys();          // generate + cache RSA pairs
        await GameService.getOrCreateKeys();   // seed DB if needed, cache result
        console.log('[BOOT] RSA key cache ready — level loads will be fast.');
      } catch (e) {
        console.warn('[BOOT] Key pre-warm warning (non-fatal):', e);
      }
    });

    // 3. Start Express Web Server
    app.listen(PORT, () => {
      console.log('================================================================');
      console.log(`🌐 CYBERBANK SECURITY GAME V2 ENGINE RUNNING SUCCESSFULLY!`);
      console.log(`📡 URL ACCESS: http://localhost:${PORT}`);
      console.log(`🛡️  OPERATOR INTERFACE ACTIVE IN CYBERPUNK HUD DARK MODE`);
      console.log('================================================================');
    });
  } catch (error) {
    console.error('❌ CRITICAL ENGINE BOOT FAILURE:', error);
    process.exit(1);
  }
}

bootstrap();
