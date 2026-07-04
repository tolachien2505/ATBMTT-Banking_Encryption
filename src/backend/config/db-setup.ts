import { initializeDatabase } from './db';

async function run() {
  try {
    await initializeDatabase();
    console.log('✅ DB Setup Completed successfully.');
    process.exit(0);
  } catch (e) {
    console.error('❌ DB Setup Failed:', e);
    process.exit(1);
  }
}

run();
