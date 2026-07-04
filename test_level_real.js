const { initializeDatabase, query } = require('./dist/backend/config/db');
const { GameService } = require('./dist/backend/modules/game/game.service');

async function run() {
  try {
    console.log('Initializing database connection...');
    await initializeDatabase();
    
    // Fetch a real active session from game_sessions
    const sessions = await query('SELECT session_id FROM game_sessions LIMIT 1');
    if (sessions.length === 0) {
      console.log('No sessions found! Creating a temporary session...');
      // Create user first
      process.exit(1);
    }
    const sessionId = sessions[0].session_id;
    console.log('Found real session ID:', sessionId);
    
    console.log('Testing GameService.startLevel...');
    const levelId = 'level_valid_transaction';
    
    const result = await GameService.startLevel(levelId, sessionId);
    console.log('SUCCESS! Level started successfully. Result payload:', result.tx_id);
    process.exit(0);
  } catch (error) {
    console.error('FAILED! Exception caught:', error);
    process.exit(1);
  }
}

run();
