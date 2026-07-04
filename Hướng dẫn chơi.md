# 📖 HƯỚNG DẪN CHƠI – CYBERBANK SECURITY GAME v2.0

> **Mô tả:** Trò chơi mô phỏng bảo mật ngân hàng trực tuyến. Bạn đóng vai **Operator An Ninh** bảo vệ hệ thống trước các cuộc tấn công mật mã thực tế từ Hacker (Attacker Bot).

---

## 🎮 TỔNG QUAN

| Mục | Thông tin |
|-----|-----------|
| Số màn chơi | **15 màn** (từ Dễ → Ác Mộng) |
| Thẻ bài phòng thủ | **7 thẻ bài** (Chữ ký số, AES-GCM, Nonce, Timestamp/TTL, Replay Cache, Key Fingerprint, Secure Audit Log) |
| Điểm tối đa | **~1700 pts** (nếu hoàn thành toàn bộ) |
| Nhạc nền | Cyberpunk Synthwave (Web Audio API synthesizer) |
| Âm thanh FX | Click, Chọn thẻ, Báo động, Thành công |

---

## ⚙️ 4 BƯỚC CHƠI CƠ BẢN

### Bước 1: Đọc Tình Huống Tấn Công
- Mỗi màn chơi hiển thị mô tả chi tiết về **loại tấn công** đang diễn ra.
- Xem cảnh báo từ hệ thống: Replay Attack, Tampering, Invalid Signature, Wrong Key...
- Quan sát **sơ đồ pipeline mạng** (Alice → Attacker Bot MITM → Bank Validator) để hiểu điểm yếu.

### Bước 2: Phân Tích Thẻ Bài
- Mỗi thẻ bài có mô tả ngắn gọn về chức năng.
- Đọc kỹ để biết **thẻ nào chống được loại tấn công nào**.
- Xem tab "Giải Thích Thẻ Bài" trong trang Hướng Dẫn để tham khảo chi tiết.

### Bước 3: Chọn Thẻ Bài Chính Xác
> ⚠️ **QUAN TRỌNG NHẤT**: Phải chọn ĐÚNG các thẻ cần thiết!
- ✅ Chọn đủ thẻ cần thiết theo kịch bản.
- ❌ Thiếu thẻ → Hệ thống không phát hiện được tấn công → Thất bại.
- ❌ Thừa thẻ không liên quan → Bị trừ điểm.
- Tối đa chọn được **4 thẻ** mỗi lượt.

### Bước 4: Kích Hoạt Xác Minh & Xem Báo Cáo
- Bấm nút **"KÍCH HOẠT XÁC MINH GIAO DỊCH"** màu xanh lớn.
- Hệ thống quét sẽ chạy với hiệu ứng typewriter log.
- **Còi đỏ** = Thất bại (BREACH DETECTED) | **Âm thành công** = Thành công (ATTACK NEUTRALIZED).
- Bấm **"Xem Báo Cáo Pháp Y"** để đọc giải thích học thuật và nhận điểm thưởng.

---

## 🃏 7 THẺ BÀI PHÒNG THỦ

| Thẻ bài | Chức năng | Chống tấn công |
|---------|-----------|----------------|
| **Chữ ký số** | RSA-PSS xác minh danh tính người gửi và toàn vẹn dữ liệu | AMOUNT_TAMPERING, INVALID_SIGNATURE, giả mạo |
| **AES-GCM** | Mã hóa AEAD, GCM Tag xác thực toàn vẹn ciphertext | Nghe trộm, WRONG_KEY, tampering trên ciphertext |
| **Nonce** | Số ngẫu nhiên dùng 1 lần, phát hiện gói tin đã xử lý | REPLAY ATTACK, Nonce brute-force |
| **Timestamp/TTL** | Kiểm tra thời hạn giao dịch (thường 5 phút) | DELAY ATTACK, EXPIRED_TRANSACTION, Replay cũ |
| **Replay Cache** | Bộ đệm ghi nhớ message_id đã xử lý | REPLAY ATTACK, gửi lại trùng lặp |
| **Key Fingerprint** | Kiểm tra dấu vân tay và trạng thái ACTIVE/REVOKED của khóa | INVALID_SIGNATURE, REVOKED_KEY, WRONG_KEY |
| **Secure Audit Log** | Nhật ký bất biến ghi lại mọi sự kiện bảo mật | Hỗ trợ compliance, điều tra pháp y |

---

## 🗺️ DANH SÁCH 15 MÀN CHƠI

### 🟢 LEVEL 1 – Giao Dịch Hợp Lệ `[DỄ | +100 PTS]`
**Tình huống:** Giao dịch thông thường không bị tấn công. Thiết lập bảo mật tiêu chuẩn.  
**Thẻ cần chọn:** `Chữ ký số`, `AES-GCM`, `Secure Audit Log`  
**Mẹo:** Màn tutorial — chọn bộ 3 thẻ cơ bản nhất.

---

### 🟡 LEVEL 2 – Can Thiệp Tài Khoản Nhận `[DỄ | +100 PTS]`
**Tình huống:** Hacker thay tài khoản người nhận từ Bob sang tài khoản giả mạo.  
**Thẻ cần chọn:** `Chữ ký số`, `AES-GCM`  
**Mẹo:** Chữ ký số bảo vệ toàn bộ payload kể cả `to_account`. GCM Tag xác thực ciphertext.

---

### 🟡 LEVEL 3 – Số Tiền Bị Sửa (Tampering) `[TRUNG BÌNH | +100 PTS]`
**Tình huống:** Hacker đổi số tiền từ 1 triệu → 100 triệu mà không có khóa bí mật của Alice.  
**Thẻ cần chọn:** `Chữ ký số`, `AES-GCM`  
**Mẹo:** Bất kỳ thay đổi nào trong payload đều bị chữ ký số phát hiện ngay lập tức.

---

### 🟡 LEVEL 4 – Replay Giao Dịch Cũ `[TRUNG BÌNH | +100 PTS]`
**Tình huống:** Hacker chụp gói tin hợp lệ cũ và gửi lại y hệt nhiều lần để rút tiền.  
**Thẻ cần chọn:** `Nonce`, `Timestamp/TTL`, `Replay Cache`  
**Mẹo:** Bộ ba vàng chống Replay: Nonce + Timestamp/TTL + Replay Cache.

---

### 🔴 LEVEL 5 – Giả Mạo Chữ Ký `[TRUNG BÌNH | +100 PTS]`
**Tình huống:** Hacker dùng khóa RSA tự chế để ký gói tin, mạo danh chữ ký của Alice.  
**Thẻ cần chọn:** `Chữ ký số`, `Key Fingerprint`  
**Mẹo:** Key Fingerprint đối chiếu hash định danh khóa — phát hiện ngay khóa giả.

---

### 🔴 LEVEL 6 – Dùng Sai Khóa Mã Hóa `[KHÓ | +120 PTS]`
**Tình huống:** Hacker chèn `key_id` không hợp lệ để phá hoại giải mã AEAD.  
**Thẻ cần chọn:** `AES-GCM`, `Key Fingerprint`  
**Mẹo:** Key Fingerprint kiểm tra key_id tồn tại. AES-GCM Tag sẽ báo lỗi nếu khóa sai.

---

### 🟡 LEVEL 7 – Tấn Công Trễ Gói Tin `[TRUNG BÌNH | +100 PTS]`
**Tình huống:** Hacker giữ gói tin vài phút rồi mới chuyển đến ngân hàng sau khi hết hạn.  
**Thẻ cần chọn:** `Timestamp/TTL`, `Nonce`  
**Mẹo:** Timestamp/TTL phát hiện giao dịch đã quá 5 phút.

---

### 🟡 LEVEL 8 – Nghe Trộm Đường Truyền `[TRUNG BÌNH | +100 PTS]`
**Tình huống:** Hacker cài thiết bị nghe lén, thu thập dữ liệu nhưng không sửa gói tin.  
**Thẻ cần chọn:** `AES-GCM`, `Key Fingerprint`, `Secure Audit Log`  
**Mẹo:** Mã hóa AES-GCM bảo mật dữ liệu trên đường truyền. Audit Log ghi mọi truy cập.

---

### 🟡 LEVEL 9 – Sửa Đổi Metadata `[TRUNG BÌNH | +110 PTS]`
**Tình huống:** Hacker thay đổi `session_id`, `message_id`, `sequence_no` để gây nhầm lẫn hệ thống.  
**Thẻ cần chọn:** `Chữ ký số`, `Nonce`, `Replay Cache`  
**Mẹo:** Chữ ký số bảo vệ cả metadata trong payload. Nonce + Replay Cache ngăn tái sử dụng.

---

### 🔴 LEVEL 10 – Vét Cạn Nonce (Brute-force) `[KHÓ | +130 PTS]`
**Tình huống:** Hacker gửi hàng nghìn gói tin với Nonce thử sai để tìm Nonce hợp lệ.  
**Thẻ cần chọn:** `Nonce`, `Replay Cache`, `Timestamp/TTL`  
**Mẹo:** Replay Cache ghi nhớ Nonce đã dùng. Timestamp/TTL giới hạn khung thời gian tấn công.

---

### 🔴 LEVEL 11 – Replay Có Sửa Đổi `[KHÓ | +150 PTS]`
**Tình huống:** Hacker chụp gói tin cũ, sửa đổi số tiền rồi phát lại — kết hợp cả Replay + Tampering.  
**Thẻ cần chọn:** `Chữ ký số`, `Nonce`, `Replay Cache`, `Timestamp/TTL`  
**Mẹo:** Cần đủ 4 thẻ — Chữ ký số phát hiện sửa đổi, bộ 3 còn lại ngăn phát lại.

---

### 🔴 LEVEL 12 – Giả Lập Máy Chủ Ngân Hàng `[KHÓ | +140 PTS]`
**Tình huống:** Hacker dựng máy chủ ngân hàng giả mạo và tạo giao dịch "hợp lệ" từ đó.  
**Thẻ cần chọn:** `Chữ ký số`, `Key Fingerprint`  
**Mẹo:** Key Fingerprint xác minh danh tính chính xác của máy chủ ngân hàng thực.

---

### 🔴 LEVEL 13 – Sử Dụng Khóa Bị Thu Hồi `[KHÓ | +130 PTS]`
**Tình huống:** Hacker dùng khóa RSA cũ đã bị thu hồi (status = REVOKED) để ký giao dịch.  
**Thẻ cần chọn:** `Key Fingerprint`, `Secure Audit Log`  
**Mẹo:** Key Fingerprint kiểm tra trạng thái ACTIVE/REVOKED. Audit Log ghi nhận vi phạm.

---

### 🔴 LEVEL 14 – Phá Mã AES Yếu `[KHÓ | +150 PTS]`
**Tình huống:** IV (Initialization Vector) bị tái sử dụng, làm lộ khóa AES đối xứng.  
**Thẻ cần chọn:** `AES-GCM`, `Key Fingerprint`, `Nonce`  
**Mẹo:** AES-GCM đảm bảo IV duy nhất mỗi lần (qua Nonce). Key Fingerprint xác minh chuẩn khóa.

---

### 💀 LEVEL 15 – Tấn Công Tổng Lực (BOSS FIGHT) `[ÁC MỘNG | +200 PTS]`
**Tình huống:** Hacker kết hợp toàn bộ kỹ thuật: Tampering + Replay + Invalid Signature + Revoked Key đồng thời!  
**Thẻ cần chọn:** `Chữ ký số`, `AES-GCM`, `Nonce`, `Replay Cache`, `Timestamp/TTL`, `Key Fingerprint`, `Secure Audit Log`  
**Mẹo:** ⚠️ BOSS FIGHT — Cần chọn ĐÚNG TẤT CẢ thẻ cần thiết. Sai một thẻ dư hoặc thiếu = THẤT BẠI!

---

## 🏆 HỆ THỐNG DANH HIỆU (RANK)

| Điểm | Danh Hiệu |
|------|-----------|
| 0 – 200 pts | 🎓 Học Viên An Ninh |
| 201 – 500 pts | 🛡️ Hộ Vệ Không Gian Mạng |
| 501 – 900 pts | 🔐 Chuyên Gia Mật Mã |
| 901 – 1200 pts | 🔍 Thám Tử Pháp Y |
| 1201+ pts | ⚡ **Bậc Thầy Pháp Y (Master)** |

---

## 🎵 NHẠC NỀN & ÂM THANH

Hệ thống âm thanh được tổng hợp hoàn toàn bằng **Web Audio API** (không cần file MP3):

- **Nhạc nền Cyberpunk Synthwave** (BPM 128):
  - Sub bass sawtooth theo hợp âm Cm minor
  - Pad chord ambient có reverb
  - Arpeggio 16th note
  - Lead melody synth
  - Drum machine: Kick, Snare, Hi-hat
- **Thanh điều chỉnh âm lượng** trên thanh điều hướng (0%–100%)
- **Hiệu ứng âm thanh:** Click, Chọn thẻ, Báo động (4 còi), Thành công (arpeggio C-E-G-C-E)

> 💡 Nhạc nền sẽ tự khởi động khi bạn click lần đầu tiên lên màn hình.

---

## ⚠️ CÁC LỖI THƯỜNG GẶP

| Tình huống | Nguyên nhân | Giải pháp |
|-----------|-------------|-----------|
| Không có âm thanh | Trình duyệt chặn autoplay | Bấm bất kỳ nơi nào trên màn hình |
| Thất bại dù chọn đúng | Có thể đã chọn thêm thẻ dư | Chỉ chọn đúng thẻ cần thiết, không thừa |
| Không qua được BOSS | Level 15 cần đủ 7 thẻ | Đọc kỹ mẹo trong tab "Hướng dẫn 15 màn chơi" |
| Server không phản hồi | Backend chưa chạy | Chạy `npm start` trong thư mục gốc dự án |

---

*Phiên bản: CyberBank Security Game v2.0 | Được tạo bởi nhóm ANTOANBAOMATTHONGTIN*
