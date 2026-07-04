import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { SoundFX } from '../components/SoundFXController';
import { Shield, Trophy, Activity, Terminal, ShieldAlert, ChevronRight, Palette, Laptop } from 'lucide-react';

interface DashboardPageProps {
  onNavigate: (screen: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const token = useAuthStore(state => state.token);
  const user = useAuthStore(state => state.user);
  const profile = useAuthStore(state => state.profile);
  const updateTheme = useAuthStore(state => state.updateTheme);

  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch recent attempts history
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch('/api/history', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) {
          setHistory(data.data.slice(0, 4)); // Get top 4 recent
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [token]);

  const handleThemeChange = async (themeName: string) => {
    SoundFX.playClick();
    await updateTheme(themeName);
  };

  const handleLaunchSession = () => {
    SoundFX.playClick();
    onNavigate('GAMEPLAY');
  };

  const score = profile?.total_score || 0;
  const completedCount = profile?.completed_level_count || 0;
  const rank = profile?.operator_rank || 'NOVICE_OPERATOR';

  const rankNames: { [key: string]: string } = {
    NOVICE_OPERATOR: 'Novice Operator (Học viên An Ninh)',
    CYBER_GUARDIAN: 'Cyber Guardian (Hộ Vệ Không Gian Mạng)',
    CRYPTOGRAPHIC_SPECIALIST: 'Crypto Specialist (Chuyên Gia Mật Mã)',
    FORENSIC_MASTER: 'Forensic Master (Bậc Thầy Pháp Y)',
  };

  return (
    <div className="flex flex-col gap-6 p-4 max-w-6xl mx-auto">
      {/* 1. Header and greeting */}
      <div className="hud-box flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold uppercase tracking-wider text-neon-cyan glitch-text">
            SECURITY COMMAND CORE
          </h2>
          <p className="text-xs text-muted mt-1">
            Operator: <span className="text-[#e2f1ff] font-bold">{user?.full_name}</span> | Đăng nhập hệ thống trực tuyến MySQL an toàn.
          </p>
        </div>
        
        {/* Holographic Operator Rank badge */}
        <div className="flex items-center gap-3 px-3 py-1.5 border border-neon-cyan/30 rounded bg-[rgba(0,240,255,0.02)]">
          <Trophy size={16} className="text-neon-cyan animate-pulse" />
          <div className="flex flex-col font-mono text-[10px]">
            <span className="text-muted uppercase tracking-widest text-[8px]">Hệ thống Danh Hiệu</span>
            <span className="text-neon-cyan font-bold tracking-wider">{rankNames[rank] || rank}</span>
          </div>
        </div>
      </div>

      {/* 2. Theme Customizer HUD (Selected Theme picker) */}
      <div className="hud-box">
        <div className="flex items-center gap-2 text-xs uppercase font-mono text-muted border-b border-border pb-2 mb-3">
          <Palette size={14} className="text-neon-cyan" />
          <span>Operator Theme Customizer (Mở khóa giao diện tối màn)</span>
        </div>
        <div className="flex flex-wrap gap-3">
          {[
            { id: 'NEON_GRID', label: 'Neon Grid (Cyan)', glow: '#00f0ff' },
            { id: 'MATRIX_GREEN', label: 'Matrix Code (Green)', glow: '#39ff14' },
            { id: 'RED_ALERT', label: 'Red Alert (Crimson)', glow: '#ff0055' },
            { id: 'STEEL_HUD', label: 'Tactical Steel (Blue)', glow: '#8bb3f2' },
          ].map(t => {
            const isActive = profile?.selected_theme === t.id;
            return (
              <button
                key={t.id}
                onClick={() => handleThemeChange(t.id)}
                className={`px-4 py-2 border rounded font-mono text-xs uppercase tracking-wider transition-all duration-300 flex items-center gap-2 ${
                  isActive
                    ? 'border-neon-cyan text-neon-cyan bg-[rgba(0,240,255,0.05)] glow-cyan font-bold'
                    : 'border-border text-muted hover:border-neon-cyan/40 hover:text-neon-cyan'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.glow }}></span>
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. KPI Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="hud-box">
          <span className="text-[10px] font-mono uppercase text-muted tracking-widest block mb-2">TỔNG ĐIỂM CHIẾN DỊCH</span>
          <div className="flex justify-between items-baseline">
            <span className="text-3xl font-extrabold text-neon-cyan font-mono tracking-tight">{score}</span>
            <span className="text-[10px] text-muted-foreground font-mono">/ 800 pts</span>
          </div>
        </div>

        <div className="hud-box">
          <span className="text-[10px] font-mono uppercase text-muted tracking-widest block mb-2">Nhiệm Vụ Đã Khóa</span>
          <div className="flex justify-between items-baseline">
            <span className="text-3xl font-extrabold text-neon-cyan font-mono tracking-tight">{completedCount}</span>
            <span className="text-[10px] text-muted-foreground font-mono">/ 8 levels</span>
          </div>
        </div>

        <div className="hud-box">
          <span className="text-[10px] font-mono uppercase text-muted tracking-widest block mb-2">HỆ THỐNG KIỂM THỬ</span>
          <div className="flex justify-between items-baseline">
            <span className="text-3xl font-extrabold text-neon-cyan font-mono tracking-tight">6 / 6</span>
            <span className="text-[10px] text-neon-green font-mono font-bold animate-pulse">[ONLINE]</span>
          </div>
        </div>

        <div className="hud-box">
          <span className="text-[10px] font-mono uppercase text-muted tracking-widest block mb-2">UPTIME HOẠT ĐỘNG</span>
          <div className="flex justify-between items-baseline">
            <span className="text-3xl font-extrabold text-neon-cyan font-mono tracking-tight">99.9%</span>
            <span className="text-[10px] text-muted-foreground font-mono">SECURE</span>
          </div>
        </div>
      </div>

      {/* 4. Active campaign node shortcut & History */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Continue Mission node */}
        <div className="md:col-span-1 hud-box flex flex-col justify-between" style={{ minHeight: '260px' }}>
          <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-neon-cyan opacity-40"></div>
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-neon-cyan opacity-40"></div>

          <div>
            <span className="text-xs uppercase font-mono tracking-widest text-neon-cyan flex items-center gap-2 mb-4">
              <Laptop size={14} className="animate-pulse" />
              Active Operation Node
            </span>
            <h3 className="text-md font-bold uppercase tracking-wider text-[#e2f1ff] mb-1">
              Level {completedCount + 1 >= 8 ? 8 : completedCount + 1}
            </h3>
            <p className="text-[11px] text-muted leading-relaxed">
              Operator! Cuộc xâm nhập tiếp theo đang chờ bạn. Hãy cấu hình bộ bài phòng thủ mật mã để bảo vệ các tuyến dữ liệu khỏi Attacker.
            </p>
          </div>

          <button
            onClick={handleLaunchSession}
            className="btn-cyber w-full py-2.5 text-xs font-bold mt-4 flex items-center justify-center gap-2 bg-[rgba(0,240,255,0.03)] glow-cyan"
          >
            VẬN HÀNH THỬ THÁCH [PLAY LEVEL]
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Recent Incidents Table */}
        <div className="md:col-span-2 hud-box flex flex-col justify-between" style={{ minHeight: '260px' }}>
          <div>
            <span className="text-xs uppercase font-mono tracking-widest text-muted flex items-center gap-2 mb-4">
              <Activity size={14} className="text-neon-cyan" />
              Recent Cyber Incidents History
            </span>

            {loading ? (
              <div className="text-center py-8 font-mono text-xs text-muted animate-pulse">[ Loading incidents... ]</div>
            ) : history.length === 0 ? (
              <div className="text-center py-8 font-mono text-xs text-muted/40 uppercase tracking-widest">
                [ No security attempts recorded on MySQL DB yet ]
              </div>
            ) : (
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left font-mono text-[11px] leading-relaxed">
                  <thead>
                    <tr className="border-b border-border text-muted uppercase tracking-widest">
                      <th className="pb-2">Time</th>
                      <th className="pb-2">Level</th>
                      <th className="pb-2">Attack</th>
                      <th className="pb-2">Forensic Status</th>
                      <th className="pb-2 text-right">Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((row, idx) => {
                      const success = row.is_success === 1;
                      return (
                        <tr key={idx} className="border-b border-border/40 hover:bg-[rgba(0,240,255,0.01)] transition-colors">
                          <td className="py-2.5 text-muted">{new Date(row.created_at).toLocaleTimeString()}</td>
                          <td className="py-2.5 font-bold text-[#e2f1ff]">{row.level_title}</td>
                          <td className="py-2.5 text-neon-pink">{row.attack_type}</td>
                          <td className="py-2.5">
                            <span className={`px-2 py-0.5 border rounded text-[9px] ${
                              success 
                                ? 'border-neon-green/30 text-neon-green bg-[rgba(57,255,20,0.03)]' 
                                : 'border-neon-pink/30 text-neon-pink bg-[rgba(255,0,85,0.03)]'
                            }`}>
                              {success ? 'NEUTRALIZED' : 'INFILTRATED'}
                            </span>
                          </td>
                          <td className="py-2.5 text-right font-bold text-neon-cyan">+{row.score_delta}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="flex justify-end border-t border-border/40 pt-3 mt-4">
            <span className="text-[10px] font-mono text-neon-cyan hover:underline cursor-pointer flex items-center gap-1" onClick={() => onNavigate('HISTORY')}>
              Xem tất cả nhật ký &gt;
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};
