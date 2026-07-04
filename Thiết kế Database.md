# Thiết kế Database - CyberBank Security Game v2

## 1. Mục tiêu database

Database của CyberBank Security Game v2 được thiết kế cho **website có đăng ký, đăng nhập và lưu tiến độ người chơi**. Hệ quản trị cơ sở dữ liệu đề xuất là **MySQL 8.x**.

Database phục vụ các mục tiêu:

- Lưu tài khoản người dùng, mật khẩu đã hash, vai trò và trạng thái tài khoản.
- Lưu phiên đăng nhập, refresh token đã hash, log đăng nhập và thu hồi token khi đăng xuất.
- Lưu hồ sơ người chơi, tiến độ campaign, điểm, achievement.
- Lưu level, tình huống tấn công, defense option và bài học học thuật.
- Lưu giao dịch giả lập, transaction envelope, attempt, kết quả validator và log bảo mật.
- Hỗ trợ chống replay bằng `message_id`, `nonce_hash`, `sequence_no`, `session_id`.
- Lưu test case, test run và test result để xuất test report.
- Phục vụ bảng điểm giảng viên và báo cáo bài tập lớn.

## 2. Công nghệ database sử dụng

| Thành phần | Công nghệ đề xuất | Ghi chú |
|---|---|---|
| DBMS | MySQL 8.x | Database chính của website |
| ORM | Prisma ORM | Migration, model, query type-safe |
| Backend | Node.js + Express + TypeScript | Gọi MySQL qua Prisma |
| Password hash | Argon2id hoặc bcrypt | Không lưu mật khẩu rõ |
| Token | JWT access token + refresh token | Refresh token lưu dạng hash trong MySQL |
| Migration | Prisma Migrate hoặc SQL migration | Quản lý thay đổi schema |
| Seed data | `prisma/seed.ts` hoặc file `.sql` | Nạp level, defense, concept, test case |
| Backup demo | `mysqldump` | Xuất database mẫu khi nộp bài |

Chuỗi kết nối mẫu:

```env
DATABASE_URL=mysql://cyberbank_user:cyberbank_pass@localhost:3306/cyberbank_security_game
```

## 3. Quy ước thiết kế dữ liệu

- ID dùng `VARCHAR(36)` nếu dùng UUID, hoặc `VARCHAR(64)` nếu dùng prefix như `level_amount_tampering`.
- Thời gian dùng `DATETIME(3)` để lưu millisecond.
- Boolean dùng `BOOLEAN`, MySQL lưu dưới dạng `TINYINT(1)`.
- JSON dùng kiểu `JSON` của MySQL.
- Tiền dùng `BIGINT`, không dùng `FLOAT` hoặc `DOUBLE`.
- Hash, signature, ciphertext dùng `TEXT` hoặc `VARCHAR(512)` tùy độ dài.
- Các enum quan trọng dùng `CHECK` để báo cáo rõ ràng; nếu MySQL cũ không enforce `CHECK`, backend vẫn phải validate bằng Zod/Joi.
- Không lưu private key thật, secret key thật, password rõ, raw refresh token hoặc JWT secret trong database.

## 4. Sơ đồ ERD

```mermaid
erDiagram
    users ||--|| player_profiles : has
    users ||--o{ refresh_tokens : owns
    users ||--o{ login_audit_logs : creates
    users ||--o{ game_sessions : plays
    users ||--o{ transaction_attempts : submits
    users ||--o{ player_achievements : earns

    game_sessions ||--o{ transactions : contains
    game_sessions ||--o{ transaction_logs : writes
    game_sessions ||--o{ score_events : scores
    game_sessions ||--o{ replay_cache : tracks

    levels ||--o{ transactions : scenario
    levels ||--o{ level_defense_options : allows
    levels ||--o{ level_concepts : teaches

    defense_options ||--o{ level_defense_options : used_in
    security_concepts ||--o{ level_concepts : explains

    transactions ||--o{ transaction_attempts : has
    transaction_attempts ||--|| transaction_envelopes : stores
    transaction_attempts ||--o{ transaction_logs : produces
    transaction_attempts ||--o{ score_events : changes

    crypto_keysets ||--o{ transaction_envelopes : signs_or_encrypts
    crypto_keysets ||--o{ key_rotation_events : rotates

    achievements ||--o{ player_achievements : awarded

    test_runs ||--o{ test_results : includes
    test_cases ||--o{ test_results : evaluated_by
```

## 5. Danh sách bảng

### 5.1 Nhóm tài khoản và xác thực

| Bảng | Mục đích |
|---|---|
| `users` | Tài khoản đăng ký/đăng nhập |
| `player_profiles` | Hồ sơ người chơi, tổng điểm, level hiện tại |
| `refresh_tokens` | Refresh token đã hash, dùng cho đăng nhập dài hạn |
| `password_reset_tokens` | Token đổi/quên mật khẩu dạng hash |
| `login_audit_logs` | Log đăng nhập, đăng xuất, đăng nhập thất bại |

### 5.2 Nhóm game và học thuật

| Bảng | Mục đích |
|---|---|
| `game_sessions` | Phiên chơi/campaign của user |
| `levels` | Màn chơi |
| `security_concepts` | Khái niệm học thuật |
| `level_concepts` | Liên kết level và concept |
| `defense_options` | Biện pháp phòng thủ |
| `level_defense_options` | Defense đúng/sai theo level |
| `achievements` | Thành tựu |
| `player_achievements` | Thành tựu user đạt được |

### 5.3 Nhóm giao dịch và bảo mật

| Bảng | Mục đích |
|---|---|
| `accounts` | Tài khoản ngân hàng demo |
| `transactions` | Giao dịch gốc theo scenario |
| `transaction_attempts` | Lần người chơi chọn defense và submit |
| `transaction_envelopes` | Gói dữ liệu bảo mật: ciphertext, tag, signature |
| `replay_cache` | Cache chống replay |
| `transaction_logs` | Log bảo mật trong game |
| `score_events` | Sự kiện cộng/trừ điểm |
| `crypto_keysets` | Metadata khóa, public key, fingerprint |
| `key_rotation_events` | Lịch sử xoay khóa |

### 5.4 Nhóm kiểm thử và báo cáo

| Bảng | Mục đích |
|---|---|
| `test_cases` | Test case bắt buộc |
| `test_runs` | Mỗi lần chạy bộ test |
| `test_results` | Kết quả từng test |

## 6. DDL MySQL đề xuất

```sql
CREATE DATABASE IF NOT EXISTS cyberbank_security_game
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE cyberbank_security_game;

CREATE TABLE users (
    user_id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(120) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'PLAYER',
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    last_login_at DATETIME(3) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    CHECK (role IN ('PLAYER', 'INSTRUCTOR', 'ADMIN')),
    CHECK (status IN ('ACTIVE', 'LOCKED', 'DISABLED'))
);

CREATE TABLE player_profiles (
    profile_id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL UNIQUE,
    display_name VARCHAR(80) NOT NULL,
    avatar_url VARCHAR(500) NULL,
    total_score INT NOT NULL DEFAULT 0,
    current_level_id VARCHAR(64) NULL,
    completed_level_count INT NOT NULL DEFAULT 0,
    operator_rank VARCHAR(40) NOT NULL DEFAULT 'NOVICE_OPERATOR', -- Danh hiệu tác chiến an ninh
    selected_theme VARCHAR(40) NOT NULL DEFAULT 'NEON_GRID',      -- Theme giao diện đang chọn
    unlocked_themes JSON NULL,                                   -- Danh sách theme đã mở khóa (mảng JSON)
    last_played_at DATETIME(3) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CHECK (operator_rank IN ('NOVICE_OPERATOR', 'CYBER_GUARDIAN', 'CRYPTOGRAPHIC_SPECIALIST', 'FORENSIC_MASTER')),
    CHECK (selected_theme IN ('NEON_GRID', 'MATRIX_GREEN', 'RED_ALERT', 'STEEL_HUD'))
);

CREATE TABLE refresh_tokens (
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
);

CREATE TABLE password_reset_tokens (
    reset_token_id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at DATETIME(3) NOT NULL,
    used_at DATETIME(3) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE login_audit_logs (
    login_log_id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NULL,
    email_attempted VARCHAR(255) NULL,
    event_type VARCHAR(40) NOT NULL,
    success BOOLEAN NOT NULL DEFAULT FALSE,
    ip_address VARCHAR(45) NULL,
    user_agent VARCHAR(500) NULL,
    safe_context JSON NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    CHECK (event_type IN ('REGISTER', 'LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT', 'TOKEN_REFRESH', 'PASSWORD_CHANGED'))
);

CREATE TABLE levels (
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
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    CHECK (attack_type IN ('NONE', 'AMOUNT_TAMPERING', 'REPLAY', 'INVALID_SIGNATURE', 'WRONG_KEY', 'EXPIRED_TRANSACTION', 'NONCE_REUSE', 'FORENSICS')),
    CHECK (difficulty IN ('EASY', 'NORMAL', 'HARD'))
);

CREATE TABLE security_concepts (
    concept_id VARCHAR(64) PRIMARY KEY,
    code VARCHAR(80) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL,
    short_lesson TEXT NOT NULL,
    detail_markdown TEXT NOT NULL,
    common_mistakes_markdown TEXT NULL,
    reference_url VARCHAR(500) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
);

CREATE TABLE level_concepts (
    level_id VARCHAR(64) NOT NULL,
    concept_id VARCHAR(64) NOT NULL,
    display_order INT NOT NULL DEFAULT 1,
    PRIMARY KEY (level_id, concept_id),
    FOREIGN KEY (level_id) REFERENCES levels(level_id) ON DELETE CASCADE,
    FOREIGN KEY (concept_id) REFERENCES security_concepts(concept_id) ON DELETE CASCADE
);

CREATE TABLE defense_options (
    defense_id VARCHAR(64) PRIMARY KEY,
    code VARCHAR(80) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL,
    category VARCHAR(40) NOT NULL,
    description TEXT NOT NULL,
    config_schema JSON NULL,
    score_cost INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    CHECK (category IN ('CONFIDENTIALITY', 'INTEGRITY', 'AUTHENTICATION', 'ANTI_REPLAY', 'KEY_MANAGEMENT', 'LOGGING'))
);

CREATE TABLE level_defense_options (
    level_id VARCHAR(64) NOT NULL,
    defense_id VARCHAR(64) NOT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT FALSE,
    is_required BOOLEAN NOT NULL DEFAULT FALSE,
    hint_text TEXT NULL,
    PRIMARY KEY (level_id, defense_id),
    FOREIGN KEY (level_id) REFERENCES levels(level_id) ON DELETE CASCADE,
    FOREIGN KEY (defense_id) REFERENCES defense_options(defense_id) ON DELETE CASCADE
);

CREATE TABLE game_sessions (
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
    FOREIGN KEY (current_level_id) REFERENCES levels(level_id) ON DELETE SET NULL,
    CHECK (difficulty IN ('EASY', 'NORMAL', 'HARD')),
    CHECK (status IN ('ACTIVE', 'COMPLETED', 'ABANDONED'))
);

CREATE TABLE accounts (
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
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    CHECK (account_type IN ('DEMO', 'PLAYER', 'MERCHANT')),
    CHECK (status IN ('ACTIVE', 'LOCKED', 'CLOSED'))
);

CREATE TABLE transactions (
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
    FOREIGN KEY (to_account_id) REFERENCES accounts(account_id),
    CHECK (original_amount > 0),
    CHECK (submitted_amount > 0),
    CHECK (tx_status IN ('DRAFT', 'ACCEPTED', 'REJECTED'))
);

CREATE TABLE crypto_keysets (
    key_id VARCHAR(64) PRIMARY KEY,
    owner_type VARCHAR(20) NOT NULL,
    owner_id VARCHAR(36) NULL,
    purpose VARCHAR(20) NOT NULL,
    algorithm VARCHAR(40) NOT NULL,
    public_key_pem TEXT NULL,
    key_fingerprint VARCHAR(128) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    not_before DATETIME(3) NULL,
    not_after DATETIME(3) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    CHECK (owner_type IN ('PLAYER', 'BANK', 'ATTACKER', 'SYSTEM')),
    CHECK (purpose IN ('SIGNING', 'ENCRYPTION', 'HMAC', 'DEMO')),
    CHECK (status IN ('ACTIVE', 'REVOKED', 'EXPIRED', 'DEMO_ONLY'))
);

CREATE TABLE transaction_attempts (
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
    UNIQUE (tx_id, attempt_no),
    CHECK (result_status IN ('ACCEPTED', 'REJECTED', 'FAILED_TO_VALIDATE')),
    CHECK (expected_result_status IN ('ACCEPTED', 'REJECTED'))
);

CREATE TABLE transaction_envelopes (
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
);

CREATE TABLE replay_cache (
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
    UNIQUE (session_id, message_id),
    UNIQUE (session_id, nonce_hash)
);

CREATE TABLE transaction_logs (
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
    FOREIGN KEY (attempt_id) REFERENCES transaction_attempts(attempt_id) ON DELETE SET NULL,
    CHECK (severity IN ('INFO', 'WARN', 'ERROR', 'SECURITY', 'SUCCESS'))
);

CREATE TABLE score_events (
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
);

CREATE TABLE achievements (
    achievement_id VARCHAR(64) PRIMARY KEY,
    code VARCHAR(80) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL,
    description TEXT NOT NULL,
    points_bonus INT NOT NULL DEFAULT 0,
    badge_icon_url VARCHAR(500) NULL,      -- Đường dẫn huy chương holographic
    badge_glow_color CHAR(7) NOT NULL DEFAULT '#00f0ff', -- Màu hào quang neon phát sáng của huy chương
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
);

CREATE TABLE player_achievements (
    user_id VARCHAR(36) NOT NULL,
    achievement_id VARCHAR(64) NOT NULL,
    session_id VARCHAR(36) NOT NULL,
    earned_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (user_id, achievement_id, session_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (achievement_id) REFERENCES achievements(achievement_id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES game_sessions(session_id) ON DELETE CASCADE
);

CREATE TABLE key_rotation_events (
    rotation_id VARCHAR(36) PRIMARY KEY,
    old_key_id VARCHAR(64) NULL,
    new_key_id VARCHAR(64) NOT NULL,
    reason VARCHAR(255) NOT NULL,
    rotated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    FOREIGN KEY (old_key_id) REFERENCES crypto_keysets(key_id) ON DELETE SET NULL,
    FOREIGN KEY (new_key_id) REFERENCES crypto_keysets(key_id)
);

CREATE TABLE test_cases (
    test_case_id VARCHAR(64) PRIMARY KEY,
    code VARCHAR(80) NOT NULL UNIQUE,
    name VARCHAR(160) NOT NULL,
    category VARCHAR(60) NOT NULL,
    description TEXT NOT NULL,
    expected_result VARCHAR(120) NOT NULL,
    is_required BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
);

CREATE TABLE test_runs (
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
    FOREIGN KEY (triggered_by_user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    CHECK (status IN ('RUNNING', 'PASSED', 'FAILED', 'PARTIAL'))
);

CREATE TABLE test_results (
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
    FOREIGN KEY (evidence_log_id) REFERENCES transaction_logs(log_id) ON DELETE SET NULL,
    UNIQUE (test_run_id, test_case_id),
    CHECK (status IN ('PASSED', 'FAILED', 'SKIPPED'))
);
```

## 7. Index đề xuất

```sql
CREATE INDEX idx_users_email_status ON users(email, status);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id, expires_at);
CREATE INDEX idx_login_logs_user_time ON login_audit_logs(user_id, created_at);
CREATE INDEX idx_game_sessions_user ON game_sessions(user_id, status);
CREATE INDEX idx_transactions_session ON transactions(session_id);
CREATE INDEX idx_transactions_level ON transactions(level_id);
CREATE INDEX idx_attempts_tx ON transaction_attempts(tx_id);
CREATE INDEX idx_attempts_session ON transaction_attempts(session_id);
CREATE INDEX idx_logs_session_time ON transaction_logs(session_id, created_at);
CREATE INDEX idx_logs_event_type ON transaction_logs(event_type);
CREATE INDEX idx_score_session ON score_events(session_id);
CREATE INDEX idx_score_user ON score_events(user_id, created_at);
CREATE INDEX idx_replay_session_sequence ON replay_cache(session_id, sequence_no);
CREATE INDEX idx_envelopes_message ON transaction_envelopes(message_id);
CREATE INDEX idx_keysets_fingerprint ON crypto_keysets(key_fingerprint);
CREATE INDEX idx_test_results_run ON test_results(test_run_id);
```

## 8. Thiết kế đăng ký và đăng nhập

### 8.1 Bảng `users`

`users` là bảng trung tâm cho tài khoản website.

| Cột | Ý nghĩa | Yêu cầu bảo mật |
|---|---|---|
| `email` | Tên đăng nhập | Unique, normalize chữ thường |
| `password_hash` | Mật khẩu đã hash | Argon2id/bcrypt, không lưu password rõ |
| `role` | PLAYER/INSTRUCTOR/ADMIN | Dùng cho phân quyền |
| `status` | ACTIVE/LOCKED/DISABLED | Khóa tài khoản vi phạm |
| `last_login_at` | Lần đăng nhập cuối | Phục vụ audit |

### 8.2 Bảng `refresh_tokens`

Không lưu refresh token rõ. Backend chỉ lưu `token_hash`.

Luồng:

1. Login thành công.
2. Backend sinh refresh token ngẫu nhiên.
3. Hash refresh token.
4. Lưu hash vào `refresh_tokens`.
5. Trả raw refresh token cho client qua httpOnly cookie hoặc response an toàn.
6. Khi refresh/logout, backend hash token client gửi lên rồi đối chiếu.

### 8.3 Bảng `login_audit_logs`

Ghi các sự kiện:

- Đăng ký.
- Đăng nhập thành công.
- Đăng nhập thất bại.
- Refresh token.
- Đăng xuất.
- Đổi mật khẩu.

Không ghi mật khẩu, token, JWT hoặc secret.

## 9. Seed data cho level bắt buộc

```sql
INSERT INTO levels
(level_id, level_no, title, scenario_type, attack_type, difficulty, max_score, unlock_score_required, mission_markdown, success_explanation_markdown, failure_explanation_markdown, is_required, is_active)
VALUES
('level_valid_transaction', 1, 'Giao dịch hợp lệ', 'BANK_TRANSFER', 'NONE', 'EASY', 100, 0,
'Thực hiện một giao dịch ngân hàng hợp lệ và quan sát các bước ký, mã hóa, xác minh.',
'Giao dịch được chấp nhận vì payload không bị sửa, chữ ký hợp lệ, key đúng và log được ghi đầy đủ.',
'Giao dịch hợp lệ nhưng cấu hình phòng thủ thiếu hoặc validator chưa được bật đúng.',
TRUE, TRUE),
('level_amount_tampering', 2, 'Số tiền bị sửa', 'BANK_TRANSFER', 'AMOUNT_TAMPERING', 'NORMAL', 100, 60,
'Attacker sửa amount sau khi giao dịch được tạo. Hãy chọn phòng thủ để phát hiện thay đổi.',
'Validator phát hiện dữ liệu bị sửa nhờ chữ ký/HMAC/AEAD tag bao phủ amount.',
'Attack thành công vì hệ thống không kiểm tra toàn vẹn hoặc chữ ký không bao phủ amount.',
TRUE, TRUE),
('level_replay_transaction', 3, 'Replay giao dịch cũ', 'BANK_TRANSFER', 'REPLAY', 'NORMAL', 100, 120,
'Attacker gửi lại một giao dịch cũ từng hợp lệ. Hãy chặn giao dịch bị gửi lại.',
'Replay bị phát hiện vì message_id/nonce/sequence đã tồn tại trong replay cache hoặc timestamp hết hạn.',
'Attack thành công vì chữ ký vẫn hợp lệ nhưng hệ thống không kiểm tra freshness.',
TRUE, TRUE),
('level_invalid_signature', 4, 'Giả mạo chữ ký hoặc khóa sai', 'BANK_TRANSFER', 'INVALID_SIGNATURE', 'NORMAL', 100, 180,
'Attacker thay chữ ký hoặc ký bằng khóa khác. Hãy xác minh nguồn gửi.',
'Giao dịch bị từ chối vì chữ ký không khớp public key/key fingerprint đã đăng ký.',
'Attack thành công vì validator không kiểm tra chữ ký hoặc dùng nhầm public key.',
TRUE, TRUE),
('level_wrong_key', 5, 'Dùng sai khóa', 'BANK_TRANSFER', 'WRONG_KEY', 'HARD', 100, 240,
'Hệ thống dùng sai key_id hoặc key đã hết hạn. Hãy phát hiện lỗi khóa.',
'Sai khóa bị phát hiện nhờ key registry, key fingerprint và AEAD tag.',
'Attack thành công vì hệ thống không ràng buộc key_id hoặc bỏ qua lỗi xác thực tag.',
FALSE, TRUE);
```

## 10. Seed data cho defense options

```sql
INSERT INTO defense_options
(defense_id, code, name, category, description, score_cost)
VALUES
('def_aes_gcm', 'AES_GCM', 'AES-GCM', 'CONFIDENTIALITY', 'Mã hóa có xác thực, phát hiện sửa ciphertext/AAD/tag.', 0),
('def_hmac', 'HMAC_SHA256', 'HMAC-SHA256', 'INTEGRITY', 'Kiểm tra toàn vẹn thông điệp bằng khóa bí mật.', 0),
('def_signature', 'DIGITAL_SIGNATURE', 'Chữ ký số', 'AUTHENTICATION', 'Xác thực người gửi và phát hiện sửa payload.', 0),
('def_nonce', 'NONCE', 'Nonce', 'ANTI_REPLAY', 'Giá trị dùng một lần để phân biệt message.', 0),
('def_timestamp', 'TIMESTAMP_TTL', 'Timestamp/TTL', 'ANTI_REPLAY', 'Từ chối dữ liệu quá hạn hoặc lệch thời gian.', 0),
('def_replay_cache', 'REPLAY_CACHE', 'Replay Cache', 'ANTI_REPLAY', 'Lưu message_id/nonce đã xử lý để chặn gửi lại.', 0),
('def_key_fingerprint', 'KEY_FINGERPRINT', 'Key Fingerprint', 'KEY_MANAGEMENT', 'Đối chiếu dấu vân tay khóa để tránh dùng nhầm khóa.', 0),
('def_audit_log', 'AUDIT_LOG', 'Audit Log', 'LOGGING', 'Ghi log an toàn để truy vết kết quả xác minh.', 0);
```

## 11. Mapping defense đúng theo level

```sql
INSERT INTO level_defense_options (level_id, defense_id, is_correct, is_required, hint_text) VALUES
('level_valid_transaction', 'def_aes_gcm', TRUE, FALSE, 'Giao dịch hợp lệ nên có mã hóa có xác thực.'),
('level_valid_transaction', 'def_signature', TRUE, TRUE, 'Cần chữ ký để xác thực người gửi.'),
('level_valid_transaction', 'def_audit_log', TRUE, TRUE, 'Log giúp chứng minh giao dịch đã được xử lý.'),

('level_amount_tampering', 'def_signature', TRUE, TRUE, 'Chữ ký phải bao phủ amount.'),
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

('level_wrong_key', 'def_key_fingerprint', TRUE, TRUE, 'Cần kiểm tra key_id/fingerprint.'),
('level_wrong_key', 'def_aes_gcm', TRUE, TRUE, 'Sai khóa làm AEAD tag invalid.'),
('level_wrong_key', 'def_audit_log', TRUE, FALSE, 'Log lỗi sai khóa/tag invalid.');
```

## 12. Seed data test bắt buộc

```sql
INSERT INTO test_cases
(test_case_id, code, name, category, description, expected_result, is_required)
VALUES
('tc_valid_transaction', 'TC01_VALID_TRANSACTION', 'Giao dịch hợp lệ', 'FUNCTIONAL_SECURITY', 'Payload, chữ ký, key, nonce đều hợp lệ.', 'ACCEPTED', TRUE),
('tc_amount_tampering', 'TC02_AMOUNT_TAMPERING', 'Sửa số tiền', 'TAMPERING', 'Amount bị thay đổi sau khi ký.', 'REJECTED_SIGNATURE_OR_INTEGRITY', TRUE),
('tc_replay', 'TC03_REPLAY_TRANSACTION', 'Gửi lại giao dịch cũ', 'REPLAY', 'Dùng lại message_id/nonce/sequence.', 'REJECTED_REPLAY', TRUE),
('tc_invalid_signature', 'TC04_INVALID_SIGNATURE', 'Dùng sai chữ ký', 'SIGNATURE', 'Signature bị thay hoặc ký bằng khóa attacker.', 'REJECTED_INVALID_SIGNATURE', TRUE),
('tc_wrong_key', 'TC05_WRONG_KEY', 'Dùng sai khóa', 'KEY_MANAGEMENT', 'key_id sai hoặc key không khớp.', 'REJECTED_WRONG_KEY', TRUE),
('tc_scoring_explanation', 'TC06_SCORING_EXPLANATION', 'Kiểm tra điểm và giải thích', 'GAMEPLAY', 'Sau mỗi màn phải có score event và explanation.', 'SCORE_AND_EXPLANATION_CREATED', TRUE);
```

## 13. Query phục vụ website

### 13.1 Lấy dashboard sau đăng nhập

```sql
SELECT
    u.user_id,
    u.full_name,
    u.email,
    u.role,
    p.display_name,
    p.total_score,
    p.completed_level_count,
    p.current_level_id
FROM users u
JOIN player_profiles p ON p.user_id = u.user_id
WHERE u.user_id = ?;
```

### 13.2 Lịch sử giao dịch của user

```sql
SELECT
    t.tx_id,
    l.level_no,
    l.title AS level_title,
    t.attack_type,
    t.original_amount,
    t.submitted_amount,
    a.result_status,
    a.is_success,
    a.score_delta,
    a.created_at
FROM transactions t
JOIN game_sessions s ON s.session_id = t.session_id
JOIN levels l ON l.level_id = t.level_id
LEFT JOIN transaction_attempts a ON a.tx_id = t.tx_id
WHERE s.user_id = ?
ORDER BY a.created_at DESC;
```

### 13.3 Log theo attempt

```sql
SELECT
    created_at,
    severity,
    event_type,
    message,
    safe_context
FROM transaction_logs
WHERE attempt_id = ?
ORDER BY created_at ASC;
```

### 13.4 Tổng điểm tính từ score events

```sql
SELECT COALESCE(SUM(points), 0) AS total_score
FROM score_events
WHERE user_id = ?;
```

### 13.5 Bảng điểm cho giảng viên

```sql
SELECT
    u.full_name,
    u.email,
    p.total_score,
    p.completed_level_count,
    MAX(s.updated_at) AS last_session_update
FROM users u
JOIN player_profiles p ON p.user_id = u.user_id
LEFT JOIN game_sessions s ON s.user_id = u.user_id
WHERE u.role = 'PLAYER'
GROUP BY u.user_id, u.full_name, u.email, p.total_score, p.completed_level_count
ORDER BY p.total_score DESC;
```

### 13.6 Test report

```sql
SELECT
    tc.code,
    tc.name,
    tr.status,
    tr.actual_result,
    tr.duration_ms
FROM test_results tr
JOIN test_cases tc ON tc.test_case_id = tr.test_case_id
WHERE tr.test_run_id = ?
ORDER BY tc.code;
```

## 14. Quy tắc lưu replay cache

Replay cache lưu:

- `session_id`
- `message_id`
- `nonce_hash`
- `sequence_no`
- `tx_id`
- `first_seen_attempt_id`
- `expires_at`

Khi validator nhận envelope:

1. Kiểm tra `session_id`.
2. Kiểm tra `message_id` đã tồn tại chưa.
3. Kiểm tra `nonce_hash` đã tồn tại chưa.
4. Kiểm tra `sequence_no` có nhỏ hơn hoặc bằng sequence đã xử lý không.
5. Kiểm tra `timestamp/expires_at`.
6. Nếu replay, ghi `REPLAY_DETECTED` và từ chối.
7. Nếu hợp lệ, ghi cache để chặn lần gửi sau.

## 15. Score event reason codes

| Reason code | Điểm | Ý nghĩa |
|---|---:|---|
| `CORRECT_PRIMARY_DEFENSE` | +50 | Chọn đúng defense chính |
| `CORRECT_SUPPORT_DEFENSE` | +20 | Chọn đủ defense phụ |
| `FIRST_TRY_BONUS` | +10 | Qua màn lần đầu |
| `LOG_EVIDENCE_SELECTED` | +5 | Chọn đúng dòng log bằng chứng |
| `QUIZ_CORRECT` | +15 | Trả lời đúng câu hỏi học thuật |
| `HINT_LEVEL_1` | -5 | Dùng hint nhẹ |
| `HINT_LEVEL_2` | -10 | Dùng hint rõ |
| `WRONG_DEFENSE` | -20 | Chọn sai defense khiến attack thành công |
| `UNNEEDED_DEFENSE` | -5 | Chọn defense thừa |

## 16. Event types trong transaction_logs

| Event type | Severity | Khi nào ghi |
|---|---|---|
| `SESSION_CREATED` | INFO | Tạo phiên |
| `LEVEL_STARTED` | INFO | Bắt đầu level |
| `TRANSACTION_CREATED` | INFO | Tạo giao dịch |
| `PAYLOAD_CANONICALIZED` | INFO | Chuẩn hóa payload |
| `PAYLOAD_HASHED` | INFO | Tính hash |
| `PAYLOAD_SIGNED` | INFO | Ký payload |
| `PAYLOAD_ENCRYPTED` | INFO | Mã hóa |
| `ATTACK_APPLIED` | WARN | Attack bot sửa/gửi lại envelope |
| `VALIDATION_STARTED` | INFO | Validator bắt đầu |
| `AEAD_TAG_VALID` | SUCCESS | Tag hợp lệ |
| `AEAD_TAG_INVALID` | SECURITY | Tag sai |
| `SIGNATURE_VALID` | SUCCESS | Chữ ký đúng |
| `SIGNATURE_INVALID` | SECURITY | Chữ ký sai |
| `KEY_MISMATCH` | SECURITY | key_id/fingerprint sai |
| `REPLAY_DETECTED` | SECURITY | Replay |
| `TRANSACTION_EXPIRED` | SECURITY | Hết hạn |
| `TRANSACTION_ACCEPTED` | SUCCESS | Giao dịch được chấp nhận |
| `TRANSACTION_REJECTED` | ERROR | Giao dịch bị từ chối |
| `SCORE_UPDATED` | INFO | Cập nhật điểm |

## 17. Dữ liệu không được lưu hoặc log

Không lưu/log:

- Mật khẩu rõ.
- Raw refresh token.
- JWT access token.
- JWT secret.
- Private key thật.
- AES/HMAC secret key thật.
- Thông tin ngân hàng thật.

Được lưu:

- `password_hash`.
- `token_hash`.
- Public key demo.
- Key fingerprint.
- Hash payload.
- Ciphertext demo.
- Log đã ẩn dữ liệu nhạy cảm.

## 18. Migration đề xuất

```text
src/backend/prisma/
  schema.prisma
  migrations/
    001_init_auth_tables/
    002_init_game_content_tables/
    003_init_transaction_tables/
    004_init_report_tables/
  seed.ts
```

Nếu dùng SQL thuần:

```text
migrations/
  001_create_database.sql
  002_create_auth_tables.sql
  003_create_game_tables.sql
  004_create_transaction_tables.sql
  005_create_test_report_tables.sql
  006_seed_levels.sql
  007_seed_defenses.sql
  008_seed_test_cases.sql
```

## 19. Backup và reset dữ liệu

Chức năng nên có cho demo:

- `Reset campaign`: xóa session, transaction, attempts, logs, score của user hiện tại.
- `Reset seed data`: nạp lại levels, defense options, concepts, test cases.
- `Export test report`: xuất `test_runs` và `test_results`.
- `Export transaction history`: xuất giao dịch và log đã ẩn secret.
- `Export MySQL dump`: tạo database mẫu để nộp kèm source nếu cần.

Không reset:

- Bảng `users` nếu không có xác nhận admin.
- File source code.
- File báo cáo.
- `.env`.

## 20. Kiểm thử database

Test database cần có:

- Đăng ký user mới thành công.
- Không cho đăng ký trùng email.
- Mật khẩu được hash, không lưu rõ.
- Đăng nhập đúng tạo refresh token hash.
- Đăng xuất thu hồi refresh token.
- Tạo player profile sau khi đăng ký.
- Seed đủ 4 level bắt buộc.
- Seed đủ defense bắt buộc.
- Lưu giao dịch hợp lệ.
- Lưu attempt sửa amount và log `SIGNATURE_INVALID`.
- Replay cache không cho trùng `message_id`.
- Replay cache không cho trùng `nonce_hash`.
- Score event tính tổng đúng theo user.
- Test report lưu đủ 6 test bắt buộc.
- Log không chứa chuỗi `private_key`, `secret`, `password`, `token`.

## 21. Ràng buộc nghiệm thu database

- Dùng MySQL 8.x.
- Có bảng `users` cho đăng ký/đăng nhập.
- Có `password_hash`, không có cột `password` dạng rõ.
- Có bảng refresh token hoặc session để quản lý đăng nhập.
- Có bảng profile/score gắn với user.
- Có khóa chính cho mọi bảng.
- Có foreign key cho quan hệ chính.
- Có unique constraint cho email.
- Có unique constraint cho replay cache theo `session_id + message_id`.
- Có index cho log theo `session_id + created_at`.
- Có bảng lưu test case và test result.
- Có bảng lưu concept học thuật.
- Có bảng lưu defense option.
- Không lưu secret thật trong log.
- Có query xuất lịch sử giao dịch, bảng điểm và test report.
