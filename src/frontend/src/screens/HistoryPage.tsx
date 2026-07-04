import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { SoundFX } from '../components/SoundFXController';
import { TerminalLogConsole } from '../components/TerminalLogConsole';
import { Activity, ShieldCheck, ShieldAlert, BookOpen, Clock } from 'lucide-react';

export const HistoryPage: React.FC = () => {
  const token = useAuthStore(state => state.token);

  const [attempts, setAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAttempt, setSelectedAttempt] = useState<any | null>(null);
  const [attemptLogs, setAttemptLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch('/api/history', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) {
          setAttempts(data.data);
          if (data.data.length > 0) {
            handleSelectAttempt(data.data[0]);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [token]);

  const handleSelectAttempt = async (attempt: any) => {
    SoundFX.playClick();
    setSelectedAttempt(attempt);
    setLogsLoading(true);
    try {
      const res = await fetch(`/api/history/attempts/${attempt.attempt_id}/logs`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setAttemptLogs(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLogsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-4 max-w-6xl mx-auto">
      {/* HUD Header */}
      <div className="hud-box">
        <h2 className="text-xl font-bold uppercase tracking-wider text-neon-cyan glitch-text">
          OPERATIONAL FORENSICS DATABASE
        </h2>
        <p className="text-xs text-muted mt-1 font-mono">
          [Lưu trữ lịch sử an ninh MySQL ngoại vi] | Chọn các lần thử nghiệm (Attempts) của Operator để phân tích pháp y các chuỗi log sự cố mật mã học.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Attempts list */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <div className="hud-box flex flex-col justify-between" style={{ minHeight: '340px' }}>
            <span className="text-xs uppercase font-mono tracking-widest text-muted flex items-center gap-2 border-b border-border pb-2 mb-3">
              <Clock size={14} className="text-neon-cyan" />
              Operator Attempts Stack
            </span>

            {loading ? (
              <div className="text-center py-12 font-mono text-xs text-muted animate-pulse">[ Loading secure records... ]</div>
            ) : attempts.length === 0 ? (
              <div className="text-center py-12 font-mono text-xs text-muted/40 uppercase tracking-widest">
                [ No operator logs in database ]
              </div>
            ) : (
              <div className="overflow-y-auto pr-1 flex flex-col gap-2 flex-grow" style={{ maxHeight: '380px' }}>
                {attempts.map((attempt) => {
                  const isActive = selectedAttempt?.attempt_id === attempt.attempt_id;
                  const success = attempt.is_success === 1;

                  return (
                    <div
                      key={attempt.attempt_id}
                      onClick={() => handleSelectAttempt(attempt)}
                      className={`p-3 border rounded cursor-pointer transition-all duration-200 flex items-center justify-between ${
                        isActive
                          ? 'border-neon-cyan bg-[rgba(0,240,255,0.04)] glow-cyan'
                          : 'border-border bg-surface/30 hover:border-neon-cyan/40 hover:bg-surface/50'
                      }`}
                    >
                      <div className="flex flex-col font-mono text-[10px]">
                        <span className="font-bold text-[#e2f1ff] text-xs truncate max-w-[150px]">
                          {attempt.level_title}
                        </span>
                        <span className="text-muted mt-0.5">Attempt #{attempt.attempt_no}</span>
                        <span className="text-neon-pink mt-0.5">ATTACK: {attempt.attack_type}</span>
                      </div>
                      <div className="flex flex-col items-end gap-1 font-mono text-[10px]">
                        <span className={success ? 'text-neon-green font-bold' : 'text-neon-pink font-bold'}>
                          {success ? 'ACCEPTED' : 'INFILTRATED'}
                        </span>
                        <span className="text-neon-cyan">+{attempt.score_delta} pts</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right column: Forensic Details Panel */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="hud-box flex flex-col gap-4" style={{ minHeight: '440px' }}>
            <span className="text-xs uppercase font-mono tracking-widest text-muted flex items-center gap-2 border-b border-border pb-2">
              <BookOpen size={14} className="text-neon-cyan animate-pulse" />
              Incidents Analysis Report
            </span>

            {selectedAttempt ? (
              <div className="flex flex-col gap-4 flex-grow justify-between">
                {/* Attempt Summary */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[rgba(0,0,0,0.3)] p-3 border border-border rounded font-mono text-[11px]">
                  <div>
                    <span className="text-muted text-[9px] uppercase tracking-wider block">ATTEMPT_ID</span>
                    <span className="text-neon-cyan font-bold">{selectedAttempt.attempt_id.substring(0, 8)}...</span>
                  </div>
                  <div>
                    <span className="text-muted text-[9px] uppercase tracking-wider block">MESSAGE_ID</span>
                    <span className="text-neon-cyan font-bold">{selectedAttempt.message_id}</span>
                  </div>
                  <div>
                    <span className="text-muted text-[9px] uppercase tracking-wider block">ATTACK TYPE</span>
                    <span className="text-neon-pink font-bold">{selectedAttempt.attack_type}</span>
                  </div>
                  <div>
                    <span className="text-muted text-[9px] uppercase tracking-wider block">RESULTING STATUS</span>
                    <span className={selectedAttempt.is_success === 1 ? 'text-neon-green font-bold' : 'text-neon-pink font-bold'}>
                      {selectedAttempt.is_success === 1 ? 'SECURE BLOCK' : 'EXPLOITED'}
                    </span>
                  </div>
                </div>

                {/* Simulated Envelope Payload details */}
                <div className="border border-border p-3 rounded bg-[#04060c] font-mono text-[10px] text-[#5a738e]">
                  <span className="text-neon-cyan text-[10px] font-bold block mb-2 uppercase">[+] Captured Transaction Metadata</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>Original Amount: <span className="text-neon-green">{selectedAttempt.original_amount.toLocaleString()} VND</span></div>
                    <div>Submitted Amount: <span className={selectedAttempt.original_amount !== selectedAttempt.submitted_amount ? 'text-neon-pink font-bold' : 'text-[#e2f1ff]'}>{selectedAttempt.submitted_amount.toLocaleString()} VND</span></div>
                    <div>Session ID: <span className="text-[#8bb3f2]">{selectedAttempt.tx_id.substring(0, 16)}...</span></div>
                    <div>Created At: <span className="text-muted">{new Date(selectedAttempt.created_at).toLocaleString()}</span></div>
                  </div>
                </div>

                {/* Validation Console Logs */}
                <div className="flex-grow">
                  <span className="text-xs uppercase font-mono tracking-widest text-muted block mb-2">📜 Security Logs evidence trace</span>
                  {logsLoading ? (
                    <div className="text-center py-10 font-mono text-xs text-muted animate-pulse">[ Loading logs... ]</div>
                  ) : (
                    <TerminalLogConsole logs={attemptLogs} />
                  )}
                </div>
              </div>
            ) : (
              <div className="my-auto text-center font-mono text-xs text-muted/40 uppercase tracking-widest">
                [ No attempt selected for analysis ]
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
