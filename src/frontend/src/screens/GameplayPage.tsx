import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { SoundFX } from '../components/SoundFXController';
import { VisualAttackPipeline } from '../components/VisualAttackPipeline';
import { HexMatrixViewer } from '../components/HexMatrixViewer';
import { CyberDefenseDeck } from '../components/CyberDefenseDeck';
import { TerminalLogConsole } from '../components/TerminalLogConsole';
import { RefreshCw, ChevronRight, AlertCircle, CheckCircle, Info, Key, FileText, Zap } from 'lucide-react';

interface GameplayPageProps {
  levelId: string;
  levelMeta?: any; // Static metadata from CampaignPage — enables instant render
  onNavigate: (screen: string) => void;
}

export const GameplayPage: React.FC<GameplayPageProps> = ({ levelId, levelMeta, onNavigate }) => {
  const token     = useAuthStore(state => state.token);
  const sessionId = useAuthStore(state => state.sessionId);
  const loadMe    = useAuthStore(state => state.loadMe);

  // ── Crypto envelope (loaded in background after UI paints) ─────────────
  const [cryptoReady,   setCryptoReady]   = useState(false);
  const [cryptoLoading, setCryptoLoading] = useState(true);
  const [levelData,     setLevelData]     = useState<any | null>(null);

  // ── Gameplay states ────────────────────────────────────────────────────
  const [selectedDefenses, setSelectedDefenses] = useState<string[]>([]);
  const [validationState, setValidationState]   = useState<'IDLE' | 'SCANNING' | 'SUCCESS' | 'FAILED'>('IDLE');
  const [logs,            setLogs]              = useState<any[]>([
    { severity: 'INFO', eventType: 'INITIALIZATION', message: 'Giao diện đã sẵn sàng. Đang khởi tạo gói mật mã nền...' },
  ]);
  const [attackedEnvelope, setAttackedEnvelope] = useState<any | null>(null);
  const [showReport,    setShowReport]    = useState(false);
  const [attemptResult, setAttemptResult] = useState<any | null>(null);

  // ── Background crypto load ─────────────────────────────────────────────
  const loadCrypto = async () => {
    if (!levelId || !sessionId) return;
    setCryptoReady(false);
    setCryptoLoading(true);
    setValidationState('IDLE');
    setAttackedEnvelope(null);
    setShowReport(false);
    setAttemptResult(null);
    setSelectedDefenses([]);
    setLevelData(null);
    setLogs([{ severity: 'INFO', eventType: 'INITIALIZATION', message: 'Giao diện đã sẵn sàng. Đang khởi tạo gói mật mã nền...' }]);

    try {
      const res = await fetch(`/api/game/levels/${levelId}/start`, {
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
        setCryptoReady(true);
        setLogs(prev => [
          ...prev,
          { severity: 'SUCCESS', eventType: 'CRYPTO_READY',   message: `✅ Gói mật mã sẵn sàng. Giao dịch Alice → Bob: ${data.data.payload.amount.toLocaleString()} VND.` },
          { severity: 'WARN',    eventType: 'INTRUDER_ALERT', message: `⚠️ Cảnh báo! Phát hiện tấn công đường truyền: [${data.data.level.attack_type}]` },
        ]);
      } else {
        setLogs(prev => [...prev, { severity: 'ERROR', eventType: 'BOOT_ERROR', message: `Lỗi khởi động level: ${data.error}` }]);
      }
    } catch (e) {
      console.error(e);
      setLogs(prev => [...prev, { severity: 'ERROR', eventType: 'BOOT_ERROR', message: 'Lỗi kết nối server. Kiểm tra backend đang chạy.' }]);
    } finally {
      setCryptoLoading(false);
    }
  };

  // Start crypto loading after first paint (requestAnimationFrame = non-blocking)
  useEffect(() => {
    const frame = requestAnimationFrame(() => loadCrypto());
    return () => cancelAnimationFrame(frame);
  }, [levelId, token, sessionId]);

  // Use static meta for instant display; upgrade to live data once available
  const displayLevel    = levelData?.level   || levelMeta;
  const defenseOptions  = levelData?.defenseOptions || [];
  const keys            = levelData?.keys    || {};
  const payload         = levelData?.payload || {};

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleToggleDefense = (id: string) => {
    setSelectedDefenses(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 4) { SoundFX.playAlarm(); return prev; }
      return [...prev, id];
    });
  };

  const handleVerify = async () => {
    if (validationState === 'SCANNING') return;
    if (!cryptoReady) { SoundFX.playAlarm(); return; }

    SoundFX.playClick();
    setTimeout(() => SoundFX.playClick(), 120);
    setTimeout(() => SoundFX.playClick(), 240);

    setValidationState('SCANNING');
    setLogs(prev => [...prev, {
      severity: 'INFO', eventType: 'TRANSIT_SCAN',
      message: 'Khởi động máy quét lượng tử và nạp bộ xác minh mật mã...',
    }]);

    try {
      const selectedCodes = selectedDefenses.map(id => {
        const matched = levelData.defenseOptions.find((d: any) => d.defense_id === id);
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
        setAttemptResult(attempt);
        setAttackedEnvelope(attempt.attacked_envelope);

        const newLogs = attempt.logs;
        let idx = 0;
        const logTimer = setInterval(async () => {
          if (idx < newLogs.length) {
            const logItem = newLogs[idx];
            setLogs(prev => [...prev, logItem]);
            if (logItem.severity === 'SUCCESS') SoundFX.playCard();
            else if (['WARN', 'ERROR', 'SECURITY'].includes(logItem.severity)) SoundFX.playAlarm();
            else SoundFX.playClick();
            idx++;
          } else {
            clearInterval(logTimer);
            if (attempt.is_success) {
              setValidationState('SUCCESS');
              SoundFX.playSuccess();
            } else {
              setValidationState('FAILED');
              SoundFX.playAlarm();
            }
            await loadMe();
            setTimeout(() => setShowReport(true), 800);
          }
        }, 400);
      } else {
        setValidationState('IDLE');
        alert(`Lỗi xử lý xác minh: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      setValidationState('IDLE');
    }
  };

  // ── Fallback: no meta at all (edge case) ──────────────────────────────
  if (!displayLevel) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-4 font-mono text-xs text-muted">
        <RefreshCw size={20} className="animate-spin text-neon-cyan" />
        <span>Đang kết nối...</span>
      </div>
    );
  }

  const isLevelAttacked = displayLevel.attack_type !== 'NONE';

  // ── Main render (instant, no loading screen) ──────────────────────────
  return (
    <div className="flex flex-col gap-6 p-4 max-w-6xl mx-auto pb-16">

      {/* HUD Level Header */}
      <div className="hud-box flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative">
        <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-neon-cyan opacity-40" />
        <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-neon-cyan opacity-40" />
        <div>
          <span className="text-[10px] font-mono uppercase text-muted tracking-widest block">
            LEVEL {displayLevel.level_no ?? displayLevel.level_id} | {displayLevel.scenario_type ?? displayLevel.attack_type}
          </span>
          <h2 className="text-xl font-extrabold text-neon-cyan uppercase tracking-wider mt-1 glitch-text">
            {displayLevel.title}
          </h2>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <div className="px-3 py-1 border border-border rounded bg-surface/30 font-mono text-[10px]">
            DIFF: <span className="text-neon-cyan font-bold">{displayLevel.difficulty}</span>
          </div>
          <div className="px-3 py-1 border border-border rounded bg-surface/30 font-mono text-[10px]">
            MAX SCORE: <span className="text-neon-cyan font-bold">{displayLevel.max_score} PTS</span>
          </div>
          {/* Crypto status badge */}
          {cryptoLoading ? (
            <div className="flex items-center gap-1.5 px-2 py-1 border border-neon-amber/40 rounded bg-[rgba(255,200,0,0.04)] font-mono text-[10px] text-neon-amber">
              <RefreshCw size={10} className="animate-spin" />
              Đang tải dữ liệu mật mã...
            </div>
          ) : cryptoReady ? (
            <div className="flex items-center gap-1.5 px-2 py-1 border border-neon-green/40 rounded bg-[rgba(57,255,20,0.04)] font-mono text-[10px] text-neon-green">
              <Zap size={10} />
              Mật mã sẵn sàng
            </div>
          ) : null}
        </div>
      </div>

      {/* Mission info */}
      <div className="hud-box border-neon-cyan/20 bg-[rgba(0,240,255,0.01)] text-xs leading-relaxed">
        <div className="flex gap-2 items-start text-muted mb-2 font-mono uppercase text-[10px] border-b border-border/40 pb-1.5">
          <Info size={13} className="text-neon-cyan" />
          <span>Thông tin nhiệm vụ & Tình huống an ninh</span>
        </div>
        <p className="text-muted-foreground">
          {displayLevel.mission_markdown || displayLevel.description || 'Phân tích tình huống tấn công và chọn thẻ bài phòng thủ phù hợp.'}
        </p>
      </div>

      {/* 1. SVG Flow Pipeline */}
      <VisualAttackPipeline
        isAttacked={isLevelAttacked}
        validationState={validationState}
        attackType={displayLevel.attack_type}
      />

      {/* 2. Payload + Key Registry */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`lg:col-span-2 transition-all duration-500 ${validationState === 'SCANNING' ? 'effect-laser-scan' : ''}`}>
          <HexMatrixViewer
            payload={attackedEnvelope ? attackedEnvelope.public_payload || payload : payload}
            isAttacked={isLevelAttacked}
            attackType={displayLevel.attack_type}
          />
        </div>

        {/* Key Registry */}
        <div className="hud-box flex flex-col gap-4">
          <div className="text-xs uppercase font-mono tracking-widest text-muted border-b border-border pb-2 flex items-center gap-1.5">
            <Key size={14} className="text-neon-cyan" />
            <span>Key Registry Database</span>
          </div>
          <div className="flex flex-col gap-3 font-mono text-[10px] text-[#e2f1ff] overflow-y-auto pr-1" style={{ maxHeight: '230px' }}>
            {cryptoReady ? (
              <>
                <div className="p-2 border border-border/50 bg-surface/20 rounded">
                  <span className="text-neon-cyan font-bold uppercase tracking-wider text-[9px] block mb-1">🔑 PLAYER RSA KEY</span>
                  <div className="text-muted-foreground flex flex-col gap-0.5">
                    <div>ID: <span className="text-neon-cyan">{keys.player_key_id}</span></div>
                    <div className="truncate">FP: <span className="text-neon-cyan font-bold">{(keys.player_fingerprint || '').substring(0, 16)}...</span></div>
                    <div className="text-[8px] opacity-40 leading-none truncate mt-1">PEM: {(keys.player_public_key || '').substring(0, 45)}...</div>
                  </div>
                </div>
                <div className="p-2 border border-border/50 bg-surface/20 rounded">
                  <span className="text-neon-green font-bold uppercase tracking-wider text-[9px] block mb-1">🔑 BANK RSA KEY</span>
                  <div className="text-muted-foreground flex flex-col gap-0.5">
                    <div>ID: <span className="text-neon-cyan">{keys.bank_key_id}</span></div>
                    <div className="text-[8px] opacity-40 leading-none truncate mt-1">PEM: {(keys.bank_public_key || '').substring(0, 45)}...</div>
                  </div>
                </div>
                <div className="p-2 border border-border/50 bg-surface/20 rounded">
                  <span className="text-neon-amber font-bold uppercase tracking-wider text-[9px] block mb-1">🔑 AES SYMMETRIC KEY</span>
                  <div className="text-muted-foreground flex flex-col gap-0.5">
                    <div>ID: <span className="text-neon-cyan">{keys.symmetric_key_id}</span></div>
                    <div>Purpose: <span className="text-[#8bb3f2]">GCM Tunnel</span></div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-14 rounded bg-surface/30 animate-pulse border border-border/20" />
                ))}
                <p className="text-[10px] text-muted text-center animate-pulse">Đang tải khóa mật mã...</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Defense card deck */}
      <div className="hud-box">
        {defenseOptions.length > 0 ? (
          <CyberDefenseDeck
            defenseOptions={defenseOptions}
            selectedIds={selectedDefenses}
            onToggleDefense={handleToggleDefense}
            disabled={validationState === 'SCANNING' || validationState === 'SUCCESS' || validationState === 'FAILED'}
          />
        ) : (
          <div className="flex flex-col gap-3 p-2">
            <div className="text-xs uppercase font-mono tracking-widest text-muted border-b border-border pb-2">
              Bộ Bài Phòng Thủ — Đang tải...
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-24 rounded border border-border/20 bg-surface/20 animate-pulse" />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 4. Terminal log */}
      <TerminalLogConsole logs={logs} />

      {/* Verify Action Button */}
      <div className="flex justify-center mt-2">
        {validationState === 'IDLE' && (
          cryptoLoading ? (
            <button
              disabled
              className="px-12 py-4 border border-neon-amber/40 text-neon-amber font-mono text-sm uppercase tracking-widest rounded-md bg-[rgba(255,200,0,0.03)] flex items-center gap-2 opacity-70 cursor-wait"
            >
              <RefreshCw size={16} className="animate-spin" />
              Đang tải dữ liệu mật mã...
            </button>
          ) : (
            <button
              onClick={handleVerify}
              className="btn-cyber px-12 py-4 text-sm font-extrabold uppercase tracking-widest glow-cyan bg-[rgba(0,240,255,0.06)]"
            >
              [ KÍCH HOẠT XÁC MINH GIAO DỊCH ]
            </button>
          )
        )}

        {validationState === 'SCANNING' && (
          <button
            disabled
            className="px-12 py-4 border border-neon-cyan text-neon-cyan font-mono text-sm uppercase tracking-widest rounded-md bg-[rgba(0,240,255,0.02)] effect-laser-scan animate-pulse"
          >
            Đang chạy kiểm tra an ninh...
          </button>
        )}

        {(validationState === 'SUCCESS' || validationState === 'FAILED') && (
          <button
            onClick={() => setShowReport(true)}
            className={`px-12 py-4 border rounded-md font-mono text-sm uppercase tracking-widest font-extrabold transition-all duration-300 ${
              validationState === 'SUCCESS'
                ? 'border-neon-green text-neon-green bg-[rgba(57,255,20,0.06)] glow-green'
                : 'border-neon-pink text-neon-pink bg-[rgba(255,0,85,0.06)] glow-pink'
            }`}
          >
            [ XEM BÁO CÁO PHÁP Y ]
          </button>
        )}
      </div>

      {/* Forensic Report Modal */}
      {showReport && attemptResult && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
          <div className="hud-box max-w-2xl w-full flex flex-col gap-6 relative max-h-[90vh] overflow-y-auto"
            style={{ border: `1px solid ${attemptResult.is_success ? 'var(--neon-green)' : 'var(--neon-pink)'}` }}>

            <div className="absolute top-3 right-3">
              <button
                onClick={() => { SoundFX.playClick(); setShowReport(false); }}
                className="font-mono text-xs border border-border p-1 hover:border-neon-pink rounded text-muted uppercase"
              >
                [ Đóng ]
              </button>
            </div>

            <div className="flex items-center gap-4 border-b border-border/50 pb-4">
              <div className={`p-3 rounded-full border ${
                attemptResult.is_success
                  ? 'border-neon-green/30 text-neon-green bg-[rgba(57,255,20,0.03)]'
                  : 'border-neon-pink/30 text-neon-pink bg-[rgba(255,0,85,0.03)]'
              }`}>
                {attemptResult.is_success ? <CheckCircle size={36} /> : <AlertCircle size={36} />}
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-muted tracking-widest block">Kết quả phân tích an ninh</span>
                <h3 className={`text-lg font-bold uppercase tracking-wider ${attemptResult.is_success ? 'text-neon-green' : 'text-neon-pink'}`}>
                  {attemptResult.is_success ? 'NEUTRALIZED - PHÒNG THỦ THÀNH CÔNG' : 'INFILTRATED - HỆ THỐNG BỊ XÂM NHẬP'}
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="hud-box">
                <span className="text-[9px] font-mono text-muted uppercase tracking-widest block mb-1">SCORE RECOVERY</span>
                <span className={`text-2xl font-bold font-mono ${attemptResult.score_delta > 0 ? 'text-neon-cyan' : 'text-muted'}`}>
                  +{attemptResult.score_delta} PTS
                </span>
              </div>
              <div className="hud-box">
                <span className="text-[9px] font-mono text-muted uppercase tracking-widest block mb-1">FINAL TX STATUS</span>
                <span className={`text-2xl font-bold font-mono ${attemptResult.is_success ? 'text-neon-green' : 'text-neon-pink'}`}>
                  {attemptResult.result_status}
                </span>
              </div>
            </div>

            <div className="bg-[rgba(0,0,0,0.4)] p-4 rounded border border-border font-mono text-[11px] leading-relaxed text-[#e2f1ff] flex flex-col gap-2">
              <span className="text-neon-cyan font-bold uppercase text-[10px] tracking-widest border-b border-border/40 pb-1 flex items-center gap-1">
                <FileText size={12} />
                Báo cáo thực địa chi tiết
              </span>
              <div className="whitespace-pre-wrap mt-1 leading-relaxed">
                {attemptResult.explanation}
              </div>
            </div>

            {!attemptResult.is_success && (
              <div className="border border-neon-pink/30 rounded bg-[rgba(255,0,85,0.02)] p-3 text-[10px] font-mono text-muted flex gap-2">
                <span className="text-neon-pink font-bold">[GỢI Ý]</span>
                <p>Hãy xem kỹ loại tấn công ở tiêu đề, chọn thẻ bài phòng thủ tương ứng (ví dụ: Chữ ký số chống sửa đổi tiền, Replay Cache chống Replay, Key Fingerprint chống lỗi khóa).</p>
              </div>
            )}

            <div className="flex justify-end gap-4 border-t border-border/50 pt-4 font-mono text-xs">
              <button
                onClick={async () => { SoundFX.playClick(); await loadCrypto(); }}
                className="px-4 py-2 border border-border rounded hover:border-neon-cyan text-muted hover:text-[#e2f1ff]"
              >
                [ CHẠY LẠI THỬ THÁCH ]
              </button>

              {attemptResult.is_success ? (
                <button
                  onClick={() => { SoundFX.playClick(); onNavigate('CAMPAIGN'); }}
                  className="px-6 py-2 border border-neon-green bg-[rgba(57,255,20,0.05)] rounded hover:bg-[rgba(57,255,20,0.1)] text-neon-green font-bold flex items-center gap-1.5"
                >
                  TIẾP TỤC CHIẾN DỊCH
                  <ChevronRight size={14} />
                </button>
              ) : (
                <button
                  onClick={() => { SoundFX.playClick(); setShowReport(false); }}
                  className="px-6 py-2 border border-neon-pink bg-[rgba(255,0,85,0.05)] rounded hover:bg-[rgba(255,0,85,0.1)] text-neon-pink font-bold"
                >
                  ĐIỀU CHỈNH BỘ BÀI
                </button>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
