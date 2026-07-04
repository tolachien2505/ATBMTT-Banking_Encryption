import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { SoundFX } from '../components/SoundFXController';
import { Laptop, Play, CheckCircle, Lock } from 'lucide-react';

interface CampaignPageProps {
  onNavigate: (screen: string) => void;
  onSelectLevel: (levelId: string, levelMeta: any) => void;
}

export const CampaignPage: React.FC<CampaignPageProps> = ({ onNavigate, onSelectLevel }) => {
  const token = useAuthStore(state => state.token);
  const profile = useAuthStore(state => state.profile);

  const [levels, setLevels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLevels = async () => {
      try {
        const res = await fetch('/api/game/levels', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) {
          setLevels(data.data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchLevels();
  }, [token]);

  const handleLaunchLevel = (lvl: any) => {
    const totalScore = profile?.total_score || 0;
    const isUnlocked = totalScore >= lvl.unlock_score_required;
    
    if (!isUnlocked) {
      SoundFX.playAlarm();
      alert(`Khóa an ninh! Bạn cần đạt tối thiểu ${lvl.unlock_score_required} điểm để mở khóa thử thách này.`);
      return;
    }

    SoundFX.playClick();
    // Pass full level metadata so GameplayPage can render instantly
    onSelectLevel(lvl.level_id, lvl);
    onNavigate('GAMEPLAY');
  };

  const totalScore = profile?.total_score || 0;

  return (
    <div className="flex flex-col gap-6 p-4 max-w-6xl mx-auto">
      {/* HUD Header */}
      <div className="hud-box">
        <h2 className="text-xl font-bold uppercase tracking-wider text-neon-cyan glitch-text">
          TACTICAL NETWORK CAMPAIGN MAP
        </h2>
        <p className="text-xs text-muted mt-1 font-mono">
          [Operator Score: {totalScore} pts] | Bản đồ nút mạng an ninh. Đạt điểm số yêu cầu để giải mật các tuyến phòng thủ nâng cao.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-16 font-mono text-xs text-muted animate-pulse">[ Loading secure nodes... ]</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {levels.map((lvl) => {
            const isUnlocked = totalScore >= lvl.unlock_score_required;
            const completed = lvl.is_completed;

            return (
              <div
                key={lvl.level_id}
                onClick={() => handleLaunchLevel(lvl)}
                className={`hud-box cursor-pointer flex flex-col justify-between transition-all duration-300 ${
                  isUnlocked
                    ? completed
                      ? 'border-neon-green/40 hover:border-neon-green glow-green bg-[rgba(57,255,20,0.01)]'
                      : 'border-neon-cyan/40 hover:border-neon-cyan glow-cyan'
                    : 'border-border/40 opacity-50 cursor-not-allowed'
                }`}
                style={{ minHeight: '190px' }}
              >
                <div>
                  {/* Status Badge */}
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] font-mono text-muted uppercase">Level {lvl.level_no}</span>
                    {completed ? (
                      <span className="text-[9px] font-mono text-neon-green border border-neon-green/30 px-2 py-0.5 rounded bg-[rgba(57,255,20,0.03)] flex items-center gap-1">
                        <CheckCircle size={10} className="animate-pulse" />
                        SECURED
                      </span>
                    ) : isUnlocked ? (
                      <span className="text-[9px] font-mono text-neon-cyan border border-neon-cyan/30 px-2 py-0.5 rounded bg-[rgba(0,240,255,0.03)] animate-pulse">
                        AVAILABLE
                      </span>
                    ) : (
                      <span className="text-[9px] font-mono text-neon-pink border border-neon-pink/30 px-2 py-0.5 rounded bg-[rgba(255,0,85,0.03)] flex items-center gap-1">
                        <Lock size={10} />
                        LOCKED
                      </span>
                    )}
                  </div>

                  {/* Level Info */}
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[#e2f1ff] mb-1">
                    {lvl.title}
                  </h3>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono mb-2 text-neon-cyan">
                    ATTACK: {lvl.attack_type}
                  </p>

                  <div className="border-t border-border/40 my-2 pt-2 text-[10px] font-mono text-muted flex flex-col gap-1">
                    <div>DIFF: <span className="text-neon-cyan">{lvl.difficulty}</span></div>
                    <div>CONCEPT: <span className="text-neon-cyan">{lvl.scenario_type}</span></div>
                  </div>
                </div>

                {/* Score cost and Play Action */}
                <div className="border-t border-border/40 pt-3 mt-4 flex justify-between items-center text-[10px] font-mono">
                  <span className="text-muted">
                    {isUnlocked 
                      ? `MAX SCORE: ${lvl.max_score} pts` 
                      : `REQUIRES: ${lvl.unlock_score_required} pts`}
                  </span>
                  {isUnlocked ? (
                    <span className="text-neon-cyan flex items-center gap-1 font-bold group">
                      LAUNCH <Play size={10} className="group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  ) : (
                    <span className="text-neon-pink flex items-center gap-1">
                      ENCRYPTED <Lock size={10} />
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
