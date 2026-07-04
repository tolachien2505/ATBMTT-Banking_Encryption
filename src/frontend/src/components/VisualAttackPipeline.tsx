import React from 'react';
import { motion } from 'framer-motion';
import { Shield, ShieldAlert, Cpu, Radio, ShieldCheck } from 'lucide-react';

interface VisualAttackPipelineProps {
  isAttacked: boolean;
  validationState: 'IDLE' | 'SCANNING' | 'SUCCESS' | 'FAILED';
  attackType: string;
}

export const VisualAttackPipeline: React.FC<VisualAttackPipelineProps> = ({
  isAttacked,
  validationState,
  attackType,
}) => {
  return (
    <div className="w-full bg-terminal border border-border p-6 rounded-lg relative overflow-hidden flex flex-col justify-between" style={{ minHeight: '260px' }}>
      {/* HUD corner borders */}
      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-neon-cyan opacity-40"></div>
      <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-neon-cyan opacity-40"></div>
      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-neon-cyan opacity-40"></div>
      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-neon-cyan opacity-40"></div>

      {/* Background Holographic Sweep */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[rgba(0,240,255,0.02)] to-transparent pointer-events-none" />

      {/* HUD Header */}
      <div className="flex justify-between items-center mb-4 z-10">
        <span className="text-xs uppercase font-mono tracking-widest text-muted-foreground flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-neon-cyan animate-pulse"></span>
          Giám Sát Đường Truyền An Ninh Mạng
        </span>
        {isAttacked && (
          <span className="text-xs font-mono font-bold uppercase tracking-widest px-2 py-0.5 border border-neon-pink text-neon-pink rounded bg-[rgba(255,0,85,0.05)] animate-pulse">
            PHÁT HIỆN TẤN CÔNG: {attackType}
          </span>
        )}
      </div>

      {/* SVG Pipeline Map */}
      <div className="w-full flex justify-between items-center relative my-auto py-4 z-10">
        {/* Connection Lines (Cables) */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ minHeight: '80px' }}>
          {/* Cable 1 */}
          <line x1="15%" y1="50%" x2="50%" y2="50%" stroke="var(--color-border)" strokeWidth="2" strokeDasharray="5,5" className="animate-[spin_10s_linear_infinite]" />
          {/* Cable 2 */}
          <line x1="50%" y1="50%" x2="85%" y2="50%" stroke="var(--color-border)" strokeWidth="2" strokeDasharray="5,5" />

          {/* Animated flowing data packets */}
          {validationState === 'SCANNING' && (
            <>
              {/* Photon 1 */}
              <motion.circle
                cx="15%"
                cy="50%"
                r="5"
                fill={isAttacked ? 'var(--neon-pink)' : 'var(--neon-cyan)'}
                initial={{ cx: '15%' }}
                animate={{ cx: ['15%', '50%', '85%'] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              />
              {/* Photon 2 */}
              <motion.circle
                cx="15%"
                cy="50%"
                r="3"
                fill={isAttacked ? 'var(--neon-pink)' : 'var(--neon-cyan)'}
                initial={{ cx: '15%' }}
                animate={{ cx: ['15%', '50%', '85%'] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear', delay: 0.5 }}
              />
            </>
          )}

          {/* Shockwaves if failed */}
          {validationState === 'FAILED' && (
            <motion.circle
              cx="85%"
              cy="50%"
              r="30"
              stroke="var(--neon-pink)"
              strokeWidth="1.5"
              fill="transparent"
              initial={{ r: 10, opacity: 0.8 }}
              animate={{ r: 80, opacity: 0 }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          )}

          {/* Defending pulse if success */}
          {validationState === 'SUCCESS' && (
            <motion.circle
              cx="85%"
              cy="50%"
              r="30"
              stroke="var(--neon-green)"
              strokeWidth="2"
              fill="transparent"
              initial={{ r: 10, opacity: 0.8 }}
              animate={{ r: 60, opacity: 0 }}
              transition={{ duration: 1 }}
            />
          )}
        </svg>

        {/* Node 1: Client Node */}
        <div className="flex flex-col items-center z-10 w-1/4">
          <div className="w-12 h-12 rounded-full border border-neon-cyan flex items-center justify-center bg-surface relative glow-cyan">
            <Cpu size={20} className="text-neon-cyan" />
            {validationState === 'SCANNING' && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-cyan opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-neon-cyan"></span>
              </span>
            )}
          </div>
          <span className="text-[10px] font-mono tracking-widest text-muted mt-2 uppercase">Khách Hàng (Client)</span>
        </div>

        {/* Node 2: Attacker Node (MITM Infiltrator) */}
        <div className="flex flex-col items-center z-10 w-1/4">
          <div className={`w-12 h-12 rounded-full border flex items-center justify-center bg-surface relative ${
            isAttacked 
              ? 'border-neon-pink glow-pink text-neon-pink' 
              : 'border-border text-muted-foreground'
          }`}>
            <Radio size={20} className={isAttacked ? 'animate-pulse' : ''} />
            {isAttacked && (
              <motion.div
                className="absolute inset-0 rounded-full border border-neon-pink"
                animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}
          </div>
          <span className={`text-[10px] font-mono tracking-widest mt-2 uppercase ${isAttacked ? 'text-neon-pink font-bold' : 'text-muted'}`}>
            {isAttacked ? 'Hacker Chặn Lén' : 'Truyền An Toàn'}
          </span>
        </div>

        {/* Node 3: Bank Validator (Core Node) */}
        <div className="flex flex-col items-center z-10 w-1/4">
          <div className={`w-14 h-14 rounded-full border flex items-center justify-center bg-surface relative transition-all duration-300 ${
            validationState === 'SUCCESS' ? 'border-neon-green glow-green text-neon-green' :
            validationState === 'FAILED' ? 'border-neon-pink glow-pink text-neon-pink animate-[bounce_0.2s_2]' :
            validationState === 'SCANNING' ? 'border-neon-cyan glow-cyan text-neon-cyan' :
            'border-border text-muted-foreground'
          }`}>
            {validationState === 'SUCCESS' ? <ShieldCheck size={28} /> :
             validationState === 'FAILED' ? <ShieldAlert size={28} className="animate-bounce" /> :
             <Shield size={24} />}

            {/* Glowing sweep bar inside Node */}
            {validationState === 'SCANNING' && (
              <motion.div
                className="absolute left-0 right-0 h-0.5 bg-neon-cyan z-20"
                animate={{ top: ['10%', '90%', '10%'] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              />
            )}
          </div>
          <span className={`text-[10px] font-mono tracking-widest mt-2 uppercase ${
            validationState === 'SUCCESS' ? 'text-neon-green font-bold' :
            validationState === 'FAILED' ? 'text-neon-pink font-bold' :
            'text-muted'
          }`}>
            Ngân Hàng Xác Minh
          </span>
        </div>
      </div>

      {/* Connection pipeline stats */}
      <div className="grid grid-cols-3 gap-2 border-t border-border pt-4 mt-2 font-mono text-[10px] text-muted z-10">
        <div>
          TRẠNG THÁI: <span className={validationState === 'SUCCESS' ? 'text-neon-green font-bold' : validationState === 'FAILED' ? 'text-neon-pink font-bold' : 'text-neon-cyan'}>
            {validationState === 'SUCCESS' ? 'AN TOÀN [OK]' : validationState === 'FAILED' ? 'BỊ CHẶN [BLOCKED]' : validationState === 'SCANNING' ? 'ĐANG QUÉT...' : 'ĐANG CHỜ'}
          </span>
        </div>
        <div className="text-center">
          TOÀN VẸN: <span className={isAttacked && validationState === 'FAILED' ? 'text-neon-pink' : 'text-neon-green'}>
            {isAttacked && validationState !== 'SUCCESS' ? 'BỊ THAY ĐỔI' : 'NGUYÊN VẸN'}
          </span>
        </div>
        <div className="text-right">
          GIẢI MÃ: <span className="text-neon-cyan">{validationState === 'SUCCESS' ? 'AES-GCM-OK' : 'ĐANG CHỜ'}</span>
        </div>
      </div>
    </div>
  );
};
