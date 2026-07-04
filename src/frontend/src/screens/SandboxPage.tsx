import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { SoundFX } from '../components/SoundFXController';
import { VisualAttackPipeline } from '../components/VisualAttackPipeline';
import { HexMatrixViewer } from '../components/HexMatrixViewer';
import { TerminalLogConsole } from '../components/TerminalLogConsole';
import { Shield, Lock, Play, RefreshCw, Layers, CheckCircle, AlertTriangle, Key, Terminal, Code, Sliders } from 'lucide-react';

export const SandboxPage: React.FC = () => {
  const token = useAuthStore(state => state.token);
  const sessionId = useAuthStore(state => state.sessionId);

  const [loading, setLoading] = useState(true);
  const [levels, setLevels] = useState<any[]>([]);
  const [selectedLevelId, setSelectedLevelId] = useState<string>('');
  const [levelData, setLevelData] = useState<any | null>(null);
  
  // Custom sandbox settings
  const [selectedDefenses, setSelectedDefenses] = useState<string[]>([]);
  const [validationState, setValidationState] = useState<'IDLE' | 'SCANNING' | 'SUCCESS' | 'FAILED'>('IDLE');
  const [logs, setLogs] = useState<any[]>([]);
  const [attackedEnvelope, setAttackedEnvelope] = useState<any | null>(null);
  
  // Active test reports
  const [report, setReport] = useState<any | null>(null);

  // Static list of all 8 advanced defense cards
  const allDefenses = [
    { id: 'def_aes_gcm', code: 'AES_GCM', name: 'AES-256-GCM', category: 'CONFIDENTIALITY', desc: 'Mã hóa có xác thực độ bảo mật quân sự, bảo vệ dữ liệu khỏi đọc trộm và can thiệp vật lý.', cost: 30 },
    { id: 'def_hmac', code: 'HMAC_SHA256', name: 'HMAC-SHA256', category: 'INTEGRITY', desc: 'Mã băm kiểm tra tính toàn vẹn gói tin bằng khóa đối xứng bí mật.', cost: 20 },
    { id: 'def_signature', code: 'DIGITAL_SIGNATURE', name: 'RSA Signature', category: 'AUTHENTICATION', desc: 'Chữ ký điện tử bất đối xứng, chống chối bỏ giao dịch từ nguồn gửi.', cost: 40 },
    { id: 'def_nonce', code: 'NONCE', name: 'Nonce Cryptographic', category: 'ANTI_REPLAY', desc: 'Số ngẫu nhiên dùng một lần duy nhất, ngăn chặn việc nhân bản gói tin.', cost: 15 },
    { id: 'def_timestamp', code: 'TIMESTAMP_TTL', name: 'Timestamp/TTL', category: 'ANTI_REPLAY', desc: 'Nhãn thời gian sống thực tế (Time to Live), loại bỏ gói tin cũ trễ hẹn.', cost: 15 },
    { id: 'def_replay_cache', code: 'REPLAY_CACHE', name: 'Replay Cache Lock', category: 'ANTI_REPLAY', desc: 'Lưu vết tất cả message_id trên ram ngân hàng, từ chối phát lại tức thì.', cost: 25 },
    { id: 'def_key_fingerprint', code: 'KEY_FINGERPRINT', name: 'Key Fingerprint', category: 'KEY_MANAGEMENT', desc: 'Xác minh dấu vân tay định danh của khóa công khai để tránh hacker chèn khóa giả.', cost: 20 },
    { id: 'def_audit_log', code: 'AUDIT_LOG', name: 'Secure Audit Log', category: 'LOGGING', desc: 'Ghi nhật ký vận hành có chữ ký số để điều tra sự cố pháp y mạng.', cost: 10 },
  ];

  useEffect(() => {
    const fetchLevels = async () => {
      try {
        const res = await fetch('/api/game/levels', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success && data.data.length > 0) {
          setLevels(data.data);
          setSelectedLevelId(data.data[0].level_id);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchLevels();
  }, [token]);

  const loadPreset = async (lvlId: string) => {
    if (!lvlId || !sessionId) return;
    setLoading(true);
    setValidationState('IDLE');
    setLogs([]);
    setAttackedEnvelope(null);
    setReport(null);

    try {
      const res = await fetch(`/api/game/levels/${lvlId}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ session_id: sessionId }),
      });
      const data = await res.json();
      if (data.success) {
        setLevelData(data.data);
        
        // Auto select correct options as default preset sandbox configuration
        const correctIds = data.data.defenseOptions
          .filter((d: any) => d.is_correct === 1)
          .map((d: any) => d.defense_id);
        setSelectedDefenses(correctIds);

        setLogs([
          {
            severity: 'INFO',
            eventType: 'SANDBOX_INITIALIZATION',
            message: `Nạp kịch bản Preset thành công: [${data.data.level.title}]`,
          },
          {
            severity: 'WARN',
            eventType: 'PRESET_ATTACK_BOUNDED',
            message: `Attacker Bot đã cấu hình sẵn kiểu tấn công: [${data.data.level.attack_type}]`,
          }
        ]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedLevelId) {
      loadPreset(selectedLevelId);
    }
  }, [selectedLevelId]);

  const handleToggleCard = (cardId: string) => {
    if (validationState === 'SCANNING') return;
    SoundFX.playClick();
    setSelectedDefenses(prev => {
      if (prev.includes(cardId)) {
        return prev.filter(x => x !== cardId);
      } else {
        return [...prev, cardId];
      }
    });
  };

  const handleInjectSandbox = async () => {
    if (validationState === 'SCANNING') return;

    SoundFX.playClick();
    setValidationState('SCANNING');
    setReport(null);
    setLogs(prev => [
      ...prev,
      {
        severity: 'INFO',
        eventType: 'EXPLOIT_INJECTOR',
        message: 'Bắt đầu tiêm gói tin sửa đổi của Attacker vào đường truyền tác chiến...',
      }
    ]);

    setTimeout(async () => {
      try {
        const selectedCodes = selectedDefenses.map(id => {
          const matched = allDefenses.find(d => d.id === id);
          return matched ? matched.code : '';
        }).filter(Boolean);

        const res = await fetch('/api/game/attempts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            tx_id: levelData.tx_id,
            selected_defenses: selectedCodes,
            envelope: levelData.envelope,
          }),
        });
        const data = await res.json();
        
        if (data.success) {
          const attempt = data.data;
          setAttackedEnvelope(attempt.attacked_envelope);
          setLogs(prev => [...prev, ...attempt.logs]);

          if (attempt.is_success) {
            setValidationState('SUCCESS');
            SoundFX.playSuccess();
          } else {
            setValidationState('FAILED');
            SoundFX.playAlarm();
          }

          setReport(attempt);
        } else {
          setValidationState('IDLE');
          alert(`Lỗi xử lý xác minh: ${data.error}`);
        }
      } catch (err) {
        console.error(err);
        setValidationState('IDLE');
      }
    }, 1500);
  };

  return (
    <div className="flex flex-col gap-6 p-4 max-w-6xl mx-auto pb-16">
      
      {/* Page Title */}
      <div className="hud-box">
        <h2 className="text-xl font-bold uppercase tracking-wider text-neon-cyan glitch-text">
          🔐 CRYPTOGRAPHIC SECURITY LAB (SANDBOX)
        </h2>
        <p className="text-xs text-muted mt-1 font-mono">
          [Chế độ phòng thí nghiệm tự do] | Chọn kịch bản tấn công, lắp ghép tùy ý cả 8 thẻ phòng thủ và theo dõi luồng xác thực trực quan 100%.
        </p>
      </div>

      {/* Preset Scenario Selector HUD */}
      <div className="hud-box flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Sliders className="text-neon-cyan animate-pulse" size={18} />
          <div className="flex flex-col">
            <span className="text-[10px] font-mono uppercase text-muted tracking-wider">Chọn Kịch Bản Preset</span>
            <select
              value={selectedLevelId}
              onChange={(e) => {
                SoundFX.playClick();
                setSelectedLevelId(e.target.value);
              }}
              className="bg-[#090e1a] border border-border text-neon-cyan text-xs font-mono rounded px-3 py-1.5 focus:outline-none focus:border-neon-cyan mt-1 cursor-pointer"
            >
              {levels.map(l => (
                <option key={l.level_id} value={l.level_id}>
                  Preset Level {l.level_no}: {l.title} ({l.attack_type})
                </option>
              ))}
            </select>
          </div>
        </div>

        {levelData && (
          <div className="flex flex-col text-right font-mono text-[10px] text-[#e2f1ff]">
            <div>ATTACK VECTOR: <span className="text-neon-pink font-bold">{levelData.level.attack_type}</span></div>
            <div className="text-muted mt-0.5">SCENARIO: {levelData.level.scenario_type}</div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-4 font-mono text-xs text-muted animate-pulse">
          <RefreshCw size={24} className="animate-spin text-neon-cyan" />
          <span>INJECTING ENVIRONMENT SCENARIO PRESET...</span>
        </div>
      ) : (
        <>
          {/* 1. SVG Live Flow Monitor */}
          <VisualAttackPipeline
            isAttacked={levelData.level.attack_type !== 'NONE'}
            validationState={validationState}
            attackType={levelData.level.attack_type}
          />

          {/* 2. Hex Dump Matrix Viewer */}
          <HexMatrixViewer
            payload={attackedEnvelope ? attackedEnvelope.public_payload || levelData.payload : levelData.payload}
            isAttacked={levelData.level.attack_type !== 'NONE'}
            attackType={levelData.level.attack_type}
          />

          {/* 3. Fully Unlocked 8-Card Defense Deck Grid */}
          <div className="hud-box">
            <div className="flex justify-between items-center border-b border-border pb-2 mb-4">
              <span className="text-xs uppercase font-mono tracking-widest text-muted">🛡️ Advanced Security Deck (8 Cards Active)</span>
              <span className="text-xs font-mono text-neon-cyan">
                [Equipped: {selectedDefenses.length}/8]
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {allDefenses.map(card => {
                const isEquipped = selectedDefenses.includes(card.id);
                return (
                  <div
                    key={card.id}
                    onClick={() => handleToggleCard(card.id)}
                    className={`hud-box cursor-pointer select-none transition-all duration-300 relative flex flex-col justify-between ${
                      isEquipped
                        ? 'border-neon-cyan bg-[rgba(0,240,255,0.06)] glow-cyan'
                        : 'opacity-60 hover:opacity-100 hover:border-border/80 bg-surface/10'
                    }`}
                    style={{ minHeight: '135px' }}
                  >
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs uppercase font-mono tracking-wider font-bold text-neon-cyan">
                          {card.name}
                        </span>
                        <span className="text-[8px] font-mono uppercase text-muted tracking-widest">
                          {card.category}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-normal mt-1">
                        {card.desc}
                      </p>
                    </div>

                    <div className="border-t border-border/30 pt-2 mt-2 flex justify-between items-center font-mono text-[9px] text-muted">
                      <span>COST: {card.cost} pts</span>
                      {isEquipped ? (
                        <span className="text-neon-cyan font-bold blink">ACTIVE</span>
                      ) : (
                        <span className="text-muted/40">STANDBY</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. Terminal Logs console */}
          <TerminalLogConsole
            logs={logs}
          />

          {/* Control Actions bar */}
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between hud-box">
            <div className="flex items-center gap-2.5 text-xs font-mono text-muted">
              <Terminal size={14} className="text-neon-cyan" />
              <span>Thử nghiệm sandbox: Tiêm gói tin của Attacker xem các cơ chế phòng thủ phối hợp hoạt động như thế nào.</span>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => loadPreset(selectedLevelId)}
                className="px-5 py-2.5 border border-border text-muted font-mono text-xs hover:border-neon-pink hover:text-neon-pink rounded-md transition-colors"
                disabled={validationState === 'SCANNING'}
              >
                [ THIẾT LẬP LẠI ]
              </button>

              <button
                onClick={handleInjectSandbox}
                disabled={validationState === 'SCANNING'}
                className={`px-8 py-2.5 border font-mono text-xs font-extrabold uppercase rounded-md transition-all duration-300 ${
                  validationState === 'SCANNING'
                    ? 'border-neon-cyan text-neon-cyan bg-[rgba(0,240,255,0.02)] effect-laser-scan'
                    : 'border-neon-cyan text-neon-cyan bg-[rgba(0,240,255,0.04)] hover:bg-[rgba(0,240,255,0.08)] glow-cyan'
                }`}
              >
                {validationState === 'SCANNING' ? 'Đang chạy mô phỏng...' : '[ TIÊM GÓI TIN & PHÂN TÍCH ]'}
              </button>
            </div>
          </div>

          {/* Sandbox Diagnostics Report panel */}
          {report && (
            <div className="hud-box border-neon-cyan/40 bg-[rgba(0,240,255,0.02)] flex flex-col gap-4 animate-fade-in">
              <div className="flex items-center gap-2.5 border-b border-border/50 pb-2">
                <CheckCircle size={16} className={report.is_success ? 'text-neon-green' : 'text-neon-pink'} />
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-neon-cyan">
                  Sandbox Forensic Diagnostic Analysis
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
                <div className="hud-box bg-surface/30">
                  <span className="text-[9px] uppercase text-muted block mb-1">TRANSIT SCAN STATUS</span>
                  <span className={`text-md font-bold ${report.is_success ? 'text-neon-green' : 'text-neon-pink'}`}>
                    {report.is_success ? 'NEUTRALIZED (SECURE)' : 'INFILTRATED (ATTACK_SUCCESS)'}
                  </span>
                </div>
                <div className="hud-box bg-surface/30">
                  <span className="text-[9px] uppercase text-muted block mb-1">VALIDATOR DISPOSITION</span>
                  <span className="text-md font-bold text-neon-cyan">
                    {report.result_status}
                  </span>
                </div>
                <div className="hud-box bg-surface/30">
                  <span className="text-[9px] uppercase text-muted block mb-1">SCORE METRIC WEIGHT</span>
                  <span className="text-md font-bold text-neon-cyan">
                    +{report.score_delta} PTS
                  </span>
                </div>
              </div>

              <div className="bg-[rgba(0,0,0,0.4)] p-3.5 border border-border rounded font-mono text-[11px] leading-relaxed text-[#e2f1ff]">
                <span className="text-neon-cyan font-bold block mb-1 uppercase tracking-widest text-[10px]">Phân tích chi tiết:</span>
                <p className="whitespace-pre-wrap">{report.explanation}</p>
              </div>
            </div>
          )}
        </>
      )}

    </div>
  );
};
