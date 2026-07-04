import { query } from '../../config/db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'cyberbank_operator_access_neon_glow_secret_key_2026';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'cyberbank_operator_refresh_neon_glow_secret_key_2026';

export interface UserPayload {
  user_id: string;
  email: string;
  role: string;
  full_name: string;
}

export class AuthService {
  /**
   * Registers a new Operator (Player) account
   */
  static async register(email: string, password: string, fullName: string): Promise<any> {
    const emailNorm = email.trim().toLowerCase();
    
    // Check if email already exists
    const users = await query('SELECT * FROM users WHERE email = ?', [emailNorm]);
    if (users.length > 0) {
      throw new Error('EMAIL_ALREADY_EXISTS');
    }

    const userId = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert user
    await query(
      'INSERT INTO users (user_id, email, password_hash, full_name, role, status) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, emailNorm, passwordHash, fullName, 'PLAYER', 'ACTIVE']
    );

    // Insert profile
    const profileId = crypto.randomUUID();
    await query(
      'INSERT INTO player_profiles (profile_id, user_id, display_name, unlocked_themes) VALUES (?, ?, ?, ?)',
      [profileId, userId, fullName, JSON.stringify(['NEON_GRID'])]
    );

    // Seed a standard starting transaction game session
    const sessionId = crypto.randomUUID();
    await query(
      'INSERT INTO game_sessions (session_id, user_id, difficulty, status) VALUES (?, ?, ?, ?)',
      [sessionId, userId, 'NORMAL', 'ACTIVE']
    );

    const userPayload: UserPayload = { user_id: userId, email: emailNorm, role: 'PLAYER', full_name: fullName };
    const tokens = this.generateTokens(userPayload);

    // Save refresh token hash
    const tokenId = crypto.randomUUID();
    const tokenHash = crypto.createHash('sha256').update(tokens.refreshToken).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await query(
      'INSERT INTO refresh_tokens (refresh_token_id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)',
      [tokenId, userId, tokenHash, expiresAt]
    );

    // Audit Log
    await query(
      'INSERT INTO login_audit_logs (login_log_id, user_id, email_attempted, event_type, success) VALUES (?, ?, ?, ?, ?)',
      [crypto.randomUUID(), userId, emailNorm, 'REGISTER', true]
    );

    return {
      tokens,
      user: userPayload,
      session_id: sessionId,
    };
  }

  /**
   * Logins to an Operator (Player) account
   */
  static async login(email: string, password: string): Promise<any> {
    const emailNorm = email.trim().toLowerCase();

    const users = await query('SELECT * FROM users WHERE email = ?', [emailNorm]);
    if (users.length === 0) {
      await query(
        'INSERT INTO login_audit_logs (login_log_id, email_attempted, event_type, success) VALUES (?, ?, ?, ?)',
        [crypto.randomUUID(), emailNorm, 'LOGIN_FAILED', false]
      );
      throw new Error('INVALID_CREDENTIALS');
    }

    const user = users[0];

    if (user.status !== 'ACTIVE') {
      throw new Error('ACCOUNT_LOCKED');
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      await query(
        'INSERT INTO login_audit_logs (login_log_id, user_id, email_attempted, event_type, success) VALUES (?, ?, ?, ?, ?)',
        [crypto.randomUUID(), user.user_id, emailNorm, 'LOGIN_FAILED', false]
      );
      throw new Error('INVALID_CREDENTIALS');
    }

    // Update login audit times
    const now = new Date();
    await query('UPDATE users SET last_login_at = ? WHERE user_id = ?', [now, user.user_id]);
    await query('UPDATE player_profiles SET last_played_at = ? WHERE user_id = ?', [now, user.user_id]);

    const userPayload: UserPayload = {
      user_id: user.user_id,
      email: user.email,
      role: user.role,
      full_name: user.full_name,
    };
    const tokens = this.generateTokens(userPayload);

    // Fetch active session or create new
    const sessions = await query('SELECT * FROM game_sessions WHERE user_id = ? AND status = ?', [user.user_id, 'ACTIVE']);
    let sessionId = sessions.length > 0 ? sessions[0].session_id : null;

    if (!sessionId) {
      sessionId = crypto.randomUUID();
      await query(
        'INSERT INTO game_sessions (session_id, user_id, difficulty, status) VALUES (?, ?, ?, ?)',
        [sessionId, user.user_id, 'NORMAL', 'ACTIVE']
      );
    }

    // Save refresh token hash
    const tokenId = crypto.randomUUID();
    const tokenHash = crypto.createHash('sha256').update(tokens.refreshToken).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await query(
      'INSERT INTO refresh_tokens (refresh_token_id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)',
      [tokenId, user.user_id, tokenHash, expiresAt]
    );

    // Audit Log
    await query(
      'INSERT INTO login_audit_logs (login_log_id, user_id, email_attempted, event_type, success) VALUES (?, ?, ?, ?, ?)',
      [crypto.randomUUID(), user.user_id, emailNorm, 'LOGIN_SUCCESS', true]
    );

    return {
      tokens,
      user: userPayload,
      session_id: sessionId,
    };
  }

  /**
   * Generates Access and Refresh Tokens
   */
  private static generateTokens(user: UserPayload): { accessToken: string; refreshToken: string } {
    const accessToken = jwt.sign(user, ACCESS_SECRET, { expiresIn: '1d' }); // 1 day for easier usage in academic demo
    const refreshToken = jwt.sign({ user_id: user.user_id }, REFRESH_SECRET, { expiresIn: '7d' });
    return { accessToken, refreshToken };
  }
}
