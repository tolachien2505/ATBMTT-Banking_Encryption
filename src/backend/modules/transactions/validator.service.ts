import { query } from '../../config/db';
import { CryptoService } from '../crypto/crypto.service';
import crypto from 'crypto';

export interface TransactionEnvelopeInput {
  version: string;
  message_id: string;
  nonce_hash: string;
  sequence_no: number;
  tx_timestamp: string;
  session_binding: string;
  aad: any;
  public_payload: any;
  ciphertext_b64: string;
  tag_b64: string;
  payload_hash: string;
  signature_b64: string;
  signer_key_id: string;
  encryption_key_id: string;
  algorithm: any;
}

export interface ValidationResult {
  isSuccess: boolean;
  resultStatus: 'ACCEPTED' | 'REJECTED';
  signatureStatus: 'VALID' | 'INVALID' | 'UNCHECKED';
  encryptionStatus: 'DECRYPTED' | 'INTEGRITY_FAILED' | 'UNCHECKED' | 'WRONG_KEY';
  replayStatus: 'FRESH' | 'REPLAY_DETECTED' | 'UNCHECKED';
  keyStatus: 'MATCHED' | 'MISMATCHED' | 'UNCHECKED';
  explanation: string;
  scoreDelta: number;
  logs: Array<{ severity: 'INFO' | 'WARN' | 'ERROR' | 'SECURITY' | 'SUCCESS'; eventType: string; message: string }>;
  shouldCacheMessage?: boolean;
  cacheDetails?: any;
}

export class ValidatorService {
  /**
   * Main pipeline to validate a transaction attempt against the active/selected defenses
   */
  static async validate(
    attemptId: string,
    txId: string,
    sessionId: string,
    userId: string,
    selectedDefenses: string[],
    envelope: TransactionEnvelopeInput
  ): Promise<ValidationResult> {
    const logs: Array<{ severity: 'INFO' | 'WARN' | 'ERROR' | 'SECURITY' | 'SUCCESS'; eventType: string; message: string }> = [];
    
    const addLog = (severity: 'INFO' | 'WARN' | 'ERROR' | 'SECURITY' | 'SUCCESS', eventType: string, message: string) => {
      logs.push({ severity, eventType, message });
    };

    addLog('INFO', 'VALIDATION_STARTED', `Bắt đầu quy trình xác minh giao dịch cho lần thử [${attemptId.substring(0, 8)}]...`);

    let isSuccess = true;
    let signatureStatus: 'VALID' | 'INVALID' | 'UNCHECKED' = 'UNCHECKED';
    let encryptionStatus: 'DECRYPTED' | 'INTEGRITY_FAILED' | 'UNCHECKED' | 'WRONG_KEY' = 'UNCHECKED';
    let replayStatus: 'FRESH' | 'REPLAY_DETECTED' | 'UNCHECKED' = 'UNCHECKED';
    let keyStatus: 'MATCHED' | 'MISMATCHED' | 'UNCHECKED' = 'UNCHECKED';
    let explanationParts: string[] = [];
    let scoreDelta = 0;

    let shouldCacheMessage = false;
    let cacheDetails: any = null;

    // Load original transaction details
    const txs = await query('SELECT * FROM transactions WHERE tx_id = ?', [txId]);
    if (txs.length === 0) {
      throw new Error(`Transaction with ID ${txId} not found.`);
    }
    const tx = txs[0];
    const isAttacked = tx.attack_type !== 'NONE';

    // 1. Check Key Fingerprint if selected
    if (selectedDefenses.includes('KEY_FINGERPRINT')) {
      keyStatus = 'MATCHED';
      addLog('INFO', 'KEY_VERIFICATION', `Đang kiểm tra fingerprint của khóa ký [${envelope.signer_key_id}]...`);
      
      if (envelope.signer_key_id) {
        const keys = await query('SELECT * FROM crypto_keysets WHERE key_id = ?', [envelope.signer_key_id]);
        if (keys.length === 0) {
          keyStatus = 'MISMATCHED';
          isSuccess = false;
          addLog('SECURITY', 'KEY_MISMATCH', `Từ chối: key_id [${envelope.signer_key_id}] không tồn tại trên hệ thống.`);
        } else {
          const key = keys[0];
          // If level wrong key, check if key is valid or revoked/demo_only
          if (key.status === 'REVOKED' || key.status === 'EXPIRED') {
            keyStatus = 'MISMATCHED';
            isSuccess = false;
            addLog('SECURITY', 'KEY_EXPIRED', `Từ chối: Khóa ký [${envelope.signer_key_id}] đã bị thu hồi hoặc hết hạn.`);
          } else {
            addLog('SUCCESS', 'KEY_MATCHED', `Khóa ký hợp lệ. Fingerprint khớp: ${key.key_fingerprint.substring(0, 16)}...`);
          }
        }
      } else {
        keyStatus = 'MISMATCHED';
        isSuccess = false;
        addLog('ERROR', 'KEY_MISSING', `Từ chối: Giao dịch không cung cấp signer_key_id.`);
      }
    }

    // 2. Check AES-GCM Decryption and Tag if selected
    let decryptedPayloadString = '';
    if (selectedDefenses.includes('AES_GCM')) {
      encryptionStatus = 'DECRYPTED';
      addLog('INFO', 'DECRYPTION_STARTED', `Đang giải mã gói tin mã hóa AES-256-GCM...`);

      if (envelope.ciphertext_b64 && envelope.tag_b64 && envelope.encryption_key_id) {
        try {
          // Fetch symmetric key
          const keys = await query('SELECT * FROM crypto_keysets WHERE key_id = ?', [envelope.encryption_key_id]);
          if (keys.length === 0 || keys[0].status === 'REVOKED') {
            encryptionStatus = 'WRONG_KEY';
            isSuccess = false;
            addLog('SECURITY', 'WRONG_KEY', `Từ chối: Khóa giải mã [${envelope.encryption_key_id}] không hợp lệ hoặc đã bị thu hồi.`);
          } else {
            const key = keys[0];
            // Retrieve IV from envelope (usually within algorithm or envelope)
            const iv = envelope.algorithm?.iv || '';
            const aadString = JSON.stringify(envelope.aad || {});

            // In our system, the demo key fingerprint represents the 256-bit symmetric key in hex
            // Let's use it as key source.
            // Ensure key size is exactly 32 bytes (64 hex characters)
            let rawKeyHex = key.key_fingerprint;
            if (rawKeyHex.length < 64) rawKeyHex = rawKeyHex.padEnd(64, '0');
            else if (rawKeyHex.length > 64) rawKeyHex = rawKeyHex.substring(0, 64);

            decryptedPayloadString = CryptoService.decryptAES_GCM(
              rawKeyHex,
              envelope.ciphertext_b64,
              iv,
              envelope.tag_b64,
              aadString
            );

            addLog('SUCCESS', 'AEAD_TAG_VALID', `Xác thực tag thành công! Dữ liệu bảo toàn.`);
          }
        } catch (e) {
          encryptionStatus = 'INTEGRITY_FAILED';
          isSuccess = false;
          addLog('SECURITY', 'AEAD_TAG_INVALID', `Từ chối: Xác thực tag GCM thất bại. Dữ liệu đã bị sửa đổi trái phép!`);
        }
      } else {
        encryptionStatus = 'INTEGRITY_FAILED';
        isSuccess = false;
        addLog('ERROR', 'CIPHERTEXT_MISSING', `Từ chối: Giao dịch không cung cấp ciphertext hoặc tag.`);
      }
    }

    // Parse payload to analyze content (either from decrypted string or from public_payload)
    let payload: any = null;
    try {
      if (decryptedPayloadString) {
        payload = JSON.parse(decryptedPayloadString);
      } else if (envelope.public_payload) {
        payload = typeof envelope.public_payload === 'string' ? JSON.parse(envelope.public_payload) : envelope.public_payload;
      }
    } catch (e) {
      addLog('ERROR', 'PAYLOAD_PARSE_FAILED', `Không thể giải mã cấu trúc JSON của Payload.`);
      isSuccess = false;
    }

    // 3. Check digital signature if selected
    if (selectedDefenses.includes('DIGITAL_SIGNATURE')) {
      signatureStatus = 'VALID';
      addLog('INFO', 'SIGNATURE_VERIFICATION', `Đang xác minh chữ ký số RSA-PSS...`);

      if (envelope.signature_b64 && envelope.signer_key_id && payload) {
        const keys = await query('SELECT * FROM crypto_keysets WHERE key_id = ?', [envelope.signer_key_id]);
        if (keys.length === 0) {
          signatureStatus = 'INVALID';
          isSuccess = false;
          addLog('SECURITY', 'SIGNATURE_INVALID', `Từ chối: Không tìm thấy khóa công khai để xác minh.`);
        } else {
          const key = keys[0];
          // Canonicalize payload to ensure consistent hash representation
          // In JavaScript/TypeScript, stringifying with exact key order represents canonical JSON
          const canonicalData = JSON.stringify(payload);
          const computedHash = CryptoService.hash(canonicalData);

          const verifySuccess = CryptoService.verify(
            key.public_key_pem || '',
            computedHash,
            envelope.signature_b64
          );

          if (verifySuccess) {
            addLog('SUCCESS', 'SIGNATURE_VALID', `Chữ ký số hợp lệ! Xác thực đúng nguồn gửi.`);
          } else {
            signatureStatus = 'INVALID';
            isSuccess = false;
            addLog('SECURITY', 'SIGNATURE_INVALID', `Từ chối: Chữ ký số không trùng khớp. Gói tin bị giả mạo!`);
          }
        }
      } else {
        signatureStatus = 'INVALID';
        isSuccess = false;
        addLog('ERROR', 'SIGNATURE_MISSING', `Từ chối: Giao dịch thiếu chữ ký hoặc payload.`);
      }
    }

    // 4. Check HMAC if selected (Alternative integrity check)
    if (selectedDefenses.includes('HMAC_SHA256')) {
      addLog('INFO', 'HMAC_VERIFICATION', `Đang xác minh tính toàn vẹn qua HMAC-SHA256...`);
      if (envelope.payload_hash && payload) {
        const hmacSecret = 'cyberbank_hmac_shared_secret_2026';
        const canonicalData = JSON.stringify(payload);
        const expectedHmac = CryptoService.hmac(hmacSecret, canonicalData);

        if (expectedHmac === envelope.payload_hash) {
          addLog('SUCCESS', 'HMAC_VALID', `HMAC trùng khớp! Dữ liệu không bị thay đổi.`);
        } else {
          isSuccess = false;
          addLog('SECURITY', 'INTEGRITY_FAILED', `Từ chối: HMAC không hợp lệ. Số tiền hoặc thông tin đã bị Tampering!`);
        }
      } else {
        isSuccess = false;
        addLog('ERROR', 'HMAC_MISSING', `Từ chối: Không tìm thấy HMAC tag.`);
      }
    }

    // 5. Check Nonce & Replay Cache if selected
    if (selectedDefenses.includes('REPLAY_CACHE') || selectedDefenses.includes('NONCE')) {
      replayStatus = 'FRESH';
      addLog('INFO', 'REPLAY_CHECK', `Đang kiểm tra tính duy nhất của message_id [${envelope.message_id}]...`);
      
      const cached = await query('SELECT * FROM replay_cache WHERE session_id = ? AND message_id = ?', [
        sessionId,
        envelope.message_id,
      ]);

      if (cached.length > 0) {
        replayStatus = 'REPLAY_DETECTED';
        isSuccess = false;
        addLog('SECURITY', 'REPLAY_DETECTED', `Từ chối: Phát hiện REPLAY ATTACK! Gói tin msg_id [${envelope.message_id}] đã tồn tại trong Replay Cache.`);
      } else {
        // Safe and fresh, save cache metadata to be written later to avoid foreign key issues
        shouldCacheMessage = true;
        cacheDetails = {
          cache_id: crypto.randomUUID(),
          session_id: sessionId,
          message_id: envelope.message_id,
          nonce_hash: envelope.nonce_hash || null,
          sequence_no: envelope.sequence_no || null,
          tx_id: txId,
          expires_at: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes TTL
        };
        addLog('SUCCESS', 'REPLAY_CACHE_SAVED', `Message_id được ghi nhận vào Replay Cache. Trạng thái: FRESH.`);
      }
    }

    // 6. Check Timestamp / TTL if selected
    if (selectedDefenses.includes('TIMESTAMP_TTL')) {
      addLog('INFO', 'TIMESTAMP_CHECK', `Đang kiểm tra mốc thời gian tươi (Freshness) của gói tin...`);
      const currentTime = new Date();
      const expiresAt = new Date(envelope.tx_timestamp);
      // Let's assume transaction expires after 5 minutes of envelope timestamp
      const expTime = new Date(expiresAt.getTime() + 5 * 60 * 1000);

      if (currentTime > expTime) {
        isSuccess = false;
        addLog('SECURITY', 'TRANSACTION_EXPIRED', `Từ chối: Giao dịch đã hết hạn sử dụng (Quá 5 phút).`);
      } else {
        addLog('SUCCESS', 'TIMESTAMP_VALID', `Thời gian tươi hợp lệ. Sai lệch trong phạm vi an toàn.`);
      }
    }

    // 7. Business and Integrity rules post-check
    // If no cryptography defense was chosen and the transaction was attacked (Amount modified), then attack passes!
    if (isAttacked && isSuccess) {
      // Attacked but validator let it pass because of missing/incorrect defenses!
      isSuccess = false;
      addLog('WARN', 'SECURITY_FAILED', `Giao dịch đã được ghi nhận thành công, nhưng hệ thống phòng thủ đã bỏ sót một cuộc tấn công!`);
    }

    // Calculate score delta based on selected defenses
    const levelDefenseConfigs = await query('SELECT * FROM level_defense_options WHERE level_id = ?', [tx.level_id]);
    const correctDefenses = levelDefenseConfigs.filter((d: any) => d.is_correct).map((d: any) => d.defense_id);
    const requiredDefenses = levelDefenseConfigs.filter((d: any) => d.is_required).map((d: any) => d.defense_id);

    // Map defense strings to IDs
    const defenseMap: { [key: string]: string } = {
      AES_GCM: 'def_aes_gcm',
      HMAC_SHA256: 'def_hmac',
      DIGITAL_SIGNATURE: 'def_signature',
      NONCE: 'def_nonce',
      TIMESTAMP_TTL: 'def_timestamp',
      REPLAY_CACHE: 'def_replay_cache',
      KEY_FINGERPRINT: 'def_key_fingerprint',
      AUDIT_LOG: 'def_audit_log',
    };

    const selectedIds = selectedDefenses.map((d) => defenseMap[d]).filter(Boolean);

    // To pass the level, the operator must block the attack AND select ALL required defenses for this level AND select NO incorrect defenses!
    const defenseNames: { [key: string]: string } = {
      def_aes_gcm: 'AES-GCM (Mã hóa có xác thực)',
      def_hmac: 'HMAC-SHA256 (Toàn vẹn khóa)',
      def_signature: 'Chữ ký số RSA-PSS',
      def_nonce: 'Nonce (Dùng một lần)',
      def_timestamp: 'Timestamp/TTL (Thời gian tươi)',
      def_replay_cache: 'Replay Cache (Chống phát lại)',
      def_key_fingerprint: 'Key Fingerprint (Dấu vân tay khóa)',
      def_audit_log: 'Audit Log (Nhật ký truy vết)',
    };

    // 1. Check if all required defenses are selected
    let allRequiredSelected = true;
    const missingRequired: string[] = [];
    for (const reqId of requiredDefenses) {
      if (!selectedIds.includes(reqId)) {
        allRequiredSelected = false;
        missingRequired.push(reqId);
      }
    }

    // 2. Check if any incorrect defense is selected
    let noIncorrectSelected = true;
    const incorrectSelected: string[] = [];
    for (const selectedId of selectedIds) {
      if (!correctDefenses.includes(selectedId)) {
        noIncorrectSelected = false;
        incorrectSelected.push(selectedId);
      }
    }

    const expectedStatus = tx.attack_type === 'NONE' ? 'ACCEPTED' : 'REJECTED';
    const actualStatus = isSuccess ? 'ACCEPTED' : 'REJECTED';

    const blockedAttackCorrectly = 
      ((isAttacked && actualStatus === 'REJECTED') || (!isAttacked && actualStatus === 'ACCEPTED')) && 
      allRequiredSelected &&
      noIncorrectSelected;

    if (blockedAttackCorrectly) {
      scoreDelta += 70; // Increased score for higher difficulty!
      explanationParts.push('Chúc mừng Operator! Hệ thống an toàn ngân hàng đã chặn đứng thành công hành vi xâm nhập hoặc xử lý giao dịch hợp lệ hoàn hảo.');

      if (requiredDefenses.length > 0) {
        scoreDelta += 30; // Increased support bonus!
        explanationParts.push('Bạn đã cấu hình đầy đủ các biện pháp phòng thủ bổ sung bắt buộc, giúp tăng cường tối đa mức độ an toàn (Freshness/Key Registry).');
      }
    } else {
      scoreDelta = Math.max(0, scoreDelta - 20); // Penalty
      explanationParts.push('BÁO ĐỘNG ĐỎ: Hệ thống phòng thủ của bạn đã bị vượt qua hoặc cấu hình không hợp lệ. Attacker đã chiếm đoạt tiền hoặc làm gián đoạn dịch vụ.');

      // Analyze technical block status
      const mathematicallyBlocked = (isAttacked && actualStatus === 'REJECTED') || (!isAttacked && actualStatus === 'ACCEPTED');
      if (!mathematicallyBlocked) {
        explanationParts.push('⚠️ Phân tích lỗ hổng: Các thẻ phòng thủ hiện tại của bạn CHƯA chặn đứng được bản chất kỹ thuật của cuộc tấn công này.');
      }

      // Analyze what was missing
      if (missingRequired.length > 0) {
        const missingNames = missingRequired.map((id) => defenseNames[id] || id);
        explanationParts.push(`❌ Thiếu phòng thủ bắt buộc: Bạn chưa trang bị các thẻ cốt lõi cần thiết: ${missingNames.join(', ')}.`);
      }

      // Analyze what was redundant/incorrect
      if (incorrectSelected.length > 0) {
        const incorrectNames = incorrectSelected.map((id) => defenseNames[id] || id);
        explanationParts.push(`⚠️ Cấu hình không tối ưu/Dư thừa: Bạn đã trang bị các thẻ không phù hợp với loại hình tấn công này: ${incorrectNames.join(', ')}. Việc này làm lãng phí tài nguyên và làm suy yếu hệ thống phòng thủ.`);
        addLog('WARN', 'CONFIG_OVERFLOW', `Cảnh báo: Phát hiện trang bị thẻ bài không tối ưu: ${incorrectNames.join(', ')}`);
      }
    }

    // Apply audit log bonus if selected
    if (selectedDefenses.includes('AUDIT_LOG')) {
      addLog('SUCCESS', 'AUDIT_LOG_EXPORTED', `Nhật ký sự cố an ninh được ký số và đóng dấu thời gian vào Audit Log.`);
    }

    const result: ValidationResult = {
      isSuccess: blockedAttackCorrectly,
      resultStatus: actualStatus,
      signatureStatus,
      encryptionStatus,
      replayStatus,
      keyStatus,
      explanation: explanationParts.join('\n\n'),
      scoreDelta,
      logs,
      shouldCacheMessage,
      cacheDetails,
    };

    return result;
  }
}
