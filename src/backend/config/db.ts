import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'cyberbank_security_game',
  timezone: process.env.DB_TIMEZONE || '+07:00',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

console.log(`[DATABASE] Connecting to Host: ${dbConfig.host}:${dbConfig.port}, Database: ${dbConfig.database}...`);

export const pool = mysql.createPool(dbConfig);

// Helper function to execute queries
export async function query<T = any>(sql: string, params?: any[]): Promise<T> {
  const [results] = await pool.execute(sql, params);
  return results as T;
}

// Auto-Database Initializer
export async function initializeDatabase() {
  console.log('[DATABASE] Starting Auto-Database Initializer...');
  let connection;
  try {
    connection = await pool.getConnection();

    // 1. Create tables one by one if they do not exist
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        user_id VARCHAR(36) PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(120) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'PLAYER',
        status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
        email_verified BOOLEAN NOT NULL DEFAULT FALSE,
        last_login_at DATETIME(3) NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS player_profiles (
        profile_id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL UNIQUE,
        display_name VARCHAR(80) NOT NULL,
        avatar_url VARCHAR(500) NULL,
        total_score INT NOT NULL DEFAULT 0,
        current_level_id VARCHAR(64) NULL,
        completed_level_count INT NOT NULL DEFAULT 0,
        operator_rank VARCHAR(40) NOT NULL DEFAULT 'NOVICE_OPERATOR',
        selected_theme VARCHAR(40) NOT NULL DEFAULT 'NEON_GRID',
        unlocked_themes JSON NULL,
        last_played_at DATETIME(3) NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        refresh_token_id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        token_hash VARCHAR(255) NOT NULL UNIQUE,
        device_name VARCHAR(120) NULL,
        ip_address VARCHAR(45) NULL,
        user_agent VARCHAR(500) NULL,
        expires_at DATETIME(3) NOT NULL,
        revoked_at DATETIME(3) NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS levels (
        level_id VARCHAR(64) PRIMARY KEY,
        level_no INT NOT NULL UNIQUE,
        title VARCHAR(160) NOT NULL,
        scenario_type VARCHAR(60) NOT NULL DEFAULT 'BANK_TRANSFER',
        attack_type VARCHAR(60) NOT NULL,
        difficulty VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
        max_score INT NOT NULL DEFAULT 100,
        unlock_score_required INT NOT NULL DEFAULT 0,
        mission_markdown TEXT NOT NULL,
        success_explanation_markdown TEXT NOT NULL,
        failure_explanation_markdown TEXT NOT NULL,
        is_required BOOLEAN NOT NULL DEFAULT TRUE,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS defense_options (
        defense_id VARCHAR(64) PRIMARY KEY,
        code VARCHAR(80) NOT NULL UNIQUE,
        name VARCHAR(120) NOT NULL,
        category VARCHAR(40) NOT NULL,
        description TEXT NOT NULL,
        config_schema JSON NULL,
        score_cost INT NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS level_defense_options (
        level_id VARCHAR(64) NOT NULL,
        defense_id VARCHAR(64) NOT NULL,
        is_correct BOOLEAN NOT NULL DEFAULT FALSE,
        is_required BOOLEAN NOT NULL DEFAULT FALSE,
        hint_text TEXT NULL,
        PRIMARY KEY (level_id, defense_id),
        FOREIGN KEY (level_id) REFERENCES levels(level_id) ON DELETE CASCADE,
        FOREIGN KEY (defense_id) REFERENCES defense_options(defense_id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS game_sessions (
        session_id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        difficulty VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
        status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
        current_level_id VARCHAR(64) NULL,
        total_score INT NOT NULL DEFAULT 0,
        started_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        ended_at DATETIME(3) NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
        FOREIGN KEY (current_level_id) REFERENCES levels(level_id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS accounts (
        account_id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NULL,
        account_no VARCHAR(32) NOT NULL UNIQUE,
        owner_name VARCHAR(120) NOT NULL,
        account_type VARCHAR(20) NOT NULL DEFAULT 'DEMO',
        balance BIGINT NOT NULL DEFAULT 0,
        currency CHAR(3) NOT NULL DEFAULT 'VND',
        status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        tx_id VARCHAR(36) PRIMARY KEY,
        session_id VARCHAR(36) NOT NULL,
        level_id VARCHAR(64) NOT NULL,
        from_account_id VARCHAR(36) NOT NULL,
        to_account_id VARCHAR(36) NOT NULL,
        original_amount BIGINT NOT NULL,
        submitted_amount BIGINT NOT NULL,
        currency CHAR(3) NOT NULL DEFAULT 'VND',
        memo VARCHAR(255) NULL,
        tx_status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
        attack_type VARCHAR(60) NOT NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        expires_at DATETIME(3) NOT NULL,
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        FOREIGN KEY (session_id) REFERENCES game_sessions(session_id) ON DELETE CASCADE,
        FOREIGN KEY (level_id) REFERENCES levels(level_id),
        FOREIGN KEY (from_account_id) REFERENCES accounts(account_id),
        FOREIGN KEY (to_account_id) REFERENCES accounts(account_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS crypto_keysets (
        key_id VARCHAR(64) PRIMARY KEY,
        owner_type VARCHAR(20) NOT NULL,
        owner_id TEXT NULL,
        purpose VARCHAR(20) NOT NULL,
        algorithm VARCHAR(40) NOT NULL,
        public_key_pem TEXT NULL,
        key_fingerprint VARCHAR(128) NOT NULL UNIQUE,
        status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
        not_before DATETIME(3) NULL,
        not_after DATETIME(3) NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Dynamic Column Migration and Truncated Keys purge
    await connection.query('ALTER TABLE crypto_keysets MODIFY owner_id TEXT NULL');
    const [checkTruncated] = await connection.query("SELECT * FROM crypto_keysets WHERE owner_type IN ('PLAYER', 'ATTACKER')");
    if ((checkTruncated as any[]).some(k => k.owner_id && k.owner_id.length < 100)) {
      console.log('[DATABASE] Detected truncated legacy RSA keys. Purging crypto_keysets table...');
      await connection.query('DELETE FROM crypto_keysets');
    }

    // Ensure key_rogue_symmetric_2026 is seeded in database initialization
    const [rogueCheck] = await connection.query("SELECT * FROM crypto_keysets WHERE key_id = 'key_rogue_symmetric_2026'");
    if ((rogueCheck as any[]).length === 0) {
      console.log('[DATABASE] Seeding rogue symmetric key keyset entry...');
      await connection.query(
        "INSERT INTO crypto_keysets (key_id, owner_type, purpose, algorithm, public_key_pem, key_fingerprint, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
        ['key_rogue_symmetric_2026', 'ATTACKER', 'ENCRYPTION', 'AES-256-GCM', null, 'rogue_symmetric_key_fingerprint_2026', 'REVOKED']
      );
    }

    await connection.query(`
      CREATE TABLE IF NOT EXISTS transaction_attempts (
        attempt_id VARCHAR(36) PRIMARY KEY,
        tx_id VARCHAR(36) NOT NULL,
        session_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        attempt_no INT NOT NULL,
        selected_defenses JSON NOT NULL,
        validator_result JSON NOT NULL,
        result_status VARCHAR(30) NOT NULL,
        expected_result_status VARCHAR(20) NOT NULL,
        is_success BOOLEAN NOT NULL,
        payload_hash VARCHAR(128) NULL,
        signature_status VARCHAR(20) NULL,
        encryption_status VARCHAR(30) NULL,
        replay_status VARCHAR(20) NULL,
        key_status VARCHAR(20) NULL,
        score_delta INT NOT NULL DEFAULT 0,
        explanation_markdown TEXT NOT NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        FOREIGN KEY (tx_id) REFERENCES transactions(tx_id) ON DELETE CASCADE,
        FOREIGN KEY (session_id) REFERENCES game_sessions(session_id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
        UNIQUE KEY idx_attempts_tx_no (tx_id, attempt_no)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS transaction_envelopes (
        envelope_id VARCHAR(36) PRIMARY KEY,
        attempt_id VARCHAR(36) NOT NULL UNIQUE,
        version VARCHAR(10) NOT NULL DEFAULT '2.0',
        message_id VARCHAR(80) NOT NULL,
        nonce_hash VARCHAR(128) NULL,
        sequence_no INT NULL,
        tx_timestamp DATETIME(3) NOT NULL,
        session_binding VARCHAR(128) NOT NULL,
        aad JSON NULL,
        public_payload JSON NULL,
        ciphertext_b64 LONGTEXT NULL,
        tag_b64 TEXT NULL,
        payload_hash VARCHAR(128) NULL,
        signature_b64 LONGTEXT NULL,
        signer_key_id VARCHAR(64) NULL,
        encryption_key_id VARCHAR(64) NULL,
        algorithm JSON NOT NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        FOREIGN KEY (attempt_id) REFERENCES transaction_attempts(attempt_id) ON DELETE CASCADE,
        FOREIGN KEY (signer_key_id) REFERENCES crypto_keysets(key_id) ON DELETE SET NULL,
        FOREIGN KEY (encryption_key_id) REFERENCES crypto_keysets(key_id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS replay_cache (
        cache_id VARCHAR(36) PRIMARY KEY,
        session_id VARCHAR(36) NOT NULL,
        message_id VARCHAR(80) NOT NULL,
        nonce_hash VARCHAR(128) NULL,
        sequence_no INT NULL,
        tx_id VARCHAR(36) NOT NULL,
        first_seen_attempt_id VARCHAR(36) NOT NULL,
        first_seen_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        expires_at DATETIME(3) NOT NULL,
        FOREIGN KEY (session_id) REFERENCES game_sessions(session_id) ON DELETE CASCADE,
        FOREIGN KEY (tx_id) REFERENCES transactions(tx_id) ON DELETE CASCADE,
        FOREIGN KEY (first_seen_attempt_id) REFERENCES transaction_attempts(attempt_id) ON DELETE CASCADE,
        UNIQUE KEY idx_replay_sess_msg (session_id, message_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS transaction_logs (
        log_id VARCHAR(36) PRIMARY KEY,
        session_id VARCHAR(36) NOT NULL,
        tx_id VARCHAR(36) NULL,
        attempt_id VARCHAR(36) NULL,
        event_type VARCHAR(60) NOT NULL,
        severity VARCHAR(20) NOT NULL,
        message VARCHAR(500) NOT NULL,
        safe_context JSON NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        FOREIGN KEY (session_id) REFERENCES game_sessions(session_id) ON DELETE CASCADE,
        FOREIGN KEY (tx_id) REFERENCES transactions(tx_id) ON DELETE SET NULL,
        FOREIGN KEY (attempt_id) REFERENCES transaction_attempts(attempt_id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS score_events (
        score_event_id VARCHAR(36) PRIMARY KEY,
        session_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        level_id VARCHAR(64) NULL,
        attempt_id VARCHAR(36) NULL,
        reason_code VARCHAR(80) NOT NULL,
        points INT NOT NULL,
        description VARCHAR(255) NOT NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        FOREIGN KEY (session_id) REFERENCES game_sessions(session_id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
        FOREIGN KEY (level_id) REFERENCES levels(level_id) ON DELETE SET NULL,
        FOREIGN KEY (attempt_id) REFERENCES transaction_attempts(attempt_id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS login_audit_logs (
        login_log_id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NULL,
        email_attempted VARCHAR(255) NOT NULL,
        event_type VARCHAR(40) NOT NULL,
        success BOOLEAN NOT NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS achievements (
        achievement_id VARCHAR(64) PRIMARY KEY,
        code VARCHAR(80) NOT NULL UNIQUE,
        name VARCHAR(120) NOT NULL,
        description TEXT NOT NULL,
        points_bonus INT NOT NULL DEFAULT 0,
        badge_icon_url VARCHAR(500) NULL,
        badge_glow_color CHAR(7) NOT NULL DEFAULT '#00f0ff',
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS player_achievements (
        user_id VARCHAR(36) NOT NULL,
        achievement_id VARCHAR(64) NOT NULL,
        session_id VARCHAR(36) NOT NULL,
        earned_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (user_id, achievement_id, session_id),
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
        FOREIGN KEY (achievement_id) REFERENCES achievements(achievement_id) ON DELETE CASCADE,
        FOREIGN KEY (session_id) REFERENCES game_sessions(session_id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS test_cases (
        test_case_id VARCHAR(64) PRIMARY KEY,
        code VARCHAR(80) NOT NULL UNIQUE,
        name VARCHAR(160) NOT NULL,
        category VARCHAR(60) NOT NULL,
        description TEXT NOT NULL,
        expected_result VARCHAR(120) NOT NULL,
        is_required BOOLEAN NOT NULL DEFAULT TRUE,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS test_runs (
        test_run_id VARCHAR(36) PRIMARY KEY,
        session_id VARCHAR(36) NULL,
        triggered_by_user_id VARCHAR(36) NULL,
        status VARCHAR(20) NOT NULL,
        total_count INT NOT NULL DEFAULT 0,
        passed_count INT NOT NULL DEFAULT 0,
        failed_count INT NOT NULL DEFAULT 0,
        started_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        finished_at DATETIME(3) NULL,
        report_markdown LONGTEXT NULL,
        FOREIGN KEY (session_id) REFERENCES game_sessions(session_id) ON DELETE SET NULL,
        FOREIGN KEY (triggered_by_user_id) REFERENCES users(user_id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS test_results (
        test_result_id VARCHAR(36) PRIMARY KEY,
        test_run_id VARCHAR(36) NOT NULL,
        test_case_id VARCHAR(64) NOT NULL,
        status VARCHAR(20) NOT NULL,
        actual_result TEXT NOT NULL,
        evidence_log_id VARCHAR(36) NULL,
        duration_ms INT NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        FOREIGN KEY (test_run_id) REFERENCES test_runs(test_run_id) ON DELETE CASCADE,
        FOREIGN KEY (test_case_id) REFERENCES test_cases(test_case_id),
        UNIQUE KEY idx_results_run_case (test_run_id, test_case_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('[DATABASE] All tables verified/created successfully.');

    // 2. Seed Default Levels (Ensure full 15 levels exist and update descriptions)
    const [levelCountResults] = await connection.query('SELECT COUNT(*) as count FROM levels');
    const levelCount = (levelCountResults as any)[0].count;
    if (levelCount < 15 || true) { // Always re-seed to update detailed level descriptions
      console.log('[DATABASE] Seeding/Updating 15 highly detailed standard campaign levels...');
      
      await connection.query('SET FOREIGN_KEY_CHECKS = 0');
      await connection.query('DELETE FROM level_defense_options');
      await connection.query('DELETE FROM levels');
      await connection.query('SET FOREIGN_KEY_CHECKS = 1');

      await connection.query(`
        INSERT INTO levels (level_id, level_no, title, scenario_type, attack_type, difficulty, max_score, unlock_score_required, mission_markdown, success_explanation_markdown, failure_explanation_markdown, is_required, is_active)
        VALUES
        ('level_valid_transaction', 1, 'Giao dịch hợp lệ', 'BANK_TRANSFER', 'NONE', 'EASY', 100, 0,
        '🚨 TÌNH HUỐNG AN NINH: Giao dịch chuyển khoản thông thường từ Alice sang Bob được thực hiện trong môi trường mạng an toàn, không phát hiện sự can thiệp hay tấn công từ Attacker.\\n\\n🎯 NHIỆM VỤ OPERATOR: Thiết lập cấu hình bảo mật tiêu chuẩn cho hệ thống Core Banking để đảm bảo giao dịch được xác thực danh tính người gửi và ghi lại nhật ký sự kiện kiểm toán đầy đủ.\\n\\n💡 MẸO PHÒNG THỦ: Hãy trang bị thẻ "Chữ ký số" và "Audit Log". Bạn cũng có thể chọn thêm "AES-GCM" để tăng tính bảo mật nhưng tối thiểu cần có 2 thẻ trên.',
        'Giao dịch hợp lệ được ngân hàng chấp nhận vì payload toàn vẹn, chữ ký số khớp khóa công khai và nhật ký kiểm toán ghi nhận đầy đủ quá trình xác minh thành công.',
        'Lỗi cấu hình! Hệ thống thiếu kiểm tra chữ ký hoặc bỏ quên việc ghi nhật ký an ninh, khiến giao dịch không đủ cơ sở pháp lý để phê duyệt.',
        TRUE, TRUE),
        
        ('level_amount_tampering', 2, 'Số tiền bị sửa', 'BANK_TRANSFER', 'AMOUNT_TAMPERING', 'NORMAL', 100, 60,
        '🚨 TÌNH HUỐNG AN NINH: Kẻ tấn công thực hiện kỹ thuật Man-in-the-Middle (MITM), chặn gói tin giao dịch của Alice và sửa đổi số tiền từ 1.000.000 VND lên 100.000.000 VND hòng rút ruột tài khoản. Attacker không có khóa riêng tư của Alice.\\n\\n🎯 NHIỆM VỤ OPERATOR: Kích hoạt cơ chế xác thực toàn vẹn dữ liệu để máy chủ ngân hàng tự động phát hiện bất kỳ sự thay đổi trái phép nào đối với payload giao dịch.\\n\\n💡 MẸO PHÒNG THỦ: Hãy trang bị thẻ "Chữ ký số" làm lá chắn cốt lõi. Chữ ký số RSA-PSS được ký bởi khóa riêng tư của Alice giúp ngân hàng đối chiếu hàm băm dữ liệu nhận được và phát hiện sửa đổi.',
        'Lớp bảo mật hoạt động hoàn hảo! Chữ ký số RSA-PSS được ký bởi khóa riêng tư của Alice giúp phát hiện ngay lập tức sự sai lệch giữa hàm băm payload thực tế nhận được và hàm băm được bao phủ trong chữ ký.',
        'Thảm họa an ninh! Do thiếu xác thực chữ ký số hoặc HMAC bảo vệ toàn vẹn, hệ thống đã phê duyệt giao dịch bị sửa đổi số tiền, dẫn đến thất thoát 99.000.000 VND từ tài khoản Alice.',
        TRUE, TRUE),
        
        ('level_replay_transaction', 3, 'Replay giao dịch cũ', 'BANK_TRANSFER', 'REPLAY', 'NORMAL', 100, 120,
        '🚨 TÌNH HUỐNG AN NINH: Attacker sử dụng công cụ nghe lén để chụp lại gói tin giao dịch hợp lệ cũ của Alice và thực hiện phát lại (Replay Attack) nguyên vẹn lên máy chủ ngân hàng nhiều lần để rút trộm tiền mà không cần sửa đổi bất kỳ byte nào.\\n\\n🎯 NHIỆM VỤ OPERATOR: Ngăn chặn tấn công phát lại bằng cách kiểm tra tính tươi mới (Freshness) và tính duy nhất của mã định danh giao dịch.\\n\\n💡 MẸO PHÒNG THỦ: Hãy kết hợp cả 3 lá chắn: "Nonce" (số dùng một lần), "Timestamp/TTL" (giới hạn thời gian sống) và "Replay Cache" (lưu trữ message_id). Thiếu 1 trong 3 thẻ này, hệ thống sẽ bị tấn công phát lại.',
        'Chặn đứng replay! Sự kết hợp giữa Nonce, Timestamp/TTL và Replay Cache giúp hệ thống nhận diện gói tin phát lại và từ chối xử lý tức thì.',
        'Hệ thống bị xâm nhập! Dù chữ ký số vẫn hợp lệ, việc thiếu các biện pháp chống phát lại khiến ngân hàng xử lý giao dịch cũ lặp đi lặp lại, rút sạch tiền trong tài khoản Alice.',
        TRUE, TRUE),
        
        ('level_invalid_signature', 4, 'Giả mạo chữ ký hoặc khóa sai', 'BANK_TRANSFER', 'INVALID_SIGNATURE', 'NORMAL', 100, 180,
        '🚨 TÌNH HUỐNG AN NINH: Attacker cố tình mạo danh Alice bằng cách tự tạo một cặp khóa RSA giả mạo và dùng khóa riêng giả này để ký số lên gói tin giao dịch, hy vọng lọt qua khâu kiểm tra chữ ký của máy chủ.\\n\\n🎯 NHIỆM VỤ OPERATOR: Thiết lập cơ chế đối chiếu danh tính người gửi thông qua việc xác thực dấu vân tay (Fingerprint) của khóa công khai dùng để ký.\\n\\n💡 MẸO PHÒNG THỦ: Hãy trang bị "Chữ ký số" để xác thực tính hợp lệ của chữ ký và "Key Fingerprint" để đối chiếu dấu vân tay định danh của khóa công khai trong Registry, loại bỏ khóa giả mạo.',
        'Ngăn chặn danh tính giả! Hệ thống đối chiếu dấu vân tay khóa (Key Fingerprint) trong Registry và phát hiện khóa công khai của chữ ký gửi lên không thuộc về Alice, lập tức từ chối và báo động đỏ.',
        'Hệ thống bị chọc thủng! Việc chỉ xác minh tính đúng đắn toán học của chữ ký mà không đối chiếu dấu vân tay khóa trong cơ sở dữ liệu đã khiến hệ thống chấp nhận một giao dịch mạo danh từ Attacker.',
        TRUE, TRUE),
        
        ('level_wrong_key', 5, 'Dùng sai khóa', 'BANK_TRANSFER', 'WRONG_KEY', 'HARD', 100, 240,
        '🚨 TÌNH HUỐNG AN NINH: Trục trặc hoặc tấn công chèn khóa! Một giao dịch được gửi lên với một key_id mã hóa đối xứng hoàn toàn sai lệch hoặc đã hết hạn, khiến quá trình giải mã AEAD bị lỗi logic.\\n\\n🎯 NHIỆM VỤ OPERATOR: Đối chiếu dấu vân tay khóa mã hóa và thực thi giải mã có xác thực để phát hiện lỗi khóa lập tức.\\n\\n💡 MẸO PHÒNG THỦ: Hãy kích hoạt "AES-GCM" để thực hiện giải mã kèm xác thực toàn vẹn và "Key Fingerprint" để đối chiếu định danh khóa mã hóa đối xứng trong cơ sở dữ liệu.',
        'Phòng thủ chính xác! Sự phối hợp giữa Key Fingerprint (để kiểm tra sự tồn tại của khóa) và AES-GCM (để kiểm tra thẻ xác thực tag khi giải mã) đã bác bỏ gói tin bị lỗi khóa.',
        'Hệ thống bị crash hoặc rò rỉ dữ liệu! Do thiếu kiểm tra vân tay khóa đối xứng hoặc bỏ qua lỗi giải mã của tag AEAD, hệ thống tiếp tục xử lý các byte rác bị giải mã sai.',
        FALSE, TRUE),
 
        ('level_recipient_tampering', 6, 'Can thiệp Tài khoản nhận', 'BANK_TRANSFER', 'AMOUNT_TAMPERING', 'EASY', 100, 300,
        '🚨 TÌNH HUỐNG AN NINH: Hacker can thiệp thay đổi trường số tài khoản thụ hưởng (to_account) trong payload giao dịch từ Bob sang số tài khoản của kẻ tấn công, hòng cướp đoạt số tiền Alice chuyển đi.\\n\\n🎯 NHIỆM VỤ OPERATOR: Đảm bảo tính toàn vẹn tuyệt đối của tài khoản nhận bằng cách ký số toàn bộ payload giao dịch.\\n\\n💡 MẸO PHÒNG THỦ: Trang bị thẻ "Chữ ký số" làm lá chắn bắt buộc. Vì chữ ký số RSA-PSS bao phủ toàn bộ cấu trúc payload giao dịch bao gồm cả tài khoản đích, nên bất kỳ sự thay đổi tài khoản nhận nào cũng sẽ làm chữ ký không hợp lệ.',
        'Tuyệt vời! Chữ ký số RSA-PSS bao phủ toàn bộ payload bao gồm cả tài khoản thụ hưởng đã phát hiện sự thay đổi và từ chối giao dịch giả mạo này.',
        'Tiền đã chuyển nhầm! Hệ thống chấp nhận giao dịch vì thiếu chữ ký số xác thực toàn vẹn tài khoản nhận, khiến tiền của Alice bay thẳng vào ví kẻ tấn công.',
        TRUE, TRUE),
 
        ('level_eavesdropping', 7, 'Nghe trộm đường truyền', 'BANK_TRANSFER', 'NONE', 'NORMAL', 100, 350,
        '🚨 TÌNH HUỐNG AN NINH: Hacker cài đặt thiết bị bắt gói tin (sniffer) trên đường truyền dữ liệu không mã hóa, liên tục thu thập thông tin tài khoản, số dư và nội dung giao dịch nhạy cảm của khách hàng mà không chỉnh sửa gói tin.\\n\\n🎯 NHIỆM VỤ OPERATOR: Bảo mật thông tin nhạy cảm của khách hàng, đảm bảo nội dung giao dịch không thể đọc được trên đường truyền mạng công cộng.\\n\\n💡 MẸO PHÒNG THỦ: Kích hoạt thẻ "AES-GCM" (Mã hóa có xác thực) để mã hóa toàn bộ dữ liệu payload thành dạng bản mã (ciphertext) không thể đọc được bởi kẻ nghe lén.',
        'Bảo mật tuyệt đối! Mã hóa AES-256-GCM đã chuyển toàn bộ thông tin giao dịch thành bản mã (ciphertext) không thể giải mã nếu không có khóa bí mật. Kẻ nghe trộm chỉ thu được dữ liệu rác.',
        'Lộ lọt dữ liệu nghiêm trọng! Giao dịch được truyền đi dưới dạng văn bản rõ (plaintext), giúp kẻ nghe lén chụp lại toàn bộ thông tin cá nhân và số dư tài khoản của Alice và Bob.',
        TRUE, TRUE),
 
        ('level_replay_alteration', 8, 'Replay có sửa đổi', 'BANK_TRANSFER', 'REPLAY', 'HARD', 100, 400,
        '🚨 TÌNH HUỐNG AN NINH: Cuộc tấn công kết hợp tinh vi! Attacker chặn một gói tin giao dịch cũ hợp lệ, chỉnh sửa số tiền giao dịch lớn hơn, sau đó thực hiện phát lại (Replay) gói tin đã chỉnh sửa này lên ngân hàng.\\n\\n🎯 NHIỆM VỤ OPERATOR: Ngăn chặn đồng thời cả hành vi sửa đổi dữ liệu (Tampering) và hành vi phát lại thông điệp cũ (Replay).\\n\\n💡 MẸO PHÒNG THỦ: Hãy trang bị thẻ "Chữ ký số" để phát hiện dữ liệu tiền bị sửa đổi và "Replay Cache" để chặn đứng hành vi phát lại gói tin cũ.',
        'Phòng thủ đa lớp hoàn hảo! Chữ ký số phát hiện sự thay đổi số tiền giao dịch, đồng thời Replay Cache nhận diện mã định danh thông điệp cũ đã được xử lý và chặn đứng hành vi phát lại.',
        'Thất bại toàn tập! Hệ thống bị vượt qua vì thiếu cả chữ ký kiểm tra toàn vẹn lẫn bộ nhớ đệm chống phát lại, để kẻ tấn công vừa rút được tiền vừa nhân bản giao dịch trái phép.',
        TRUE, TRUE),
 
        ('level_revoked_key', 9, 'Sử dụng khóa bị thu hồi', 'BANK_TRANSFER', 'INVALID_SIGNATURE', 'HARD', 100, 450,
        '🚨 TÌNH HUỐNG AN NINH: Attacker chiếm đoạt được một khóa riêng tư cũ đã bị thu hồi của Alice (trạng thái trong Registry là "REVOKED") và cố tình sử dụng khóa này để ký số giao dịch hợp lệ giả mạo.\\n\\n🎯 NHIỆM VỤ OPERATOR: Xác thực vòng đời và trạng thái hiệu lực hiện tại của khóa dùng để ký giao dịch.\\n\\n💡 MẸO PHÒNG THỦ: Chọn "Chữ ký số" để xác thực chữ ký và "Key Fingerprint" để đối chiếu dấu vân tay khóa với Registry, phát hiện trạng thái khóa đã bị thu hồi.',
        'Xác thực khóa tối ưu! Bộ kiểm tra dấu vân tay khóa (Key Fingerprint) đối chiếu với danh sách thu hồi khóa công khai trong Registry, lập tức từ chối giao dịch được ký bởi khóa đã bị hủy bỏ hiệu lực.',
        'Lỗi vận hành nghiêm trọng! Hệ thống vẫn chấp nhận chữ ký số hợp lệ về mặt toán học mà không kiểm tra trạng thái hoạt động thực tế của khóa trong cơ sở dữ liệu.',
        TRUE, TRUE),
 
        ('level_metadata_tampering', 10, 'Sửa đổi Metadata', 'BANK_TRANSFER', 'AMOUNT_TAMPERING', 'NORMAL', 100, 500,
        '🚨 TÌNH HUỐNG AN NINH: Hacker can thiệp thay đổi các trường siêu dữ liệu (metadata) của gói tin giao dịch như session_id, message_id, sequence_no hòng làm sai lệch logic kiểm tra trùng lặp hoặc gây treo hệ thống.\\n\\n🎯 NHIỆM VỤ OPERATOR: Đảm bảo tính toàn vẹn của phần tiêu đề và siêu dữ liệu thông điệp một cách nhanh chóng và hiệu quả.\\n\\n💡 MẸO PHÒNG THỦ: Trang bị thẻ "HMAC-SHA256" (Mã xác thực thông điệp bằng hàm băm khóa bí mật) làm lớp phòng thủ bắt buộc để phát hiện bất kỳ sự thay đổi nào trên các trường dữ liệu tiêu đề.',
        'Xác thực toàn vẹn nhanh chóng! Mã xác thực thông điệp khóa bí mật HMAC-SHA256 bảo vệ toàn vẹn thông tin đã phát hiện sự sai lệch của các trường metadata và từ chối xử lý gói tin giả mạo.',
        'Bỏ sót lỗ hổng! Việc không kiểm tra HMAC hoặc chữ ký số bao phủ các trường metadata đã tạo cơ hội cho hacker làm xáo trộn các mã định danh giao dịch trong hệ thống.',
        TRUE, TRUE),
 
        ('level_delay_attack', 11, 'Tấn công trễ gói tin', 'BANK_TRANSFER', 'EXPIRED_TRANSACTION', 'NORMAL', 100, 550,
        '🚨 TÌNH HUỐNG AN NINH: Hacker chặn giữ một gói tin giao dịch hợp lệ của Alice trong thời gian dài (vài giờ hoặc vài ngày) rồi mới truyền tiếp lên ngân hàng sau khi thị trường có biến động lớn có lợi cho hacker.\\n\\n🎯 NHIỆM VỤ OPERATOR: Kiểm tra tính tươi mới (Freshness) về mặt thời gian để từ chối các giao dịch bị trì hoãn quá lâu.\\n\\n💡 MẸO PHÒNG THỦ: Kích hoạt thẻ "Timestamp/TTL" để kiểm tra mốc thời gian tạo giao dịch. Nếu sai lệch so với thời gian hiện tại tại máy chủ ngân hàng vượt quá 5 phút, giao dịch sẽ bị từ chối lập tức.',
        'Thời gian tươi hoạt động tốt! Thẻ Timestamp/TTL đối chiếu thời gian ký gói tin với thời gian hiện tại của hệ thống ngân hàng, phát hiện độ lệch vượt quá phạm vi an toàn (5 phút) và hủy giao dịch hết hạn.',
        'Rủi ro tỷ giá nghiêm trọng! Giao dịch hết hạn từ lâu vẫn được chấp nhận và xử lý thành công, gây tổn thất tài chính lớn cho ngân hàng do chênh lệch tỷ giá thời điểm cũ và hiện tại.',
        TRUE, TRUE),
 
        ('level_bank_spoofing', 12, 'Giả lập máy chủ ngân hàng', 'BANK_TRANSFER', 'INVALID_SIGNATURE', 'HARD', 100, 600,
        '🚨 TÌNH HUỐNG AN NINH: Hacker thiết lập một máy chủ cổng thanh toán giả mạo (Fake Bank Spoofing) và cố gắng ký số phản hồi giao dịch bằng một khóa ngân hàng giả lập, hòng lừa Alice gửi tiền vào hệ thống giả.\\n\\n🎯 NHIỆM VỤ OPERATOR: Thiết lập xác minh danh tính hai chiều, đối chiếu dấu vân tay khóa của máy chủ phản hồi để đảm bảo đó là máy chủ chính thống.\\n\\n💡 MẸO PHÒNG THỦ: Trang bị cặp đôi "Chữ ký số" để xác minh chữ ký phản hồi của ngân hàng và "Key Fingerprint" để đối chiếu dấu vân tay khóa công khai của ngân hàng trong Registry, đảm bảo Alice đang giao tiếp với máy chủ chính thống.',
        'Phát hiện máy chủ giả mạo! Lớp kiểm tra Key Fingerprint đối chiếu dấu vân tay khóa phản hồi của máy chủ với Registry ngân hàng chính thức, vạch trần kẻ giả mạo lập tức.',
        'Alice đã bị lừa! Việc thiếu cơ chế đối chiếu dấu vân tay khóa công khai của ngân hàng khiến Client chấp nhận kết nối từ máy chủ giả lập, dẫn đến mất mát thông tin xác thực nhạy cảm.',
        TRUE, TRUE),
 
        ('level_cryptanalysis', 13, 'Giải mã AES yếu', 'BANK_TRANSFER', 'WRONG_KEY', 'HARD', 100, 650,
        '🚨 TÌNH HUỐNG AN NINH: Hacker sử dụng các kỹ thuật phân tích mã để khai thác các lỗ hổng mã hóa. Ở đây, một khóa đối xứng yếu, trùng lặp hoặc không đồng bộ fingerprint đang được sử dụng để mã hóa gói tin.\\n\\n🎯 NHIỆM VỤ OPERATOR: Yêu cầu kiểm tra dấu vân tay khóa đối xứng chặt chẽ kết hợp giải mã AEAD để phát hiện các khóa mã hóa yếu hoặc không hợp lệ.\\n\\n💡 MẸO PHÒNG THỦ: Kích hoạt thẻ "AES-GCM" để xác thực tính bảo mật toàn vẹn của bản mã qua GCM tag và "Key Fingerprint" để đối chiếu dấu vân tay khóa đối xứng với Registry của hệ thống.',
        'Phát hiện khóa yếu! Trình xác thực đối chiếu và bác bỏ khóa AES không trùng khớp fingerprint và AEAD tag bị lỗi giải mã do khóa không tương thích.',
        'Lộ thông tin nhạy cảm! Hệ thống bỏ qua khâu kiểm tra vân tay khóa, chấp nhận khóa AES yếu hoặc không chuẩn làm tăng nguy cơ bị hacker bẻ gãy mã hóa và đọc trộm thông tin.',
        TRUE, TRUE),
 
        ('level_nonce_collision', 14, 'Tấn công vét cạn Nonce', 'BANK_TRANSFER', 'REPLAY', 'HARD', 100, 700,
        '🚨 TÌNH HUỐNG AN NINH: Hacker liên tiếp gửi hàng loạt gói tin giao dịch có các giá trị Nonce trùng lặp nhằm vét cạn tài nguyên hệ thống hoặc tìm cách ghi nhận giao dịch trùng lặp.\\n\\n🎯 NHIỆM VỤ OPERATOR: Đảm bảo mỗi Nonce chỉ được phép sử dụng duy nhất một lần và lưu trữ chặt chẽ trạng thái của chúng trong bộ nhớ đệm chống phát lại.\\n\\n💡 MẸO PHÒNG THỦ: Kết hợp "Nonce" (số dùng một lần) và "Replay Cache" (bộ đệm ghi nhớ các Nonce đã xử lý) để chặn đứng mọi nỗ lực tái sử dụng giá trị Nonce.',
        'Chặn đứng vet cạn! Nonce hoạt động như một số dùng một lần duy nhất, kết hợp với Replay Cache ghi nhớ các giá trị đã xử lý giúp phát hiện và từ chối các Nonce trùng lặp ngay lập tức.',
        'Sập tài nguyên hệ thống! Thiếu kiểm tra trùng lặp Nonce khiến hệ thống phải xử lý các thông điệp giống nhau liên tục, gây cạn kiệt số dư tài khoản của Alice do giao dịch bị lặp.',
        TRUE, TRUE),
 
        ('level_full_out_attack', 15, 'Tấn công mạng tổng lực', 'BANK_TRANSFER', 'AMOUNT_TAMPERING', 'NIGHTMARE', 150, 800,
        '🚨 TÌNH HUỐNG AN NINH: Trận chiến an ninh tối thượng! Attacker Bot kết hợp toàn bộ các phương thức tấn công đồng thời: Nghe lén thông tin nhạy cảm, sửa đổi số tiền giao dịch, ký số bằng khóa bị thu hồi, và liên tiếp phát lại các gói tin cũ.\\n\\n🎯 NHIỆM VỤ OPERATOR: Kích hoạt cấu hình phòng thủ toàn diện và bất biến của hệ thống bảo mật ngân hàng để chặn đứng cuộc tấn công đa diện nguy hiểm này.\\n\\n💡 MẸO PHÒNG THỦ: Do giới hạn tối đa chỉ được trang bị 4 thẻ phòng thủ, Operator phải chọn chính xác 4 lá chắn thép tối quan trọng: "AES-GCM" để bảo mật thông tin, "Chữ ký số" để xác thực danh tính & chống sửa đổi, "Replay Cache" để chống phát lại, và "Audit Log" để ghi nhật ký truy vết.\\n\\n⚠️ LƯU Ý: Đây là BOSS FIGHT, bất kỳ sai sót nào trong việc trang bị thẻ đều sẽ làm chệch hướng lớp phòng ngự và dẫn đến hệ thống bị phá vỡ hoàn toàn.',
        'Operator huyền thoại! Bạn đã thiết lập lớp bảo mật hoàn hảo gồm AES-GCM (bảo mật), Chữ ký số (toàn vẹn/xác thực), Replay Cache (chống phát lại) và Audit Log (truy vết pháp y bất biến), đập tan cuộc tấn công tổng lực!',
        'Thất bại thảm hại! Hệ thống phòng thủ bị sụp đổ hoàn toàn dưới cuộc tấn công đa diện cực kỳ nguy hiểm do thiếu các lá chắn cốt lõi hoặc cấu hình thẻ bảo mật bị dư thừa gây nghẽn tài nguyên.',
        TRUE, TRUE);
      `);
    }

    // 3. Seed Defense Options if empty
    const [defenseCountResults] = await connection.query('SELECT COUNT(*) as count FROM defense_options');
    const defenseCount = (defenseCountResults as any)[0].count;
    if (defenseCount === 0) {
      console.log('[DATABASE] Seeding defense options...');
      await connection.query(`
        INSERT INTO defense_options (defense_id, code, name, category, description, score_cost)
        VALUES
        ('def_aes_gcm', 'AES_GCM', 'AES-GCM', 'CONFIDENTIALITY', 'Mã hóa có xác thực, phát hiện sửa ciphertext/AAD/tag.', 0),
        ('def_hmac', 'HMAC_SHA256', 'HMAC-SHA256', 'INTEGRITY', 'Kiểm tra toàn vẹn thông điệp bằng khóa bí mật.', 0),
        ('def_signature', 'DIGITAL_SIGNATURE', 'Chữ ký số', 'AUTHENTICATION', 'Xác thực người gửi và phát hiện sửa payload.', 0),
        ('def_nonce', 'NONCE', 'Nonce', 'ANTI_REPLAY', 'Giá trị dùng một lần để phân biệt message.', 0),
        ('def_timestamp', 'TIMESTAMP_TTL', 'Timestamp/TTL', 'ANTI_REPLAY', 'Từ chối dữ liệu quá hạn hoặc lệch thời gian.', 0),
        ('def_replay_cache', 'REPLAY_CACHE', 'Replay Cache', 'ANTI_REPLAY', 'Lưu message_id/nonce đã xử lý để chặn gửi lại.', 0),
        ('def_key_fingerprint', 'KEY_FINGERPRINT', 'Key Fingerprint', 'KEY_MANAGEMENT', 'Đối chiếu dấu vân tay khóa để tránh dùng nhầm khóa.', 0),
        ('def_audit_log', 'AUDIT_LOG', 'Audit Log', 'LOGGING', 'Ghi log an toàn để truy vết kết quả xác minh.', 0);
      `);
    }

    // Always seed level_defense_options if levels were just re-seeded or defense mapping is missing
    const [mappingCountRes] = await connection.query('SELECT COUNT(*) as count FROM level_defense_options');
    const mappingCount = (mappingCountRes as any)[0].count;
    if (mappingCount === 0) {
      console.log('[DATABASE] Seeding levels defenses mappings...');
      await connection.query(`
        INSERT INTO level_defense_options (level_id, defense_id, is_correct, is_required, hint_text) VALUES
        ('level_valid_transaction', 'def_signature', TRUE, TRUE, 'Cần chữ ký để xác thực người gửi.'),
        ('level_valid_transaction', 'def_audit_log', TRUE, TRUE, 'Log giúp chứng minh giao dịch đã được xử lý.'),
        ('level_valid_transaction', 'def_aes_gcm', TRUE, FALSE, 'Giao dịch hợp lệ nên có mã hóa có xác thực.'),

        ('level_amount_tampering', 'def_signature', TRUE, TRUE, 'Chữ ký phải bao phủ amount để xác nhận toàn vẹn.'),
        ('level_amount_tampering', 'def_hmac', TRUE, FALSE, 'HMAC cũng có thể phát hiện sửa dữ liệu nếu dùng đúng.'),
        ('level_amount_tampering', 'def_aes_gcm', TRUE, FALSE, 'AEAD tag phát hiện sửa ciphertext hoặc AAD.'),
        ('level_amount_tampering', 'def_audit_log', TRUE, FALSE, 'Log lý do từ chối giao dịch.'),

        ('level_replay_transaction', 'def_nonce', TRUE, TRUE, 'Nonce giúp phân biệt mỗi message.'),
        ('level_replay_transaction', 'def_timestamp', TRUE, TRUE, 'Timestamp/TTL chặn message quá hạn.'),
        ('level_replay_transaction', 'def_replay_cache', TRUE, TRUE, 'Replay cache phát hiện message đã xử lý.'),
        ('level_replay_transaction', 'def_signature', TRUE, FALSE, 'Chữ ký vẫn cần, nhưng không đủ để chống replay.'),

        ('level_invalid_signature', 'def_signature', TRUE, TRUE, 'Cần verify chữ ký bằng public key đúng.'),
        ('level_invalid_signature', 'def_key_fingerprint', TRUE, TRUE, 'Fingerprint giúp phát hiện nhầm khóa.'),
        ('level_invalid_signature', 'def_audit_log', TRUE, FALSE, 'Log lỗi chữ ký để điều tra.'),

        ('level_wrong_key', 'def_key_fingerprint', TRUE, TRUE, 'Cần kiểm tra key_id/fingerprint để đối chiếu.'),
        ('level_wrong_key', 'def_aes_gcm', TRUE, TRUE, 'Sai khóa làm AEAD tag invalid khi giải mã.'),
        ('level_wrong_key', 'def_audit_log', TRUE, FALSE, 'Log lỗi sai khóa/tag invalid.'),

        ('level_recipient_tampering', 'def_signature', TRUE, TRUE, 'Chữ ký bao phủ payload để bảo vệ tài khoản nhận.'),
        ('level_recipient_tampering', 'def_audit_log', TRUE, FALSE, 'Ghi log sự cố.'),

        ('level_eavesdropping', 'def_aes_gcm', TRUE, TRUE, 'Mã hóa AES-GCM bảo mật gói tin nhạy cảm.'),
        ('level_eavesdropping', 'def_audit_log', TRUE, FALSE, 'Ghi log.'),

        ('level_replay_alteration', 'def_signature', TRUE, TRUE, 'Chữ ký số chống can thiệp sửa đổi số tiền.'),
        ('level_replay_alteration', 'def_replay_cache', TRUE, TRUE, 'Replay Cache phát hiện gói tin phát lại.'),
        ('level_replay_alteration', 'def_nonce', TRUE, FALSE, 'Nonce giúp chống phát lại.'),

        ('level_revoked_key', 'def_key_fingerprint', TRUE, TRUE, 'Key Fingerprint đối chiếu trạng thái hoạt động của khóa.'),
        ('level_revoked_key', 'def_signature', TRUE, TRUE, 'Chữ ký số để xác nhận tính hợp lệ.'),

        ('level_metadata_tampering', 'def_hmac', TRUE, TRUE, 'HMAC-SHA256 bảo vệ toàn vẹn thông tin nhanh.'),
        ('level_metadata_tampering', 'def_audit_log', TRUE, FALSE, 'Ghi log.'),

        ('level_delay_attack', 'def_timestamp', TRUE, TRUE, 'Timestamp/TTL chặn gói tin quá thời hạn.'),
        ('level_delay_attack', 'def_audit_log', TRUE, FALSE, 'Ghi log.'),

        ('level_bank_spoofing', 'def_signature', TRUE, TRUE, 'Chữ ký số xác nhận nguồn ngân hàng.'),
        ('level_bank_spoofing', 'def_key_fingerprint', TRUE, TRUE, 'Fingerprint xác nhận thực thể máy chủ chính xác.'),

        ('level_cryptanalysis', 'def_aes_gcm', TRUE, TRUE, 'Mã hóa AES-GCM bảo vệ và xác thực toàn vẹn.'),
        ('level_cryptanalysis', 'def_key_fingerprint', TRUE, TRUE, 'Kiểm tra vân tay khóa đối chiếu.'),

        ('level_nonce_collision', 'def_nonce', TRUE, TRUE, 'Nonce giúp phân biệt các thông điệp.'),
        ('level_nonce_collision', 'def_replay_cache', TRUE, TRUE, 'Replay Cache chặn trùng lặp.'),

        ('level_full_out_attack', 'def_aes_gcm', TRUE, TRUE, 'Lá chắn mã hóa AES-GCM bảo mật thông tin nhạy cảm.'),
        ('level_full_out_attack', 'def_signature', TRUE, TRUE, 'Chữ ký số xác nhận toàn vẹn nguồn tin và chống sửa.'),
        ('level_full_out_attack', 'def_replay_cache', TRUE, TRUE, 'Replay Cache chặn đứng phát lại.'),
        ('level_full_out_attack', 'def_audit_log', TRUE, TRUE, 'Audit Log lưu trữ an toàn vết sự cố.'),
        ('level_full_out_attack', 'def_nonce', TRUE, FALSE, 'Nonce chống phát lại.'),
        ('level_full_out_attack', 'def_timestamp', TRUE, FALSE, 'Timestamp chặn quá hạn.');
      `);
    }


    // 4. Seed Achievements if empty
    const [achCountResults] = await connection.query('SELECT COUNT(*) as count FROM achievements');
    const achCount = (achCountResults as any)[0].count;
    if (achCount === 0) {
      console.log('[DATABASE] Seeding achievements...');
      await connection.query(`
        INSERT INTO achievements (achievement_id, code, name, description, points_bonus, badge_icon_url, badge_glow_color)
        VALUES
        ('ach_integrity_guardian', 'INTEGRITY_GUARDIAN', 'Hộ Vệ Toàn Vẹn', 'Chặn đứng thành công tấn công sửa số tiền giao dịch mà không cần dùng gợi ý.', 50, '/images/badges/integrity.png', '#00f0ff'),
        ('ach_replay_hunter', 'REPLAY_HUNTER', 'Thợ Săn Replay', 'Phát hiện và loại bỏ cuộc tấn công gửi lại (Replay Attack) chỉ trong một lần thử.', 50, '/images/badges/replay.png', '#39ff14'),
        ('ach_key_master', 'KEY_MASTER', 'Bậc Thầy Khóa', 'Hoàn thành cấp độ xử lý lỗi sai khóa và liên kết key fingerprint hoàn hảo.', 50, '/images/badges/key.png', '#ffb700'),
        ('ach_forensic_analyst', 'FORENSIC_ANALYST', 'Chuyên Gia Pháp Y', 'Đọc đúng lịch sử log validator để xác định nguyên nhân sự cố trong màn điều tra.', 50, '/images/badges/forensics.png', '#ff0055');
      `);
    }

    // 5. Seed Test Cases if empty
    const [testCountResults] = await connection.query('SELECT COUNT(*) as count FROM test_cases');
    const testCount = (testCountResults as any)[0].count;
    if (testCount === 0) {
      console.log('[DATABASE] Seeding test cases...');
      await connection.query(`
        INSERT INTO test_cases (test_case_id, code, name, category, description, expected_result, is_required)
        VALUES
        ('tc_valid_transaction', 'TC01_VALID_TRANSACTION', 'Giao dịch hợp lệ', 'FUNCTIONAL_SECURITY', 'Payload, chữ ký, key, nonce đều hợp lệ.', 'ACCEPTED', TRUE),
        ('tc_amount_tampering', 'TC02_AMOUNT_TAMPERING', 'Sửa số tiền', 'TAMPERING', 'Amount bị thay đổi sau khi ký.', 'REJECTED_SIGNATURE_OR_INTEGRITY', TRUE),
        ('tc_replay', 'TC03_REPLAY_TRANSACTION', 'Gửi lại giao dịch cũ', 'REPLAY', 'Dùng lại message_id/nonce/sequence.', 'REJECTED_REPLAY', TRUE),
        ('tc_invalid_signature', 'TC04_INVALID_SIGNATURE', 'Dùng sai chữ ký', 'SIGNATURE', 'Signature bị thay hoặc ký bằng khóa attacker.', 'REJECTED_INVALID_SIGNATURE', TRUE),
        ('tc_wrong_key', 'TC05_WRONG_KEY', 'Dùng sai khóa', 'KEY_MANAGEMENT', 'key_id sai hoặc key không khớp.', 'REJECTED_WRONG_KEY', TRUE),
        ('tc_scoring_explanation', 'TC06_SCORING_EXPLANATION', 'Kiểm tra điểm và giải thích', 'GAMEPLAY', 'Sau mỗi màn phải có score event và explanation.', 'SCORE_AND_EXPLANATION_CREATED', TRUE);
      `);
    }

    // 6. Seed Demo Accounts if empty
    const [accCountResults] = await connection.query('SELECT COUNT(*) as count FROM accounts');
    const accCount = (accCountResults as any)[0].count;
    if (accCount === 0) {
      console.log('[DATABASE] Seeding demo accounts...');
      await connection.query(`
        INSERT INTO accounts (account_id, account_no, owner_name, account_type, balance, currency, status)
        VALUES
        ('acc_bank_vault', 'CB-VAULT-001', 'Hệ thống Kho Ngân Hàng', 'MERCHANT', 100000000000, 'VND', 'ACTIVE'),
        ('acc_alice_demo', 'CB-1001-ALICE', 'Alice (Operator Demo)', 'PLAYER', 50000000, 'VND', 'ACTIVE'),
        ('acc_bob_demo', 'CB-2002-BOB', 'Bob (Merchant Demo)', 'MERCHANT', 10000000, 'VND', 'ACTIVE'),
        ('acc_attacker_vault', 'CB-666-ATTACKER', 'Ví Attacker Infiltrator', 'DEMO', 0, 'VND', 'ACTIVE');
      `);
    }

    console.log('[DATABASE] Database initialization completed successfully.');
  } catch (error) {
    console.error('[DATABASE] Critical error during database initialization:', error);
    throw error;
  } finally {
    if (connection) connection.release();
  }
}
