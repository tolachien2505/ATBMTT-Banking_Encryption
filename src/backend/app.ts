import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { query } from './config/db';
import { AuthService } from './modules/auth/auth.service';
import { GameService } from './modules/game/game.service';
import { ValidatorService } from './modules/transactions/validator.service';
import { TestService } from './modules/tests/test.service';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'cyberbank_operator_access_neon_glow_secret_key_2026';

const app = express();

app.use(cors());
app.use(express.json());

// 1. Auth Middleware
export interface AuthenticatedRequest extends Request {
  user?: {
    user_id: string;
    email: string;
    role: string;
    full_name: string;
  };
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'AUTH_REQUIRED' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, ACCESS_SECRET) as any;
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'SESSION_EXPIRED' });
  }
}

// --- API ROUTES ---

// Auth Endpoints
app.post('/api/auth/register', async (req: Request, res: Response) => {
  const { email, password, full_name } = req.body;
  if (!email || !password || !full_name) {
    return res.status(400).json({ success: false, error: 'MISSING_FIELDS' });
  }
  try {
    const data = await AuthService.register(email, password, full_name);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/auth/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'MISSING_FIELDS' });
  }
  try {
    const data = await AuthService.login(email, password);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.get('/api/auth/me', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.user_id;
    const users = await query('SELECT user_id, email, full_name, role FROM users WHERE user_id = ?', [userId]);
    const profiles = await query('SELECT * FROM player_profiles WHERE user_id = ?', [userId]);
    
    if (users.length === 0) {
      return res.status(404).json({ success: false, error: 'USER_NOT_FOUND' });
    }

    res.json({
      success: true,
      data: {
        user: users[0],
        profile: profiles[0] || null,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Game Endpoints
app.get('/api/game/levels', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const levels = await query('SELECT level_id, level_no, title, scenario_type, attack_type, difficulty, max_score, unlock_score_required, is_required FROM levels WHERE is_active = 1 ORDER BY level_no');
    
    // Fetch attempts status for this user
    const attempts = await query(
      'SELECT DISTINCT tx.level_id, MAX(a.is_success) as is_completed, MAX(a.score_delta) as highest_score FROM transaction_attempts a JOIN transactions tx ON tx.tx_id = a.tx_id WHERE a.user_id = ? GROUP BY tx.level_id',
      [req.user!.user_id]
    );

    const data = levels.map((lvl: any) => {
      const attempt = attempts.find((a: any) => a.level_id === lvl.level_id);
      return {
        ...lvl,
        is_completed: attempt ? attempt.is_completed === 1 : false,
        highest_score: attempt ? attempt.highest_score : 0,
      };
    });

    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/game/levels/:id/start', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const levelId = req.params.id;
  const { session_id } = req.body;
  if (!session_id) {
    return res.status(400).json({ success: false, error: 'SESSION_REQUIRED' });
  }

  try {
    const data = await GameService.startLevel(levelId, session_id);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/game/attempts', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { tx_id, selected_defenses, envelope } = req.body;
  const userId = req.user!.user_id;

  if (!tx_id || !selected_defenses || !envelope) {
    return res.status(400).json({ success: false, error: 'MISSING_ATTEMPT_DATA' });
  }

  try {
    // 0. Ensure keys exist in database
    await GameService.getOrCreateKeys();

    // 1. Fetch original transaction details
    const txs = await query('SELECT * FROM transactions WHERE tx_id = ?', [tx_id]);
    if (txs.length === 0) {
      return res.status(404).json({ success: false, error: 'TRANSACTION_NOT_FOUND' });
    }
    const tx = txs[0];

    // 2. Fetch session details
    const sessions = await query('SELECT * FROM game_sessions WHERE session_id = ?', [tx.session_id]);
    if (sessions.length === 0) {
      return res.status(404).json({ success: false, error: 'SESSION_NOT_FOUND' });
    }
    const session = sessions[0];

    // 3. Increment attempt number
    const countRes = await query('SELECT COUNT(*) as count FROM transaction_attempts WHERE tx_id = ?', [tx_id]);
    const attemptNo = (countRes as any)[0].count + 1;

    // 4. Attacker Bot Intercepts & Applies Attack
    const attackedEnvelope = await GameService.applyAttack(tx.level_id, envelope, tx.submitted_amount);

    // 5. Run validation pipeline
    const attemptId = crypto.randomUUID();
    const result = await ValidatorService.validate(
      attemptId,
      tx_id,
      tx.session_id,
      userId,
      selected_defenses,
      attackedEnvelope
    );

    // 6. Record Attempt into Database
    await query(
      'INSERT INTO transaction_attempts (attempt_id, tx_id, session_id, user_id, attempt_no, selected_defenses, validator_result, result_status, expected_result_status, is_success, payload_hash, signature_status, encryption_status, replay_status, key_status, score_delta, explanation_markdown) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        attemptId,
        tx_id,
        tx.session_id,
        userId,
        attemptNo,
        JSON.stringify(selected_defenses),
        JSON.stringify(result.logs),
        result.resultStatus,
        tx.attack_type === 'NONE' ? 'ACCEPTED' : 'REJECTED',
        result.isSuccess,
        attackedEnvelope.payload_hash || null,
        result.signatureStatus,
        result.encryptionStatus,
        result.replayStatus,
        result.keyStatus,
        result.scoreDelta,
        result.explanation,
      ]
    );

    // Write Replay Cache if flagged, avoiding foreign key constraint issues
    if (result.shouldCacheMessage && result.cacheDetails) {
      await query(
        'INSERT INTO replay_cache (cache_id, session_id, message_id, nonce_hash, sequence_no, tx_id, first_seen_attempt_id, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          result.cacheDetails.cache_id,
          result.cacheDetails.session_id,
          result.cacheDetails.message_id,
          result.cacheDetails.nonce_hash,
          result.cacheDetails.sequence_no,
          result.cacheDetails.tx_id,
          attemptId,
          result.cacheDetails.expires_at,
        ]
      );
    }

    // Write Envelope structure for logs/history
    await query(
      'INSERT INTO transaction_envelopes (envelope_id, attempt_id, message_id, nonce_hash, sequence_no, tx_timestamp, session_binding, aad, public_payload, ciphertext_b64, tag_b64, payload_hash, signature_b64, signer_key_id, encryption_key_id, algorithm) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        crypto.randomUUID(),
        attemptId,
        attackedEnvelope.message_id,
        attackedEnvelope.nonce_hash || null,
        attackedEnvelope.sequence_no || null,
        new Date(attackedEnvelope.tx_timestamp),
        attackedEnvelope.session_binding,
        JSON.stringify(attackedEnvelope.aad || {}),
        JSON.stringify(attackedEnvelope.public_payload || {}),
        attackedEnvelope.ciphertext_b64 || null,
        attackedEnvelope.tag_b64 || null,
        attackedEnvelope.payload_hash || null,
        attackedEnvelope.signature_b64 || null,
        attackedEnvelope.signer_key_id || null,
        attackedEnvelope.encryption_key_id || null,
        JSON.stringify(attackedEnvelope.algorithm || {}),
      ]
    );

    // Write logs to db transaction_logs
    for (const log of result.logs) {
      await query(
        'INSERT INTO transaction_logs (log_id, session_id, tx_id, attempt_id, event_type, severity, message) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [crypto.randomUUID(), tx.session_id, tx_id, attemptId, log.eventType, log.severity, log.message]
      );
    }

    // Insert score event and recalculate total user score
    if (result.scoreDelta > 0) {
      const reasonCode = result.isSuccess ? 'CORRECT_PRIMARY_DEFENSE' : 'PARTIAL_DEFENSE';
      await query(
        'INSERT INTO score_events (score_event_id, session_id, user_id, level_id, attempt_id, reason_code, points, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          crypto.randomUUID(),
          tx.session_id,
          userId,
          tx.level_id,
          attemptId,
          reasonCode,
          result.scoreDelta,
          `Hoàn thành lần thử level: ${tx.level_id}`,
        ]
      );

      // Recalculate total score
      const totalScoreRes = await query('SELECT SUM(points) as total FROM score_events WHERE user_id = ?', [userId]);
      const newTotalScore = (totalScoreRes as any)[0].total || 0;
      
      const countCompleted = await query(
        'SELECT COUNT(DISTINCT tx.level_id) as count FROM transaction_attempts a JOIN transactions tx ON tx.tx_id = a.tx_id WHERE a.user_id = ? AND a.is_success = 1',
        [userId]
      );
      const newCompletedCount = (countCompleted as any)[0].count || 0;

      // Update operator rank based on new score
      let rank = 'NOVICE_OPERATOR';
      if (newTotalScore >= 400) rank = 'FORENSIC_MASTER';
      else if (newTotalScore >= 250) rank = 'CRYPTOGRAPHIC_SPECIALIST';
      else if (newTotalScore >= 120) rank = 'CYBER_GUARDIAN';

      await query(
        'UPDATE player_profiles SET total_score = ?, completed_level_count = ?, operator_rank = ? WHERE user_id = ?',
        [newTotalScore, newCompletedCount, rank, userId]
      );
    }

    // If level passed successfully, update transaction status
    if (result.isSuccess) {
      await query('UPDATE transactions SET tx_status = ? WHERE tx_id = ?', [result.resultStatus, tx_id]);
    }

    res.json({
      success: true,
      data: {
        attempt_id: attemptId,
        is_success: result.isSuccess,
        result_status: result.resultStatus,
        score_delta: result.scoreDelta,
        explanation: result.explanation,
        logs: result.logs,
        attacked_envelope: attackedEnvelope,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Run automated required tests
app.post('/api/tests/run', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { session_id } = req.body;
  if (!session_id) {
    return res.status(400).json({ success: false, error: 'SESSION_REQUIRED' });
  }
  try {
    const data = await TestService.runRequiredTests(req.user!.user_id, session_id);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Fetch reports history
app.get('/api/tests/reports', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = await query(
      'SELECT test_run_id, status, passed_count, failed_count, started_at, finished_at, report_markdown FROM test_runs WHERE triggered_by_user_id = ? ORDER BY started_at DESC',
      [req.user!.user_id]
    );
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// History endpoint
app.get('/api/history', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.user_id;
    const history = await query(
      `SELECT 
        a.attempt_id, a.attempt_no, a.is_success, a.result_status, a.score_delta, a.created_at,
        t.tx_id, t.original_amount, t.submitted_amount, t.attack_type,
        l.level_no, l.title as level_title,
        e.message_id
       FROM transaction_attempts a
       JOIN transactions t ON t.tx_id = a.tx_id
       JOIN levels l ON l.level_id = t.level_id
       JOIN transaction_envelopes e ON e.attempt_id = a.attempt_id
       WHERE a.user_id = ?
       ORDER BY a.created_at DESC`,
      [userId]
    );
    res.json({ success: true, data: history });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/history/attempts/:id/logs', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const attemptId = req.params.id;
    const logs = await query(
      'SELECT severity, event_type, message, created_at FROM transaction_logs WHERE attempt_id = ? ORDER BY created_at ASC',
      [attemptId]
    );
    res.json({ success: true, data: logs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update Profile Customizations
app.post('/api/profile/theme', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { theme } = req.body;
  const validThemes = ['NEON_GRID', 'MATRIX_GREEN', 'RED_ALERT', 'STEEL_HUD'];
  if (!theme || !validThemes.includes(theme)) {
    return res.status(400).json({ success: false, error: 'INVALID_THEME' });
  }
  try {
    await query('UPDATE player_profiles SET selected_theme = ? WHERE user_id = ?', [theme, req.user!.user_id]);
    res.json({ success: true, message: 'Theme updated successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Fetch Top Leaderboard of Operators
app.get('/api/game/leaderboard', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const leaderboard = await query(
      `SELECT 
        display_name, 
        total_score, 
        completed_level_count, 
        operator_rank, 
        last_played_at
       FROM player_profiles 
       ORDER BY total_score DESC, completed_level_count DESC, last_played_at ASC 
       LIMIT 100`
    );
    res.json({ success: true, data: leaderboard });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Serve static assets from fronted compiled build
const frontendPath = path.join(process.cwd(), 'src/backend/public');
app.use(express.static(frontendPath));

// Fallback index.html for React router
app.get('*', (req: Request, res: Response) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

export default app;
