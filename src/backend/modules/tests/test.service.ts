import { query } from '../../config/db';
import { GameService } from '../game/game.service';
import { ValidatorService } from '../transactions/validator.service';
import crypto from 'crypto';

export class TestService {
  /**
   * Runs the 6 required functional security tests automatically on the backend.
   * Records attempts, logs, and updates the external database to generate the reports.
   */
  static async runRequiredTests(userId: string, sessionId: string): Promise<any> {
    console.log(`[TEST_RUNNER] Initiating automated test run for User: ${userId}, Session: ${sessionId}...`);
    
    const runId = crypto.randomUUID();
    await query(
      'INSERT INTO test_runs (test_run_id, session_id, triggered_by_user_id, status, total_count) VALUES (?, ?, ?, ?, ?)',
      [runId, sessionId, userId, 'RUNNING', 6]
    );

    const testCases = await query('SELECT * FROM test_cases ORDER BY code');
    const results: Array<{ code: string; name: string; status: 'PASSED' | 'FAILED'; actual: string; duration: number }> = [];

    let passedCount = 0;
    let failedCount = 0;

    for (const tc of testCases) {
      const start = Date.now();
      let status: 'PASSED' | 'FAILED' = 'FAILED';
      let actualResult = '';

      try {
        if (tc.code === 'TC01_VALID_TRANSACTION') {
          // 1. Valid transaction check
          const flow = await GameService.startLevel('level_valid_transaction', sessionId);
          const validation = await ValidatorService.validate(
            crypto.randomUUID(),
            flow.tx_id,
            sessionId,
            userId,
            ['AES_GCM', 'DIGITAL_SIGNATURE', 'AUDIT_LOG'],
            flow.envelope
          );

          if (validation.isSuccess && validation.resultStatus === 'ACCEPTED') {
            status = 'PASSED';
            actualResult = 'Giao dịch hợp lệ được chấp nhận thành công. Khóa và chữ ký số khớp.';
          } else {
            actualResult = `Lỗi: Giao dịch bị từ chối ngoài dự kiến. Log: ${validation.logs[validation.logs.length - 1]?.message}`;
          }
        } 
        else if (tc.code === 'TC02_AMOUNT_TAMPERING') {
          // 2. Tampering amount check
          const flow = await GameService.startLevel('level_amount_tampering', sessionId);
          // Apply MITM attack (amount modified to 100,000,000 VND)
          const attackedEnvelope = await GameService.applyAttack(
            'level_amount_tampering',
            flow.envelope,
            100000000
          );

          // User selects Digital Signature to block it
          const validation = await ValidatorService.validate(
            crypto.randomUUID(),
            flow.tx_id,
            sessionId,
            userId,
            ['DIGITAL_SIGNATURE', 'AUDIT_LOG'],
            attackedEnvelope
          );

          if (!validation.isSuccess && validation.resultStatus === 'REJECTED' && validation.signatureStatus === 'INVALID') {
            status = 'PASSED';
            actualResult = 'Tấn công Tampering bị phát hiện thành công! Chữ ký số không khớp do dữ liệu bị sửa đổi.';
          } else {
            actualResult = `Lỗi: Giao dịch không bị chặn hoặc sai mã lỗi. Status: ${validation.resultStatus}`;
          }
        }
        else if (tc.code === 'TC03_REPLAY_TRANSACTION') {
          // 3. Replay attack check
          const flow = await GameService.startLevel('level_replay_transaction', sessionId);
          // First attempt passes
          const attempt1Id = crypto.randomUUID();
          await ValidatorService.validate(
            attempt1Id,
            flow.tx_id,
            sessionId,
            userId,
            ['NONCE', 'REPLAY_CACHE', 'TIMESTAMP_TTL', 'DIGITAL_SIGNATURE'],
            flow.envelope
          );

          // Attacker bot intercepts and replays the same msg_id
          const attackedEnvelope = await GameService.applyAttack(
            'level_replay_transaction',
            flow.envelope,
            1000000
          );

          // Second attempt is validated
          const validation = await ValidatorService.validate(
            crypto.randomUUID(),
            flow.tx_id,
            sessionId,
            userId,
            ['NONCE', 'REPLAY_CACHE', 'TIMESTAMP_TTL', 'DIGITAL_SIGNATURE'],
            attackedEnvelope
          );

          if (!validation.isSuccess && validation.resultStatus === 'REJECTED' && validation.replayStatus === 'REPLAY_DETECTED') {
            status = 'PASSED';
            actualResult = 'Tấn công Replay bị chặn đứng! msg_id cũ đã được phát hiện trong Replay Cache.';
          } else {
            actualResult = `Lỗi: Replay vượt qua hệ thống phòng thủ. Status: ${validation.resultStatus}`;
          }
        }
        else if (tc.code === 'TC04_INVALID_SIGNATURE') {
          // 4. Rogue signature check
          const flow = await GameService.startLevel('level_invalid_signature', sessionId);
          // Attacker signs with attacker rogue key
          const attackedEnvelope = await GameService.applyAttack(
            'level_invalid_signature',
            flow.envelope,
            1000000
          );

          const validation = await ValidatorService.validate(
            crypto.randomUUID(),
            flow.tx_id,
            sessionId,
            userId,
            ['DIGITAL_SIGNATURE', 'KEY_FINGERPRINT', 'AUDIT_LOG'],
            attackedEnvelope
          );

          if (!validation.isSuccess && validation.resultStatus === 'REJECTED' && validation.keyStatus === 'MISMATCHED') {
            status = 'PASSED';
            actualResult = 'Chữ ký giả mạo bị chặn đứng! Key Fingerprint của Attacker không khớp cơ sở dữ liệu khách hàng.';
          } else {
            actualResult = `Lỗi: Chữ ký giả mạo lọt lưới hoặc sai mã lỗi. Status: ${validation.resultStatus}`;
          }
        }
        else if (tc.code === 'TC05_WRONG_KEY') {
          // 5. Decryption key mismatch check
          const flow = await GameService.startLevel('level_wrong_key', sessionId);
          // Rogue key id passed
          const attackedEnvelope = await GameService.applyAttack(
            'level_wrong_key',
            flow.envelope,
            1000000
          );

          const validation = await ValidatorService.validate(
            crypto.randomUUID(),
            flow.tx_id,
            sessionId,
            userId,
            ['KEY_FINGERPRINT', 'AES_GCM', 'AUDIT_LOG'],
            attackedEnvelope
          );

          if (!validation.isSuccess && validation.resultStatus === 'REJECTED' && validation.encryptionStatus === 'WRONG_KEY') {
            status = 'PASSED';
            actualResult = 'Sai khóa giải mã bị chặn! AEAD tag xác thực lỗi hoặc key_id không khớp.';
          } else {
            actualResult = `Lỗi: Bỏ sót lỗi giải mã nhầm khóa. Status: ${validation.resultStatus}`;
          }
        }
        else if (tc.code === 'TC06_SCORING_EXPLANATION') {
          // 6. Test score & explanations
          const flow = await GameService.startLevel('level_valid_transaction', sessionId);
          const validation = await ValidatorService.validate(
            crypto.randomUUID(),
            flow.tx_id,
            sessionId,
            userId,
            ['AES_GCM', 'DIGITAL_SIGNATURE', 'AUDIT_LOG'],
            flow.envelope
          );

          if (validation.scoreDelta > 0 && validation.explanation.length > 0) {
            status = 'PASSED';
            actualResult = `Điểm số (+${validation.scoreDelta}) và phần phân tích học thuật được tạo thành công.`;
          } else {
            actualResult = 'Lỗi: Hệ thống không tính điểm hoặc thiếu giải thích.';
          }
        }
      } catch (err: any) {
        actualResult = `Lỗi hệ thống: ${err.message}`;
      }

      const duration = Date.now() - start;
      if (status === 'PASSED') passedCount++;
      else failedCount++;

      results.push({ code: tc.code, name: tc.name, status, actual: actualResult, duration });

      // Save to DB test_results
      const testResultId = crypto.randomUUID();
      await query(
        'INSERT INTO test_results (test_result_id, test_run_id, test_case_id, status, actual_result, duration_ms) VALUES (?, ?, ?, ?, ?, ?)',
        [testResultId, runId, tc.test_case_id, status, actualResult, duration]
      );
    }

    // Build beautiful Markdown/HTML report
    const finishedAt = new Date();
    const finalStatus = passedCount === 6 ? 'PASSED' : 'PARTIAL';

    let markdownReport = `
# Báo cáo Kiểm thử Tự động An toàn Mật mã - CyberBank Security Game v2

- **Mã Phiên Chạy:** \`${runId}\`
- **Thời Điểm:** \`${finishedAt.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}\`
- **Operator Kích Hoạt:** \`${userId}\`
- **Kết Quả:** **${finalStatus === 'PASSED' ? 'THÀNH CÔNG 100%' : 'MỘT SỐ TEST THẤT BẠI'}**
- **Tiến Độ:** \`${passedCount}/6\` test cases đã qua kiểm tra.

## Danh Sách Chi Tiết Kết Quả Kiểm Thử

| Mã Test | Tên Kiểm Thử | Trạng Thái | Thời Gian | Bằng Chứng Pháp Y / Chi Tiết |
|---|---|---|---:|---|
`;

    for (const r of results) {
      const statusBadge = r.status === 'PASSED' ? '✅ PASSED' : '❌ FAILED';
      markdownReport += `| \`${r.code}\` | **${r.name}** | **${statusBadge}** | \`${r.duration}ms\` | ${r.actual} |\n`;
    }

    markdownReport += `
---
*Báo cáo được ký số tự động bởi Bank Validator Engine. Tài liệu học tập phục vụ nộp Báo Cáo Bài Tập Lớn môn học An Toàn Bảo Mật Thông Tin.*
`;

    // Update test_run
    await query(
      'UPDATE test_runs SET status = ?, passed_count = ?, failed_count = ?, finished_at = ?, report_markdown = ? WHERE test_run_id = ?',
      [finalStatus, passedCount, failedCount, finishedAt, markdownReport, runId]
    );

    return {
      run_id: runId,
      status: finalStatus,
      passed_count: passedCount,
      failed_count: failedCount,
      report: markdownReport,
      results,
    };
  }
}
