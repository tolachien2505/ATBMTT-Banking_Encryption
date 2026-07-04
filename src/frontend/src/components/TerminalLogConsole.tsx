import React, { useEffect, useRef } from 'react';
import { Terminal, ShieldAlert, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

interface LogRow {
  severity: 'INFO' | 'WARN' | 'ERROR' | 'SECURITY' | 'SUCCESS';
  eventType: string;
  message: string;
  created_at?: string;
}

interface TerminalLogConsoleProps {
  logs: LogRow[];
  onSelectEvidence?: (log: LogRow) => void;
  selectedEvidence?: LogRow | null;
  interactiveMode?: boolean;
}

const severityColors: { [key: string]: string } = {
  INFO: 'text-neon-cyan',
  WARN: 'text-neon-amber',
  ERROR: 'text-neon-pink font-bold',
  SECURITY: 'text-neon-pink font-bold blink',
  SUCCESS: 'text-neon-green font-bold',
};

export const TerminalLogConsole: React.FC<TerminalLogConsoleProps> = ({
  logs,
  onSelectEvidence,
  selectedEvidence,
  interactiveMode = false,
}) => {
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom when new logs arrive
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const handleRowClick = (log: LogRow) => {
    if (interactiveMode && onSelectEvidence) {
      onSelectEvidence(log);
    }
  };

  return (
    <div className="w-full bg-[#04060c] border border-border rounded-lg relative overflow-hidden flex flex-col" style={{ height: '220px' }}>
      {/* Top Bar Terminal HUD */}
      <div className="flex justify-between items-center bg-[#090e1a] px-4 py-2 border-b border-border z-10">
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-neon-cyan">
          <Terminal size={14} className="animate-pulse" />
          <span>Operator System Logs [tail -f /var/log/security/validator.log]</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-neon-pink"></span>
          <span className="w-2.5 h-2.5 rounded-full bg-neon-amber"></span>
          <span className="w-2.5 h-2.5 rounded-full bg-neon-green"></span>
        </div>
      </div>

      {/* Terminal Screen Console */}
      <div className="flex-grow p-4 overflow-y-auto font-mono text-xs leading-relaxed text-[#5a738e] select-text">
        {logs.length === 0 ? (
          <div className="text-center py-8 text-muted/40 uppercase tracking-widest animate-pulse">
            [ Waiting for operator activation... ]
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {logs.map((log, idx) => {
              const isSelected = selectedEvidence?.message === log.message;
              const sevColor = severityColors[log.severity] || 'text-[#e2f1ff]';
              
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.15, delay: idx * 0.05 }}
                  onClick={() => handleRowClick(log)}
                  className={`flex items-start gap-2 py-0.5 px-2 rounded transition-all duration-200 ${
                    interactiveMode ? 'cursor-pointer hover:bg-[rgba(0,240,255,0.03)]' : ''
                  } ${
                    isSelected ? 'border border-neon-cyan bg-[rgba(0,240,255,0.05)] glow-cyan' : ''
                  }`}
                >
                  <span className="text-[#00f0ff] opacity-40">[{new Date().toLocaleTimeString()}]</span>
                  <span className={`uppercase font-bold tracking-wider ${sevColor}`}>
                    [{log.severity}]
                  </span>
                  <span className="text-neon-cyan opacity-80">{log.eventType}:</span>
                  <span className={`flex-grow text-[#e2f1ff] ${
                    log.severity === 'SECURITY' ? 'text-neon-pink font-semibold' : ''
                  }`}>
                    {log.message}
                  </span>
                  {log.severity === 'SUCCESS' && <ShieldCheck size={12} className="text-neon-green ml-2 mt-0.5 animate-pulse" />}
                  {log.severity === 'SECURITY' && <ShieldAlert size={12} className="text-neon-pink ml-2 mt-0.5 animate-pulse" />}
                </motion.div>
              );
            })}
            <div ref={terminalEndRef} />
          </div>
        )}
      </div>

      {interactiveMode && (
        <div className="bg-[#090e1a] border-t border-border px-4 py-1.5 text-[10px] font-mono text-muted flex justify-between items-center z-10">
          <span>🎯 FORENSICS MODE: Bấm chọn dòng log chứa bằng chứng tấn công</span>
          {selectedEvidence ? (
            <span className="text-neon-green font-bold blink">[BẰNG CHỨNG ĐÃ CHỌN]</span>
          ) : (
            <span className="text-neon-amber blink">[ĐANG CHỜ CHỌN...]</span>
          )}
        </div>
      )}
    </div>
  );
};
