const { initializeDatabase } = require('./dist/backend/config/db');
const { GameService } = require('./dist/backend/modules/game/game.service');

async function run() {
  try {
    console.log('Initializing database connection...');
    await initializeDatabase();
    
    console.log('Testing GameService.startLevel...');
    // Use a mock session ID and Level ID
    const sessionId = 'mock_session_id_123';
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
