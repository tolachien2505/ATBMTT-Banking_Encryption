import React, { useState } from 'react';
import { BookOpen, ShieldAlert, CheckCircle, Code, HelpCircle } from 'lucide-react';
import { SoundFX } from '../components/SoundFXController';

interface Concept {
  id: string;
  name: string;
  short: string;
  details: string;
  mistakes: string;
  codeExample: string;
  relatedLevel: string;
}

const CONCEPTS: Concept[] = [
  {
    id: 'aes_gcm',
    name: 'AES-256-GCM',
    short: 'Mã hóa có xác thực (AEAD), bảo vệ cả tính bí mật và toàn vẹn dữ liệu.',
    details: 'AES-GCM (Galois/Counter Mode) là thuật toán mã hóa đối xứng hiệu suất cao. Khác với AES-CBC truyền thống, GCM tích hợp sẵn cơ chế sinh Mã xác thực thông điệp (Authentication Tag). Trong quá trình truyền tin, GCM nhận vào Plaintext + IV (Initialization Vector) + AAD (Additional Authenticated Data - dữ liệu công khai nhưng cần bảo vệ toàn vẹn như tx_id, message_id). Khi giải mã, nếu AAD hoặc Ciphertext bị thay đổi dù chỉ 1 bit, GCM Tag xác thực sẽ trả về lỗi ngay lập tức, ngăn chặn hoàn toàn tấn công sửa đổi số tiền.',
    mistakes: 'Dùng lại IV/Nonce với cùng một khóa đối xứng. Nếu dùng lại Nonce, kẻ tấn công có thể thực hiện các phép XOR toán học để khôi phục lại Plaintext thô ban đầu mà không cần biết khóa bí mật!',
    codeExample: `// Cấu hình đúng chuẩn trong Express Backend:
const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
cipher.setAAD(Buffer.from(JSON.stringify(aad), 'utf8'));
let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
ciphertext += cipher.final('base64');
const tag = cipher.getAuthTag().toString('base64');`,
    relatedLevel: 'Level 2 & Level 5',
  },
  {
    id: 'hmac',
    name: 'HMAC-SHA256',
    short: 'Mã xác thực thông điệp bằng khóa bí mật (Hash-based Message Authentication Code).',
    details: 'HMAC kết hợp hàm băm mã hóa một chiều (như SHA-256) với một Khóa bí mật dùng chung (Shared Secret Key). Người gửi tính HMAC của gói tin và gửi kèm. Người nhận dùng chung khóa bí mật để tính lại HMAC và đối chiếu. Nếu trùng khớp, người nhận đảm bảo 2 điều: 1. Thông điệp không bị thay đổi (Toàn vẹn). 2. Thông điệp thực sự do người giữ khóa bí mật gửi (Xác thực).',
    mistakes: 'Hardcode khóa bí mật HMAC trong mã nguồn (mã cứng) hoặc lưu khóa rõ trong log. Kẻ tấn công có thể đọc log hoặc dịch ngược code để lấy khóa, từ đó tự tạo ra HMAC hợp lệ để vượt qua Validator.',
    codeExample: `// Cách tính toán HMAC-SHA256 an toàn:
const hmac = crypto.createHmac('sha256', hmacSecretKey);
hmac.update(canonicalPayloadString);
const signatureTag = hmac.digest('hex');`,
    relatedLevel: 'Level 2 - Số tiền bị sửa',
  },
  {
    id: 'digital_signature',
    name: 'Chữ Ký Số (Digital Signature)',
    short: 'Mật mã học khóa công khai (RSA/ECDSA), bảo đảm xác thực nguồn gửi và chống chối bỏ.',
    details: 'Chữ ký số hoạt động dựa trên Mật mã học khóa bất đối xứng. Người gửi sở hữu Khóa bí mật (Private Key) dùng để Ký lên bản băm của thông điệp. Người nhận sở hữu Khóa công khai (Public Key) dùng để Xác minh chữ ký. Vì chỉ duy nhất người gửi sở hữu Khóa bí mật, chữ ký số mang lại tính chất Chống chối bỏ (Non-repudiation) - người gửi không thể phủ nhận giao dịch của mình. RSA-PSS là phiên bản chữ ký số nâng cao cực kỳ an toàn nhờ cơ chế đệm ngẫu nhiên.',
    mistakes: 'Chỉ ký trên một phần của thông điệp (ví dụ chỉ ký to_account). Kẻ tấn công sẽ can thiệp sửa đổi các trường không được ký (như amount) mà không làm hỏng chữ ký số!',
    codeExample: `// Ký số RSA-PSS bảo mật cao:
const sign = crypto.createSign('SHA256');
sign.update(payloadHash);
const signature = sign.sign({
  key: privateKeyPem,
  padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
  saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST
}, 'base64');`,
    relatedLevel: 'Level 1, Level 2, Level 4',
  },
  {
    id: 'nonce_freshness',
    name: 'Nonce & Replay Protection',
    short: 'Giá trị ngẫu nhiên dùng một lần (Number used Once) để chống gửi lại gói tin cũ.',
    details: 'Tấn công Replay xảy ra khi kẻ tấn công nghe lén trên đường truyền, sao chép một gói tin giao dịch hợp lệ cũ (đã được ký số) rồi gửi lại y hệt cho ngân hàng để trừ tiền nạn nhân nhiều lần. Vì kẻ tấn công không sửa gì trong gói tin, chữ ký số vẫn hợp lệ 100%! Để phòng chống, mỗi giao dịch phải chứa một số Nonce ngẫu nhiên duy nhất và mốc thời gian Timestamp. Ngân hàng lưu các Nonce đã xử lý vào bộ nhớ đệm Replay Cache với thời hạn (TTL). Nếu Nonce gửi lên đã tồn tại trong Cache hoặc Timestamp quá cũ, giao dịch bị từ chối ngay lập tức.',
    mistakes: 'Validator kiểm tra Nonce nhưng KHÔNG lưu Nonce vào Replay Cache. Việc này làm cho việc gửi lại Nonce cũ vẫn thành công, vô hiệu hóa cơ chế bảo vệ!',
    codeExample: `// Kiểm tra Replay Cache trên Validator:
const cached = await query('SELECT * FROM replay_cache WHERE session_id = ? AND message_id = ?', [sessionId, msgId]);
if (cached.length > 0) {
  throw new Error("REPLAY_DETECTED");
} else {
  await query('INSERT INTO replay_cache ...');
}`,
    relatedLevel: 'Level 3 - Replay Attack',
  },
  {
    id: 'key_management',
    name: 'Key Fingerprint & Registry',
    short: 'Quản lý khóa an toàn, đối chiếu dấu vân tay khóa (Key Fingerprint) để tránh giả mạo.',
    details: 'Kẻ tấn công có thể tạo ra một cặp khóa công khai/bí mật của riêng hắn, dùng khóa bí mật của hắn ký lên giao dịch giả mạo, rồi gửi kèm khóa công khai của hắn lên Bank Validator. Nếu Validator giải mã mù (blind verification) mà không kiểm tra xem khóa công khai đó có thực sự thuộc về người gửi hay không, Validator sẽ chấp nhận chữ ký! Do đó, Validator phải đối chiếu key_id và dấu vân tay khóa (Key Fingerprint - mã băm SHA-256 của khóa công khai) với cơ sở dữ liệu khóa công khai đã đăng ký từ trước của khách hàng.',
    mistakes: 'Bỏ qua việc ràng buộc key_id hoặc không đối chiếu Key Fingerprint với bảng đăng ký crypto_keysets tại Validator.',
    codeExample: `// Đối chiếu Fingerprint trên Validator:
const keyRecord = await query('SELECT * FROM crypto_keysets WHERE key_id = ?', [signerKeyId]);
const computedFingerprint = getKeyFingerprint(providedPublicKey);
if (keyRecord.key_fingerprint !== computedFingerprint) {
  throw new Error("KEY_FINGERPRINT_MISMATCH");
}`,
    relatedLevel: 'Level 4 & Level 5',
  },
];

export const NotebookPage: React.FC = () => {
  const [selectedConcept, setSelectedConcept] = useState<Concept>(CONCEPTS[0]);

  const handleSelect = (concept: Concept) => {
    SoundFX.playClick();
    setSelectedConcept(concept);
  };

  return (
    <div className="flex flex-col gap-6 p-4 max-w-6xl mx-auto">
      {/* HUD Header */}
      <div className="hud-box">
        <h2 className="text-xl font-bold uppercase tracking-wider text-neon-cyan glitch-text">
          CYBERSECURITY CRYPTOGRAPHIC MANUAL
        </h2>
        <p className="text-xs text-muted mt-1 font-mono">
          [Sổ tay Tác chiến Holographic] | Tài liệu tra cứu mật mã học thực chiến phục vụ Operator cấu hình phòng thủ ngân hàng điện tử an toàn.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Concept sidebar */}
        <div className="md:col-span-1 hud-box flex flex-col gap-2" style={{ minHeight: '380px' }}>
          <span className="text-xs uppercase font-mono tracking-widest text-muted border-b border-border pb-2 mb-3">
            📚 Mật Mã Học Cốt Lõi
          </span>
          <div className="flex flex-col gap-2 flex-grow overflow-y-auto pr-1" style={{ maxHeight: '340px' }}>
            {CONCEPTS.map(c => {
              const isActive = selectedConcept.id === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => handleSelect(c)}
                  className={`p-3 border rounded cursor-pointer transition-all duration-200 flex items-center justify-between font-mono text-xs uppercase tracking-wider ${
                    isActive
                      ? 'border-neon-cyan bg-[rgba(0,240,255,0.04)] glow-cyan font-bold text-neon-cyan'
                      : 'border-border bg-surface/30 hover:border-neon-cyan/30 hover:text-neon-cyan'
                  }`}
                >
                  <span>{c.name}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Details Panel */}
        <div className="md:col-span-2 hud-box flex flex-col gap-4" style={{ minHeight: '380px' }}>
          <span className="text-xs uppercase font-mono tracking-widest text-muted border-b border-border pb-2">
            📖 Detailed Scientific Concept Manual
          </span>

          <div className="flex flex-col gap-4">
            {/* Concept name */}
            <div>
              <h3 className="text-lg font-bold uppercase tracking-wider text-neon-cyan mb-1 font-mono">
                {selectedConcept.name}
              </h3>
              <p className="text-[11px] text-neon-amber font-mono font-bold">
                {selectedConcept.short}
              </p>
            </div>

            {/* Scientific details */}
            <div className="text-xs leading-relaxed text-[#e2f1ff] bg-[rgba(0,0,0,0.2)] p-3 border border-border rounded">
              <span className="font-bold text-neon-cyan block mb-1 font-mono">[+] PHÂN TÍCH CHUYÊN SÂU</span>
              {selectedConcept.details}
            </div>

            {/* Common Mistakes */}
            <div className="text-xs leading-relaxed text-neon-pink bg-[rgba(255,0,85,0.03)] p-3 border border-neon-pink/30 rounded flex gap-2">
              <ShieldAlert size={18} className="flex-shrink-0 mt-0.5 animate-pulse" />
              <div>
                <span className="font-bold uppercase block mb-1 font-mono">⚠️ LỖI OPERATOR THƯỜNG GẶP</span>
                {selectedConcept.mistakes}
              </div>
            </div>

            {/* Code example */}
            <div>
              <span className="text-[10px] uppercase font-mono tracking-widest text-muted block mb-2 flex items-center gap-1">
                <Code size={12} className="text-neon-cyan" />
                Backend Code Implementation Example (TypeScript)
              </span>
              <pre className="bg-[#04060c] p-3 border border-border rounded text-[10px] font-mono text-[#8bb3f2] overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-[160px]">
                {selectedConcept.codeExample}
              </pre>
            </div>

            {/* Level link */}
            <div className="border-t border-border/40 pt-3 text-[10px] font-mono text-muted flex justify-between">
              <span>Hệ thống học liệu mật mã.</span>
              <span className="text-neon-cyan font-bold uppercase">{selectedConcept.relatedLevel}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
