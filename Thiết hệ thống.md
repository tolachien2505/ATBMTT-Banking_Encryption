# Thiết kế hệ thống - CyberBank Security Game v2

## 1. Căn cứ thiết kế

Tài liệu này được viết cho đề tài 23: **CyberBank Security Game v2 - Game "Hệ thống mã hóa ngân hàng"**.

Nguồn yêu cầu đã đọc trong thư mục `LYTHUYET/`:

- `Huong_dan_BTL_FIT4012_Secure_System_Upgrade_Challenge (1).pdf`: yêu cầu chung, rubric, cấu trúc báo cáo, yêu cầu kiểm thử và yêu cầu riêng của đề tài 23.
- `Bai 6 AES.pdf`: nền tảng mã hóa khóa bí mật, dùng cho phần mô phỏng mã hóa giao dịch.
- `Bài 6 Hàm băm.pdf`: nền tảng hash, HMAC, kiểm tra toàn vẹn.
- `Bai 9 RSA .pdf`: nền tảng mã hóa bất đối xứng, khóa công khai/khóa bí mật.
- `Bai 9 Chữ kí số.pdf`: nền tảng chữ ký số và xác thực nguồn gửi.

Nguồn tham khảo thêm cho ý tưởng game và kỹ thuật:

- [CryptoHack](https://cryptohack.org/challenges/): chia thử thách theo nhóm kiến thức như symmetric ciphers, RSA, hash functions, crypto on the web.
- [picoCTF](https://picoctf.org/about.html): mô hình CTF giáo dục có điểm, thử thách nhỏ, học qua thực hành.
- [CyberStart Game](https://cyberstart.com/game/): mô hình nhiệm vụ, căn cứ, field manual, điểm và leaderboard.
- [OverTheWire Wargames](https://overthewire.org/wargames/): học bảo mật qua chuỗi level tăng dần.
- [NIST SP 800-38D](https://csrc.nist.gov/pubs/sp/800/38/d/final): GCM/GMAC cho mã hóa có xác thực.
- [NIST FIPS 186-5](https://csrc.nist.gov/pubs/fips/186-5/final): chuẩn chữ ký số RSA/ECDSA/EdDSA.
- [RFC 2104](https://datatracker.ietf.org/doc/html/rfc2104): HMAC.
- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html): ý tưởng token/nonce chống gửi yêu cầu giả mạo hoặc lặp lại trong web.

## 2. Tóm tắt đề tài

CyberBank Security Game v2 là **website game giáo dục** mô phỏng một hệ thống ngân hàng số. Người chơi có thể đăng ký tài khoản, đăng nhập, lưu tiến độ chơi, xem lịch sử giao dịch, xem điểm và thực hành bảo vệ giao dịch trước các nguy cơ:

- Sửa số tiền giao dịch.
- Gửi lại giao dịch cũ.
- Giả mạo chữ ký.
- Dùng sai khóa.
- Cấu hình mã hóa yếu.
- Quên kiểm tra timestamp, nonce, sequence number hoặc log.

Game không chỉ cho người chơi "xem kết quả" mà yêu cầu người chơi **chọn hoặc cấu hình biện pháp phòng thủ**. Sau mỗi màn, hệ thống giải thích vì sao tấn công thành công hoặc thất bại theo kiến thức mật mã học. Vì triển khai theo dạng website, toàn bộ tiến độ, điểm, log và test report được lưu trong **MySQL** để người dùng có thể tiếp tục chơi sau khi đăng nhập lại.

## 3. Mục tiêu sản phẩm

Mục tiêu chức năng:

- Cho phép người dùng đăng ký tài khoản bằng họ tên, email, mật khẩu.
- Cho phép người dùng đăng nhập, đăng xuất, đổi mật khẩu và xem hồ sơ cá nhân.
- Cho phép hệ thống phân quyền cơ bản
- Cho phép người chơi tạo giao dịch ngân hàng giả lập.
- Cho phép hệ thống mã hóa hoặc ký giao dịch.
- Cho phép mô phỏng tấn công lên giao dịch.
- Cho phép người chơi chọn biện pháp phòng thủ.
- Hiển thị kết quả giao dịch, điểm, log và giải thích.
- Lưu tiến độ chơi, điểm, achievement, lịch sử giao dịch theo từng tài khoản.
- Có ít nhất 4 tình huống bảo mật bắt buộc theo đề bài.
- Có test case cho các tình huống bắt buộc.

Mục tiêu học thuật:

- Giải thích được tính bí mật, toàn vẹn, xác thực, chống chối bỏ, chống replay và truy vết.
- Liên hệ AES-GCM, HMAC-SHA256, chữ ký số, hash, nonce, timestamp, session_id với từng màn chơi.
- Cho sinh viên thấy khác biệt giữa "mã hóa" và "bảo vệ toàn vẹn".
- Cho sinh viên hiểu tại sao không được hard-code khóa, không dùng lại nonce và không ghi khóa bí mật vào log.

Mục tiêu kỹ thuật:

- Có kiến trúc rõ ràng: frontend website, authentication service, game engine, crypto service, transaction service, logging, MySQL database, test runner.
- Có giao thức giao dịch mô phỏng đủ trường bảo mật: `tx_id`, `message_id`, `session_id`, `nonce`, `sequence_no`, `timestamp`, `expires_at`, `payload_hash`, `signature`, `key_id`.
- Có MySQL database lưu user, phiên đăng nhập, tiến độ, điểm, giao dịch, log và kết quả kiểm thử.
- Có khả năng sinh test report tự động.

## 4. Phạm vi hệ thống

Trong phạm vi:

- Website game chạy local, trong mạng nội bộ hoặc triển khai lên server demo.
- Có đăng ký, đăng nhập, đăng xuất và bảo vệ route bằng phiên đăng nhập/JWT.
- Dữ liệu ngân hàng là dữ liệu giả lập.
- Giao dịch giả lập giữa các tài khoản demo.
- Mã hóa và chữ ký dùng thư viện chuẩn, không tự viết thuật toán mật mã lõi.
- Log phục vụ học tập, kiểm thử và demo.
- Có chế độ campaign, sandbox và báo cáo.
- MySQL lưu dữ liệu ứng dụng, không dùng file JSON làm kho dữ liệu chính.

Ngoài phạm vi:

- Không kết nối ngân hàng thật.
- Không xử lý tiền thật.
- Không lưu private key thật của người dùng.
- Không gửi email thật nếu chưa cấu hình SMTP; chức năng quên mật khẩu có thể mô phỏng bằng token demo.
- Không triển khai thanh toán, OTP SMS thật hoặc xác thực định danh eKYC.
- Không xây dựng hệ thống xác thực ngân hàng thực tế đầy đủ như eKYC, OTP thật, Core Banking.

## 5. Người dùng và vai trò

| Vai trò | Mục đích | Quyền chính |
|---|---|---|
| Guest/Khách | Truy cập website trước khi đăng nhập | Xem trang giới thiệu ngắn, đăng ký, đăng nhập |
| Player/Sinh viên | Chơi game, hoàn thành level, học khái niệm bảo mật | Tạo giao dịch demo, chọn phòng thủ, xem điểm/log/giải thích, lưu tiến độ |
| Instructor/Giảng viên | Xem tiến độ, dùng game để giảng dạy | Xem test report, xem bảng điểm, xem thống kê lớp |
| Game Admin | Quản lý dữ liệu game | Tạo level, chỉnh defense option, quản lý user, import/export dữ liệu |
| Attacker Bot | Tác nhân mô phỏng tấn công | Tạo biến thể giao dịch: tamper, replay, wrong signature, wrong key |
| Bank Validator | Thành phần hệ thống xác minh giao dịch | Kiểm tra chữ ký, khóa, nonce, timestamp, số dư, log |

## 6. Tài sản cần bảo vệ

| Tài sản | Rủi ro | Biện pháp bảo vệ trong game |
|---|---|---|
| Số tiền giao dịch | Bị sửa từ 1.000.000 thành 100.000.000 | Hash/HMAC/signature/AEAD tag |
| Người gửi | Bị giả mạo chủ tài khoản | Chữ ký số, public key đúng |
| Nội dung giao dịch | Bị đọc hoặc sửa | AES-GCM, AAD, signature |
| Giao dịch cũ | Bị gửi lại nhiều lần | `message_id`, `nonce`, `sequence_no`, replay cache |
| Khóa ký/mã hóa | Bị dùng sai, lộ hoặc hard-code | `key_id`, key fingerprint, không log secret |
| Log giao dịch | Bị thiếu, sai hoặc chứa secret | Audit log an toàn, redaction |
| Điểm và tiến độ | Bị sửa | Lưu score event, tính lại từ event |

## 7. Mục tiêu bảo mật

| Mục tiêu | Ý nghĩa trong game | Cơ chế |
|---|---|---|
| Bí mật | Người ngoài không đọc được nội dung giao dịch | AES-GCM hoặc ChaCha20-Poly1305 |
| Toàn vẹn | Phát hiện giao dịch bị sửa | AEAD tag, HMAC-SHA256, chữ ký số |
| Xác thực | Biết giao dịch do đúng người gửi tạo | Chữ ký số RSA-PSS/ECDSA/Ed25519 |
| Chống chối bỏ | Người ký khó phủ nhận đã ký giao dịch | Chữ ký số và log |
| Chống replay | Giao dịch cũ không được xử lý lại | Nonce, timestamp, sequence, replay cache |
| Truy vết | Có bằng chứng khi kiểm tra sự cố | Transaction log, audit event |
| Sẵn sàng | Game vẫn phản hồi khi input sai | Xử lý lỗi rõ ràng, không crash |

## 8. Ý tưởng đầy đủ chức năng

### 8.1 Chế độ chơi chính

1. **Campaign Mode**
   - Người chơi đi qua chuỗi màn từ dễ đến khó.
   - Mỗi màn có câu chuyện, giao dịch, attack bot, lựa chọn phòng thủ và phần giải thích.
   - Level sau mở khi đạt đủ điểm level trước.

2. **Sandbox Mode**
   - Người chơi tự tạo giao dịch.
   - Tự bật/tắt AES-GCM, HMAC, chữ ký số, nonce, timestamp, replay cache.
   - Tự chọn kiểu tấn công và quan sát validator xử lý.

3. **Attack Lab**
   - Người chơi đóng vai attacker để thử sửa amount, replay message, thay key, thay signature.
   - Mục tiêu là hiểu attacker cần làm gì và defense nào chặn được.

4. **Defense Builder**
   - Người chơi kéo thả hoặc chọn "thẻ phòng thủ".
   - Mỗi thẻ có chi phí, hiệu quả, điều kiện dùng.
   - Ví dụ: `AES-GCM`, `HMAC-SHA256`, `Digital Signature`, `Nonce`, `Timestamp`, `Replay Cache`, `Key Fingerprint`, `Audit Log`.

5. **Crypto Inspector**
   - Hiển thị payload, canonical JSON, hash, signature, ciphertext, tag, nonce, key_id.
   - Cho phép so sánh trước/sau khi bị tấn công.

6. **Transaction History**
   - Lưu toàn bộ giao dịch và log xử lý trong game.
   - Có bộ lọc: hợp lệ, tamper, replay, wrong key, wrong signature, expired.

7. **Learning Notebook**
   - Mỗi khái niệm có giải thích ngắn, ví dụ, lỗi thường gặp và liên hệ với level.
   - Mở khóa dần theo màn chơi.

8. **Teacher/Test Report Mode**
   - Chạy bộ test bắt buộc.
   - Xuất bảng kết quả test để đưa vào báo cáo.
   - Có seed dữ liệu demo cho video.

### 8.2 Tính năng hay nên thêm

- **Replay Timeline**: xem giao dịch gốc và lần gửi lại trên timeline.
- **Diff Viewer**: tô màu trường bị sửa như `amount`, `to_account`, `timestamp`.
- **Security Grade**: chấm cấu hình phòng thủ từ D đến S.
- **Hint System**: gợi ý theo từng bước, dùng gợi ý bị trừ điểm.
- **Mistake Library**: lưu các lỗi người chơi từng mắc.
- **Achievement**:
  - "Integrity Guardian": chặn sửa số tiền không dùng hint.
  - "Replay Hunter": phát hiện replay trong một lần thử.
  - "Key Master": sửa lỗi dùng sai khóa.
  - "Forensic Analyst": đọc đúng log để xác định nguyên nhân.
- **Auto Report Export**: xuất Markdown/HTML test report.
- **Benchmark Panel**: đo thời gian ký, xác minh, mã hóa, giải mã trên dữ liệu demo.
- **Legacy Mode**: cho so sánh cấu hình yếu như AES-CBC không MAC hoặc DES minh họa, nhưng không dùng làm cấu hình chính.
- **Key Rotation Mission**: thay khóa định kỳ và xác minh `key_id` cũ/mới.
- **Expired Transaction Mission**: giao dịch quá hạn bị từ chối.
- **Nonce Reuse Warning**: mô phỏng nguy cơ dùng lại nonce trong AES-GCM.

## 9. Công nghệ sử dụng

Định hướng triển khai chính: **website full-stack dùng React/TypeScript, Node.js/Express và MySQL 8.x**.

### 9.1 Stack chính đề xuất

| Lớp | Công nghệ | Mục đích |
|---|---|---|
| Frontend | React 18 + TypeScript + Vite | Xây dựng Single-Page Application với cấu trúc Widget HUD |
| Routing | React Router v6 | Bảo vệ route, hỗ trợ trượt chuyển trang cơ khí |
| UI Styling | Tailwind CSS + Custom CSS | Tạo các lớp hiệu ứng scanline, grid, và neon glow |
| Animation Engine | **Framer Motion** | Xử lý hoạt họa co giãn thẻ bài, snap slot, quét laser |
| Interactive Graph | **HTML5 Canvas / SVG** | Vẽ Sơ đồ luồng photon Visual Attack Pipeline thời gian thực |
| Game Audio | **use-sound** (Web Audio API) | Cung cấp phản hồi xúc giác cơ học (click, alert, alarm) |
| State Client | Zustand | Lưu phiên chơi, điểm số và theme giao diện đang cấu hình |
| Form & Validation | React Hook Form + Zod | Validate form đăng ký, đăng nhập và tạo giao dịch |
| Backend API | Node.js 20+ + Express.js + TypeScript | Cung cấp REST API cho auth, game, transaction, report |
| ORM/Database access | Prisma ORM hoặc Sequelize | Kết nối MySQL, migration, model rõ ràng |
| Database | MySQL 8.x | Lưu user, session, tiến độ, giao dịch, log, test report |
| Authentication | JWT access token + refresh token hoặc server session | Đăng nhập, bảo vệ API, phân quyền |
| Password hashing | Argon2id hoặc bcrypt | Lưu mật khẩu an toàn, không lưu mật khẩu rõ |
| Crypto | Node.js `crypto` / Web Crypto API | AES-GCM, HMAC-SHA256, RSA-PSS/ECDSA/Ed25519 tùy thư viện hỗ trợ |
| Validation backend | Zod/Joi | Kiểm tra dữ liệu request trước khi xử lý |
| Test backend | Jest/Vitest + Supertest | Test API và test bảo mật bắt buộc |
| Test frontend | Playwright | Kiểm thử luồng đăng ký, đăng nhập, chơi level |
| Report | Markdown/HTML export | Sinh test report, benchmark report |
| DevOps local | Docker Compose | Chạy MySQL + backend + frontend dễ dàng |

### 9.2 Phiên bản công nghệ gợi ý

| Thành phần | Phiên bản gợi ý |
|---|---|
| Node.js | 20 LTS hoặc mới hơn |
| TypeScript | 5.x |
| React | 18.x |
| Vite | 5.x hoặc 6.x |
| Express | 4.x hoặc 5.x |
| MySQL | 8.0.x |
| Prisma | 5.x hoặc 6.x |
| bcrypt | 5.x hoặc dùng `argon2` |
| Jest/Vitest | bản mới ổn định |
| Playwright | bản mới ổn định |

### 9.3 Lý do chọn MySQL

- Phù hợp yêu cầu website có nhiều người dùng.
- Quản lý tốt quan hệ giữa user, phiên chơi, giao dịch, log, điểm và test report.
- Dễ cài trên XAMPP, Laragon, Docker hoặc server thật.
- Dễ viết báo cáo database bằng ERD, bảng dữ liệu và truy vấn SQL.
- Phù hợp cho hệ thống có đăng ký/đăng nhập, nhiều người chơi và bảng điểm theo tài khoản.

### 9.4 Cấu hình môi trường

File `.env` backend nên có:

```env
NODE_ENV=development
PORT=4000
DATABASE_URL=mysql://cyberbank_user:cyberbank_pass@localhost:3306/cyberbank_security_game
JWT_ACCESS_SECRET=change_me_access_secret
JWT_REFRESH_SECRET=change_me_refresh_secret
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL=7d
PASSWORD_HASH_ALGORITHM=argon2id
```

Lưu ý:

- Không commit `.env` thật lên GitHub.
- Chỉ commit `.env.example`.
- Không hard-code `JWT_SECRET`, database password hoặc crypto secret trong mã nguồn.

### 9.5 Công nghệ thay thế nếu nhóm muốn dùng C# hoặc Python

Nếu nhóm không dùng Node.js, vẫn giữ kiến trúc website + MySQL:

- C#: ASP.NET Core MVC/Web API + Entity Framework Core + MySQL + `System.Security.Cryptography`.
- Python: FastAPI + SQLAlchemy + MySQL + `cryptography` + pytest.
- Java: Spring Boot + Spring Security + MySQL + JCA/Bouncy Castle + JUnit.

## 10. Kiến trúc tổng quan

```mermaid
flowchart LR
    Player["Player / Sinh viên"] --> UI["Frontend Game UI"]
    Instructor["Instructor / Giảng viên"] --> UI

    UI --> API["Backend API"]
    API --> AuthService["Auth Service"]
    API --> GameEngine["Game Engine"]
    API --> TxService["Transaction Service"]
    API --> CryptoService["Crypto Service"]
    API --> ScoreService["Scoring Service"]
    API --> LogService["Log Service"]
    API --> ReportService["Report Service"]

    GameEngine --> AttackBot["Attack Bot"]
    TxService --> Validator["Bank Validator"]
    CryptoService --> Validator
    Validator --> ReplayGuard["Replay Guard"]
    Validator --> KeyManager["Key Manager"]

    AuthService --> DB[("MySQL Database")]
    ScoreService --> DB
    LogService --> DB
    TxService --> DB
    GameEngine --> DB
    ReportService --> DB

    TestRunner["Test Runner"] --> API
    ReportService --> TestReport["Test Report / Benchmark"]
```

## 11. Các module chính

| Module | Trách nhiệm |
|---|---|
| `AuthService` | Đăng ký, đăng nhập, đăng xuất, refresh token, đổi mật khẩu, phân quyền |
| `GameEngine` | Quản lý level, nhiệm vụ, trạng thái thắng/thua, unlock level |
| `AttackBot` | Tạo biến thể giao dịch bị sửa tiền, replay, sai chữ ký, sai khóa |
| `TransactionService` | Tạo giao dịch, lưu attempt, gửi qua validator |
| `CryptoService` | Hash, HMAC, AES-GCM, ký và xác minh chữ ký |
| `Validator` | Kiểm tra pipeline bảo mật trước khi chấp nhận giao dịch |
| `ReplayGuard` | Kiểm tra `message_id`, `nonce`, `sequence_no`, timestamp |
| `KeyManager` | Quản lý key_id, public key, fingerprint, trạng thái khóa |
| `ScoreService` | Tính điểm, bonus, penalty, achievement |
| `LogService` | Ghi transaction log và audit log đã loại bỏ secret |
| `LearningService` | Trả về giải thích học thuật theo concept |
| `ReportService` | Xuất test report, benchmark report, game summary |
| `TestRunner` | Chạy test bắt buộc cho báo cáo |

## 11.1 Luồng đăng ký, đăng nhập và bảo vệ website

Website cần có hệ thống tài khoản vì người chơi phải lưu tiến độ, điểm, lịch sử giao dịch và test report.

### Đăng ký

1. Người dùng nhập họ tên, email, mật khẩu và xác nhận mật khẩu.
2. Frontend kiểm tra định dạng email, độ dài mật khẩu và xác nhận mật khẩu.
3. Backend kiểm tra email chưa tồn tại.
4. Backend hash mật khẩu bằng Argon2id hoặc bcrypt.
5. Backend tạo bản ghi `users`, tạo `player_profiles` mặc định và có thể tạo session đầu tiên.
6. Backend trả về thông tin user an toàn, không trả `password_hash`.

### Đăng nhập

1. Người dùng nhập email và mật khẩu.
2. Backend tìm user theo email.
3. Backend so sánh mật khẩu nhập vào với `password_hash`.
4. Nếu đúng, backend tạo access token ngắn hạn và refresh token dài hạn.
5. Refresh token được lưu dạng hash trong MySQL để có thể thu hồi.
6. Frontend lưu access token trong memory hoặc dùng httpOnly cookie tùy cách triển khai.
7. Người dùng được chuyển vào Dashboard/Campaign.

### Đăng xuất

1. Frontend gọi API logout.
2. Backend thu hồi refresh token/session trong database.
3. Frontend xóa trạng thái đăng nhập.
4. Người dùng quay về màn hình đăng nhập.

### Bảo vệ route

Các route sau yêu cầu đăng nhập:

- `/dashboard`
- `/campaign`
- `/levels/:id`
- `/sandbox`
- `/history`
- `/notebook`
- `/test-report`
- `/profile`

Các route dành cho admin/giảng viên cần kiểm tra role:

- `/admin/users`
- `/admin/levels`
- `/admin/reports`
- `/instructor/scoreboard`

### Chính sách mật khẩu

- Tối thiểu 8 ký tự.
- Nên có chữ hoa, chữ thường, số hoặc ký tự đặc biệt.
- Không lưu mật khẩu rõ.
- Không log mật khẩu.
- Không trả thông báo quá chi tiết như "email tồn tại nhưng mật khẩu sai"; chỉ trả "email hoặc mật khẩu không đúng".

## 12. Mô hình giao dịch bảo mật

### 12.1 Payload gốc

Payload giao dịch được chuẩn hóa trước khi hash/ký. Chuẩn hóa giúp tránh lỗi cùng một dữ liệu nhưng khác thứ tự field.

```json
{
  "tx_id": "tx_001",
  "from_account": "CB-1001",
  "to_account": "CB-2002",
  "amount": 1000000,
  "currency": "VND",
  "memo": "Thanh toán học phí",
  "created_at": "2026-05-18T07:00:00Z",
  "expires_at": "2026-05-18T07:05:00Z",
  "session_id": "sess_abc",
  "message_id": "msg_001",
  "nonce": "base64url-random-96-bit",
  "sequence_no": 1
}
```

### 12.2 Envelope gửi đi

```json
{
  "version": "2.0",
  "algorithm": {
    "aead": "AES-256-GCM",
    "signature": "Ed25519",
    "hash": "SHA-256"
  },
  "key_id": "client-key-2026-01",
  "public_key_fingerprint": "SHA256:abc123...",
  "aad": {
    "tx_id": "tx_001",
    "session_id": "sess_abc",
    "message_id": "msg_001",
    "sequence_no": 1
  },
  "ciphertext": "base64...",
  "tag": "base64...",
  "signature": "base64...",
  "payload_hash": "hex..."
}
```

### 12.3 Quy tắc ký

Chữ ký phải bao phủ toàn bộ dữ liệu quan trọng:

- `tx_id`
- `from_account`
- `to_account`
- `amount`
- `currency`
- `created_at`
- `expires_at`
- `session_id`
- `message_id`
- `nonce`
- `sequence_no`
- `payload_hash`

Không được chỉ ký một phần như `from_account` hoặc `amount`. Nếu ký thiếu field, attacker có thể sửa field không được ký.

### 12.4 Quy tắc mã hóa

Đề xuất dùng AES-GCM:

- Key: 256 bit, sinh từ thư viện chuẩn hoặc dẫn xuất từ session key.
- Nonce/IV: 96 bit ngẫu nhiên, không dùng lại với cùng key.
- AAD: metadata không mã hóa nhưng cần toàn vẹn, ví dụ `tx_id`, `session_id`, `message_id`, `sequence_no`.
- Tag: dùng để phát hiện dữ liệu bị sửa hoặc dùng sai khóa.

Trong game có thể cho người chơi so sánh:

- AES-GCM đúng: sửa ciphertext hoặc AAD làm xác minh tag thất bại.
- AES-CBC không MAC: chỉ minh họa legacy, không dùng làm chế độ bảo mật chính.

## 13. Pipeline xác minh giao dịch

```mermaid
flowchart TD
    A["Nhận transaction envelope"] --> B["Kiểm tra định dạng và version"]
    B --> C["Kiểm tra session_id"]
    C --> D["Kiểm tra timestamp/expires_at"]
    D --> E["Kiểm tra message_id/nonce/sequence trong replay cache"]
    E --> F["Lấy public key/encryption key theo key_id"]
    F --> G["Xác minh AES-GCM tag hoặc HMAC"]
    G --> H["Giải mã payload nếu cần"]
    H --> I["Canonicalize payload và tính hash"]
    I --> J["Xác minh chữ ký số"]
    J --> K["Kiểm tra nghiệp vụ: tài khoản, số dư, hạn mức"]
    K --> L["Ghi log an toàn"]
    L --> M{"Hợp lệ?"}
    M -- "Có" --> N["Chấp nhận giao dịch và cộng điểm"]
    M -- "Không" --> O["Từ chối, ghi lý do, hiển thị giải thích"]
```

Quy tắc quan trọng:

- Replay check phải chạy trước khi ghi nhận giao dịch thành công, nhưng chỉ đánh dấu `message_id` đã xử lý khi envelope qua được các kiểm tra tối thiểu.
- Không ghi plaintext nhạy cảm, khóa bí mật, token hoặc private key vào log.
- Mọi lỗi xác minh phải trả về thông báo học thuật rõ ràng, không làm app crash.

## 14. Sequence xử lý một màn chơi

```mermaid
sequenceDiagram
    participant P as Player
    participant UI as Game UI
    participant API as Backend API
    participant GE as Game Engine
    participant AB as Attack Bot
    participant V as Bank Validator
    participant DB as Database

    P->>UI: Chọn level và tạo giao dịch
    UI->>API: POST /sessions/:id/levels/:levelId/start
    API->>GE: Load scenario
    GE->>DB: Lấy level, defense options, concept
    DB-->>GE: Scenario data
    GE-->>UI: Payload gốc, nhiệm vụ, defense cards
    P->>UI: Chọn defense
    UI->>API: POST /attempts
    API->>AB: Áp dụng attack theo level
    AB-->>API: Envelope đã bị tấn công hoặc hợp lệ
    API->>V: Validate envelope + selected defenses
    V->>DB: Ghi transaction_attempt, replay_cache, logs
    V-->>API: Kết quả, lý do, điểm
    API-->>UI: Result + explanation + log
    UI-->>P: Hiển thị pass/fail, điểm, bài học
```

## 15. Thiết kế level

| Level | Tên màn | Tình huống | Tấn công | Phòng thủ cần chọn | Kết quả học tập |
|---|---|---|---|---|---|
| 1 | Giao dịch hợp lệ | Chuyển 1.000.000 VND đúng người nhận | Không tấn công | Ký đúng + key đúng + log | Hiểu luồng giao dịch an toàn cơ bản |
| 2 | Số tiền bị sửa | Attacker đổi `amount` từ 1.000.000 thành 100.000.000 | Tampering | Chữ ký số hoặc HMAC/AEAD tag bao phủ `amount` | Mã hóa không đủ nếu thiếu toàn vẹn |
| 3 | Giao dịch cũ quay lại | Attacker gửi lại envelope đã được xử lý | Replay | Nonce/message_id/sequence + replay cache + timestamp | Dữ liệu hợp lệ cũ vẫn nguy hiểm |
| 4 | Chữ ký giả | Attacker thay chữ ký hoặc ký bằng khóa khác | Forged signature | Verify signature bằng public key đúng, kiểm tra key_id/fingerprint | Xác thực nguồn gửi |
| 5 | Dùng sai khóa giải mã | Validator dùng nhầm encryption key | Wrong key | Key manager + AEAD tag failure + key_id | Sai khóa phải bị phát hiện, không giải mã mù |
| 6 | Giao dịch hết hạn | Payload quá thời gian `expires_at` | Expired transaction | Timestamp + TTL policy | Giới hạn thời gian giảm replay và gian lận |
| 7 | Nonce bị dùng lại | Hai giao dịch AES-GCM dùng cùng nonce/key | Nonce reuse | Nonce uniqueness check | Không dùng lại nonce với AEAD |
| 8 | Điều tra log | Có nhiều attempt thất bại, cần tìm nguyên nhân | Forensics | Audit log + filter + timeline | Truy vết và báo cáo sự cố |

4 level đầu đáp ứng yêu cầu bắt buộc. Level 5-8 là phần nâng cấp để sản phẩm nổi bật hơn khi demo.

## 16. Cơ chế tính điểm

Mỗi level có tối đa 100 điểm.

| Hành động | Điểm |
|---|---:|
| Chọn đúng defense chính | +50 |
| Chọn đủ defense phụ | +20 |
| Giải thích đúng nguyên nhân trong quiz ngắn | +15 |
| Hoàn thành trong lần thử đầu | +10 |
| Đọc log và chọn đúng dòng bằng chứng | +5 |
| Dùng hint cấp 1 | -5 |
| Dùng hint cấp 2 | -10 |
| Chọn defense thừa nhưng không gây lỗi | -5 |
| Chọn defense sai làm attack thành công | -20 |

Công thức:

```text
final_score = max(0, base_score + bonus - penalty)
```

Điểm tổng của session được tính từ `score_events`, không sửa trực tiếp một con số duy nhất. Cách này giúp truy vết điểm và tránh gian lận trong game.

## 17. Cơ chế giải thích sau mỗi màn

Mỗi kết quả gồm 4 phần:

1. **Kết luận**: giao dịch được chấp nhận hay bị từ chối.
2. **Bằng chứng kỹ thuật**: field nào sai, log nào cho thấy lỗi.
3. **Khái niệm học thuật**: khái niệm bảo mật liên quan.
4. **Cách phòng thủ đúng**: người chơi cần chọn gì ở lần sau.

Ví dụ level sửa số tiền:

- Kết luận: giao dịch bị từ chối.
- Bằng chứng: `payload_hash` sau khi sửa amount không khớp chữ ký.
- Khái niệm: tính toàn vẹn bảo đảm dữ liệu không bị thay đổi trái phép.
- Phòng thủ đúng: ký toàn bộ canonical payload hoặc dùng HMAC/AEAD tag bao phủ amount.

## 18. Log lịch sử giao dịch

Log trong game cần đủ để học và kiểm thử:

| Trường | Ví dụ | Ghi chú |
|---|---|---|
| `event_id` | `log_001` | ID log |
| `session_id` | `sess_abc` | Phiên chơi |
| `tx_id` | `tx_001` | Giao dịch |
| `attempt_id` | `att_001` | Lần thử |
| `event_type` | `SIGNATURE_INVALID` | Loại sự kiện |
| `severity` | `WARN` | INFO/WARN/ERROR/SECURITY |
| `message` | `Signature verification failed` | Không chứa secret |
| `safe_context` | `{ "key_id": "client-key-2026-01" }` | Đã ẩn dữ liệu nhạy cảm |
| `created_at` | ISO datetime | Thời điểm |

Các loại log bắt buộc:

- `SESSION_CREATED`
- `TRANSACTION_CREATED`
- `PAYLOAD_ENCRYPTED`
- `SIGNATURE_CREATED`
- `VALIDATION_STARTED`
- `AEAD_TAG_INVALID`
- `SIGNATURE_INVALID`
- `REPLAY_DETECTED`
- `WRONG_KEY`
- `TRANSACTION_ACCEPTED`
- `TRANSACTION_REJECTED`
- `SCORE_UPDATED`

## 19. Test case bắt buộc

| Mã test | Tên test | Input | Kỳ vọng |
|---|---|---|---|
| TC01 | Giao dịch hợp lệ | Payload đúng, key đúng, signature đúng | Accepted, cộng điểm, log success |
| TC02 | Sửa số tiền | Amount bị đổi sau khi ký | Rejected, log tamper/signature invalid |
| TC03 | Gửi lại giao dịch cũ | Dùng lại `message_id` hoặc `nonce` | Rejected, log replay detected |
| TC04 | Dùng sai chữ ký | Signature bị thay hoặc ký bằng private key khác | Rejected, log signature invalid |
| TC05 | Dùng sai khóa | `key_id` sai hoặc AES key sai | Rejected, log wrong key/tag invalid |
| TC06 | Điểm và giải thích | Hoàn thành/fail level | Score đúng, explanation hiển thị đúng |

Test nâng cao nên có:

- Giao dịch hết hạn.
- Nonce reuse.
- Thiếu timestamp.
- Thiếu log.
- Public key bị thay.
- Ký thiếu trường `amount`.

## 20. Hướng dẫn học thuật ngắn cho từng khái niệm

| Khái niệm | Giải thích ngắn | Dùng trong màn |
|---|---|---|
| Hash | Hàm tạo dấu vân tay dữ liệu; dữ liệu đổi thì hash đổi | Level 2 |
| HMAC | Hash có khóa bí mật, dùng kiểm tra toàn vẹn và xác thực thông điệp | Level 2 |
| AES-GCM | Mã hóa có xác thực, vừa giữ bí mật vừa phát hiện sửa đổi | Level 1, 2, 5, 7 |
| Chữ ký số | Người gửi ký bằng private key, người nhận xác minh bằng public key | Level 1, 2, 4 |
| Nonce | Giá trị dùng một lần để phân biệt message | Level 3, 7 |
| Timestamp/TTL | Thời điểm tạo và hết hạn của giao dịch | Level 3, 6 |
| Replay cache | Danh sách message đã xử lý để chặn gửi lại | Level 3 |
| Key fingerprint | Dấu vân tay public key để phát hiện nhầm khóa | Level 4, 5 |
| Audit log | Bản ghi sự kiện phục vụ truy vết | Level 8 |

## 21. Cấu trúc thư mục đề xuất

```text
cyberbank-security-game/
  README.md
  .env.example
  docker-compose.yml
  package.json
  docs/
    thiet-ke-he-thong.md
    thiet-ke-giao-dien.md
    thiet-ke-database.md
    threat-model.md
    test-report.md
    benchmark.md
  src/
    frontend/
      src/
        api/
        auth/
        components/
        screens/
        routes/
        styles/
        stores/
        types/
      index.html
      vite.config.ts
      package.json
    backend/
      src/
        app.ts
        server.ts
        config/
        modules/
          auth/
          users/
          game/
          crypto/
          transactions/
          scoring/
          logging/
          reports/
          tests/
        middleware/
        database/
        utils/
      prisma/
        schema.prisma
        migrations/
        seed.ts
      package.json
  tests/
    valid-transaction.test.ts
    tamper-amount.test.ts
    replay-transaction.test.ts
    invalid-signature.test.ts
    wrong-key.test.ts
    scoring-explanation.test.ts
  sample_data/
    levels.seed.json
    accounts.seed.json
    defense-options.seed.json
  report/
    report.pdf
    figures/
  video/
    demo-script.md
```

## 22. API đề xuất

| Method | Endpoint | Mục đích |
|---|---|---|
| `POST` | `/api/auth/register` | Đăng ký tài khoản |
| `POST` | `/api/auth/login` | Đăng nhập |
| `POST` | `/api/auth/logout` | Đăng xuất và thu hồi refresh token |
| `POST` | `/api/auth/refresh` | Cấp access token mới |
| `GET` | `/api/auth/me` | Lấy thông tin người dùng hiện tại |
| `PATCH` | `/api/auth/change-password` | Đổi mật khẩu |
| `GET` | `/api/users/me/profile` | Lấy hồ sơ người chơi |
| `PATCH` | `/api/users/me/profile` | Cập nhật hồ sơ |
| `POST` | `/api/sessions` | Tạo phiên chơi |
| `GET` | `/api/levels` | Lấy danh sách level |
| `GET` | `/api/levels/:id` | Lấy chi tiết level |
| `POST` | `/api/levels/:id/start` | Bắt đầu level |
| `POST` | `/api/attempts` | Gửi lựa chọn defense và chạy validation |
| `GET` | `/api/sessions/:id/logs` | Lấy log phiên |
| `GET` | `/api/sessions/:id/score` | Lấy điểm |
| `GET` | `/api/sessions/:id/history` | Lấy lịch sử giao dịch |
| `POST` | `/api/sandbox/run` | Chạy mô phỏng tùy chỉnh |
| `POST` | `/api/tests/run` | Chạy test bắt buộc |
| `GET` | `/api/reports/test` | Xuất test report |
| `GET` | `/api/instructor/scoreboard` | Giảng viên xem bảng điểm |
| `POST` | `/api/admin/levels` | Admin tạo level mới |
| `PATCH` | `/api/admin/levels/:id` | Admin cập nhật level |

### 22.1 Quy ước response API

Response thành công:

```json
{
  "success": true,
  "data": {},
  "message": "OK"
}
```

Response lỗi:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_SIGNATURE",
    "message": "Chữ ký giao dịch không hợp lệ"
  }
}
```

Các mã lỗi chính:

| Error code | Ý nghĩa |
|---|---|
| `AUTH_REQUIRED` | Chưa đăng nhập |
| `FORBIDDEN` | Không đủ quyền |
| `INVALID_CREDENTIALS` | Email hoặc mật khẩu không đúng |
| `EMAIL_ALREADY_EXISTS` | Email đã được đăng ký |
| `VALIDATION_ERROR` | Dữ liệu nhập không hợp lệ |
| `INVALID_SIGNATURE` | Chữ ký giao dịch sai |
| `WRONG_KEY` | Key không hợp lệ hoặc sai fingerprint |
| `REPLAY_DETECTED` | Giao dịch bị gửi lại |
| `TRANSACTION_EXPIRED` | Giao dịch quá hạn |
| `INTEGRITY_FAILED` | Hash/HMAC/AEAD tag không hợp lệ |

## 23. Threat model tóm tắt

| Tác nhân | Khả năng | Mục tiêu | Biện pháp |
|---|---|---|---|
| Network Attacker | Đọc, sửa, gửi lại envelope | Tăng tiền, chuyển sai người, replay | AES-GCM, signature, nonce, timestamp |
| Malicious Player | Chọn defense sai hoặc cố gian lận điểm | Làm attack pass hoặc sửa score | Score events, validation server-side |
| Key Confusion Attacker | Thay `key_id` hoặc public key | Làm hệ thống xác minh nhầm | Key fingerprint, key registry |
| Log Snooper | Xem log | Tìm secret | Redaction, không log key/password |
| Replay Attacker | Gửi lại giao dịch hợp lệ | Trừ tiền nhiều lần | Replay cache, sequence, TTL |

## 24. Tiêu chí hoàn thành

Sản phẩm được xem là đáp ứng đề tài khi có:

- Source code game chạy được.
- Ít nhất 4 màn bắt buộc: hợp lệ, sửa số tiền, replay, giả mạo chữ ký hoặc khóa sai.
- Người chơi phải chọn hoặc cấu hình phòng thủ.
- Mỗi màn có giải thích tấn công thành công/thất bại.
- Có tính điểm và lưu lịch sử.
- Có log giao dịch trong game.
- Có hướng dẫn học thuật ngắn.
- Có test cho: valid, tamper amount, replay, invalid signature, wrong key, scoring/explanation.
- Có README hướng dẫn chơi.
- Có báo cáo mô tả kiến thức bảo mật.
- Có video demo gameplay.
- Có test report.

## 25. Lộ trình triển khai

| Giai đoạn | Việc cần làm | Kết quả |
|---|---|---|
| 1 | Khởi tạo monorepo, cấu hình React, Express, TypeScript, MySQL, Prisma | Website chạy local và kết nối database |
| 2 | Xây dựng đăng ký, đăng nhập, đăng xuất, refresh token, phân quyền | User có thể tạo tài khoản và vào dashboard |
| 3 | Tạo database schema, migration, seed level, seed defense | Có dữ liệu nền trong MySQL |
| 4 | Làm crypto service và validator | Test valid/tamper/replay pass |
| 5 | Làm UI gameplay level | Người chơi chọn defense và xem kết quả |
| 6 | Làm scoring/log/history gắn với tài khoản | Có điểm và lịch sử giao dịch theo user |
| 7 | Làm explanation/learning notebook | Có phần học thuật |
| 8 | Làm sandbox và report export | Demo và báo cáo tốt hơn |
| 9 | Viết test report, benchmark, video script | Hoàn thiện sản phẩm nộp |

## 26. Danh sách file code nên có khi triển khai website

### Frontend

| File/thư mục | Nội dung |
|---|---|
| `src/frontend/src/main.tsx` | Điểm vào React |
| `src/frontend/src/routes/AppRoutes.tsx` | Khai báo route public/private/admin |
| `src/frontend/src/auth/AuthProvider.tsx` | Quản lý trạng thái đăng nhập |
| `src/frontend/src/auth/ProtectedRoute.tsx` | Chặn route nếu chưa đăng nhập |
| `src/frontend/src/api/httpClient.ts` | Axios/fetch client, gắn access token |
| `src/frontend/src/api/authApi.ts` | Gọi API register/login/logout/me |
| `src/frontend/src/screens/LoginPage.tsx` | Màn đăng nhập |
| `src/frontend/src/screens/RegisterPage.tsx` | Màn đăng ký |
| `src/frontend/src/screens/DashboardPage.tsx` | Dashboard sau đăng nhập |
| `src/frontend/src/screens/CampaignPage.tsx` | Danh sách level |
| `src/frontend/src/screens/GameplayPage.tsx` | Chơi level |
| `src/frontend/src/screens/SandboxPage.tsx` | Lab thử giao dịch |
| `src/frontend/src/screens/HistoryPage.tsx` | Lịch sử giao dịch |
| `src/frontend/src/screens/TestReportPage.tsx` | Chạy test report |
| `src/frontend/src/components/DefenseCard.tsx` | Thẻ bài phòng thủ mật mã (Holocard style) |
| `src/frontend/src/components/VisualAttackPipeline.tsx` | Hoạt họa SVG photon chạy dòng chảy giao dịch |
| `src/frontend/src/components/HexMatrixViewer.tsx` | Trình kết xuất mã thô Hex code của gói tin |
| `src/frontend/src/components/SoundFXController.tsx` | Trình quản lý hiệu ứng âm thanh click và cảnh báo an ninh |
| `src/frontend/src/components/CryptoInspector.tsx` | Xem chi tiết hash/signature/ciphertext |
| `src/frontend/src/components/LogConsole.tsx` | Bảng Terminal in log typewriter tự động cuộn |

### Backend

| File/thư mục | Nội dung |
|---|---|
| `src/backend/src/server.ts` | Start HTTP server |
| `src/backend/src/app.ts` | Cấu hình Express middleware/router |
| `src/backend/src/config/env.ts` | Đọc biến môi trường |
| `src/backend/src/modules/auth/auth.routes.ts` | Route đăng ký/đăng nhập |
| `src/backend/src/modules/auth/auth.service.ts` | Logic hash mật khẩu, token, session |
| `src/backend/src/modules/auth/auth.middleware.ts` | Xác thực JWT/session |
| `src/backend/src/modules/users/user.service.ts` | Hồ sơ user/player |
| `src/backend/src/modules/game/game.routes.ts` | API campaign/level |
| `src/backend/src/modules/crypto/crypto.service.ts` | AES-GCM, HMAC, chữ ký số |
| `src/backend/src/modules/transactions/transaction.service.ts` | Tạo và gửi giao dịch |
| `src/backend/src/modules/transactions/validator.service.ts` | Validate giao dịch |
| `src/backend/src/modules/scoring/scoring.service.ts` | Tính điểm |
| `src/backend/src/modules/logging/logging.service.ts` | Ghi log an toàn |
| `src/backend/src/modules/reports/report.service.ts` | Xuất test report |
| `src/backend/prisma/schema.prisma` | Schema MySQL |
| `src/backend/prisma/seed.ts` | Seed level, defense, concept, test case |
