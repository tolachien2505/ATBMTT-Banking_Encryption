import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { SoundFX } from '../components/SoundFXController';
import { Trophy, Award, Medal, User, RefreshCw, Star, Zap } from 'lucide-react';

export const LeaderboardPage: React.FC = () => {
  const token = useAuthStore(state => state.token);
  const user = useAuthStore(state => state.user);

  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/game/leaderboard', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setLeaderboard(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [token]);

  const handleRefresh = () => {
    SoundFX.playClick();
    fetchLeaderboard();
  };

  const rankNames: { [key: string]: string } = {
    NOVICE_OPERATOR: 'Học Viên An Ninh',
    CYBER_GUARDIAN: 'Hộ Vệ Mạng',
    CRYPTOGRAPHIC_SPECIALIST: 'Chuyên Gia Mật Mã',
    FORENSIC_MASTER: 'Bậc Thầy Pháp Y',
  };

  // Top 3 Podium
  const topThree = leaderboard.slice(0, 3);
  const remaining = leaderboard.slice(3);

  return (
    <div className="flex flex-col gap-6 p-4 max-w-6xl mx-auto pb-16 animate-fade-in">
      
      {/* Page Header */}
      <div className="hud-box flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative">
        <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-neon-cyan opacity-40"></div>
        <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-neon-cyan opacity-40"></div>

        <div>
          <h2 className="text-xl font-bold uppercase tracking-wider text-neon-cyan glitch-text">
            🏆 BẢNG VÀNG DANH VỌNG OPERATOR (LEADERBOARD)
          </h2>
          <p className="text-xs text-muted mt-1 font-mono">
            [Bảng xếp hạng trực tuyến] | Tôn vinh các chiến binh an ninh mạng có điểm số khôi phục giao dịch cao nhất hệ thống.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          className="btn-cyber text-xs flex items-center gap-1.5"
          disabled={loading}
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Đang cập nhật...' : 'CẬP NHẬT BẢNG'}
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-4 font-mono text-xs text-muted animate-pulse">
          <RefreshCw size={24} className="animate-spin text-neon-cyan" />
          <span>ĐANG KẾT NỐI MÁY CHỦ MYSQL ĐỂ TẢI BẢNG XẾP HẠNG...</span>
        </div>
      ) : (
        <>
          {/* Top 3 Podium Cards */}
          {topThree.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end my-4">
              
              {/* Rank 2 */}
              {topThree[1] && (
                <div className="hud-box border-neon-cyan/40 bg-[rgba(0,240,255,0.02)] flex flex-col items-center p-6 relative order-2 md:order-1" style={{ minHeight: '220px' }}>
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#050814] px-4 py-0.5 border border-neon-cyan rounded font-mono text-[10px] text-neon-cyan">
                    HẠNG #2
                  </div>
                  <Medal size={36} className="text-[#c0c0c0] mt-2 drop-shadow-[0_0_8px_rgba(192,192,192,0.4)] animate-bounce" />
                  <span className="text-sm font-bold mt-3 text-white uppercase tracking-wider">{topThree[1].display_name}</span>
                  <span className="text-[10px] text-muted font-mono mt-1">{rankNames[topThree[1].operator_rank] || topThree[1].operator_rank}</span>
                  <div className="border-t border-border/40 w-full my-3"></div>
                  <span className="text-neon-cyan font-bold font-mono text-lg">{topThree[1].total_score} ĐIỂM</span>
                  <span className="text-[9px] text-muted-foreground mt-1 font-mono">Ải đã xong: {topThree[1].completed_level_count}/5</span>
                </div>
              )}

              {/* Rank 1 (Center Column - Tallest) */}
              {topThree[0] && (
                <div className="hud-box border-neon-green/60 bg-[rgba(57,255,20,0.03)] flex flex-col items-center p-8 relative order-1 md:order-2 glow-green" style={{ minHeight: '260px' }}>
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#050814] px-5 py-0.5 border border-neon-green rounded font-mono text-[11px] font-bold text-neon-green animate-pulse">
                    🏆 QUÁN QUÂN
                  </div>
                  <Trophy size={48} className="text-[#ffd700] drop-shadow-[0_0_15px_rgba(255,215,0,0.6)] animate-pulse mt-1" />
                  <span className="text-md font-extrabold mt-3 text-[#39ff14] uppercase tracking-widest text-center">{topThree[0].display_name}</span>
                  <span className="text-[10px] text-neon-cyan font-bold font-mono mt-1">{rankNames[topThree[0].operator_rank] || topThree[0].operator_rank}</span>
                  <div className="border-t border-neon-green/20 w-full my-3"></div>
                  <span className="text-neon-green font-extrabold font-mono text-2xl tracking-wide">{topThree[0].total_score} ĐIỂM</span>
                  <span className="text-[10px] text-white/70 font-mono font-bold mt-1">Ải đã xong: {topThree[0].completed_level_count}/5</span>
                </div>
              )}

              {/* Rank 3 */}
              {topThree[2] && (
                <div className="hud-box border-neon-cyan/40 bg-[rgba(0,240,255,0.02)] flex flex-col items-center p-6 relative order-3" style={{ minHeight: '200px' }}>
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#050814] px-4 py-0.5 border border-neon-cyan rounded font-mono text-[10px] text-neon-cyan">
                    HẠNG #3
                  </div>
                  <Medal size={36} className="text-[#cd7f32] mt-2 drop-shadow-[0_0_8px_rgba(205,127,50,0.4)]" />
                  <span className="text-sm font-bold mt-3 text-white uppercase tracking-wider">{topThree[2].display_name}</span>
                  <span className="text-[10px] text-muted font-mono mt-1">{rankNames[topThree[2].operator_rank] || topThree[2].operator_rank}</span>
                  <div className="border-t border-border/40 w-full my-3"></div>
                  <span className="text-neon-cyan font-bold font-mono text-lg">{topThree[2].total_score} ĐIỂM</span>
                  <span className="text-[9px] text-muted-foreground mt-1 font-mono">Ải đã xong: {topThree[2].completed_level_count}/5</span>
                </div>
              )}

            </div>
          )}

          {/* Leaderboard Table (Ranks 4+) */}
          <div className="hud-box flex flex-col gap-4">
            <div className="text-xs uppercase font-mono tracking-widest text-muted border-b border-border pb-2 flex items-center gap-1.5">
              <Star size={14} className="text-neon-cyan" />
              <span>Thứ Hạng Các Operator Tiếp Theo</span>
            </div>

            {remaining.length === 0 && leaderboard.length <= 3 ? (
              <div className="text-center py-6 font-mono text-[11px] text-muted/50 uppercase">
                [ Hết danh sách bảng vàng ]
              </div>
            ) : (
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left font-mono text-[11px] leading-relaxed">
                  <thead>
                    <tr className="border-b border-border text-muted uppercase tracking-widest text-[10px]">
                      <th className="pb-2">Thứ Hạng</th>
                      <th className="pb-2">Operator (Họ và Tên)</th>
                      <th className="pb-2">Danh Hiệu Chiến Trường</th>
                      <th className="pb-2 text-center">Ải Hoàn Thành</th>
                      <th className="pb-2 text-right">Tổng Điểm</th>
                    </tr>
                  </thead>
                  <tbody>
                    {remaining.map((row, idx) => {
                      const rank = idx + 4;
                      const isCurrentUser = user?.full_name === row.display_name;
                      return (
                        <tr
                          key={idx}
                          className={`border-b border-border/40 hover:bg-[rgba(0,240,255,0.02)] transition-colors ${
                            isCurrentUser ? 'bg-[rgba(0,240,255,0.04)] border-l-2 border-l-neon-cyan' : ''
                          }`}
                        >
                          <td className="py-2.5 font-bold text-muted pl-2">#{rank}</td>
                          <td className={`py-2.5 font-bold flex items-center gap-1.5 ${isCurrentUser ? 'text-neon-cyan' : 'text-white'}`}>
                            <User size={12} className={isCurrentUser ? 'text-neon-cyan animate-pulse' : 'text-muted'} />
                            {row.display_name}
                            {isCurrentUser && <span className="text-[8px] font-bold border border-neon-cyan px-1 py-0.5 rounded ml-1 bg-[rgba(0,240,255,0.05)] animate-pulse">BẠN</span>}
                          </td>
                          <td className="py-2.5 text-muted-foreground">{rankNames[row.operator_rank] || row.operator_rank}</td>
                          <td className="py-2.5 text-center text-muted">{row.completed_level_count} / 5 Ải</td>
                          <td className="py-2.5 text-right font-extrabold text-neon-cyan pr-2">+{row.total_score} pts</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

    </div>
  );
};
