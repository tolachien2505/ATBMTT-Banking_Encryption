import React from 'react';
import { Shield, Fingerprint, Lock, Zap } from 'lucide-react';
import { SoundFX } from '../components/SoundFXController';

interface LandingPageProps {
  onNavigate: (screen: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  const handleStart = () => {
    SoundFX.playClick();
    onNavigate('LOGIN');
  };

  return (
    <div className="min-height-vh flex flex-col justify-between p-6 max-w-6xl mx-auto">
      {/* Header */}
      <header className="flex justify-between items-center py-4 border-b border-border">
        <span className="text-lg font-bold uppercase tracking-wider text-neon-cyan glitch-text">
          🛡️ CYBERBANK SEC v2.0
        </span>
        <button
          onClick={handleStart}
          className="btn-cyber text-xs"
        >
          ACCESS CORE [LOGIN]
        </button>
      </header>

      {/* Hero Section */}
      <main className="flex flex-col items-center text-center my-auto py-12 gap-6 relative">
        {/* Abstract futuristic grid center circle glow */}
        <div className="absolute w-[300px] h-[300px] rounded-full bg-[rgba(0,240,255,0.02)] blur-3xl z-0 pointer-events-none" />

        <h1 className="text-4xl md:text-6xl font-extrabold uppercase tracking-tight text-neon-cyan z-10 leading-none">
          FORTIFY DIGITAL <br/>
          <span className="glitch-text text-neon-pink">TRANSACTIONS</span>
        </h1>

        <p className="max-w-2xl text-muted text-sm md:text-base leading-relaxed z-10">
          Hãy bước vào hệ thống giả lập an ninh mạng ngân hàng tiên tiến nhất. Học bảo mật mật mã học thực chiến bằng cách chọn các thẻ bài phòng thủ để ngăn chặn các cuộc tấn công **Tampering**, **Replay**, **Giả mạo Chữ ký** và **Dùng sai khóa**.
        </p>

        <div className="z-10 mt-4">
          <button
            onClick={handleStart}
            className="btn-cyber text-sm px-8 py-3 bg-[rgba(0,240,255,0.05)] glow-cyan"
          >
            BẮT ĐẦU VẬN HÀNH [PLAY]
          </button>
        </div>
      </main>

      {/* Features Grid */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-6 py-6 border-t border-border z-10">
        <div className="hud-box">
          <div className="p-2 border border-border bg-[rgba(0,0,0,0.3)] rounded w-fit mb-3">
            <Lock size={18} className="text-neon-cyan animate-pulse" />
          </div>
          <h3 className="text-xs uppercase font-mono font-bold text-neon-cyan mb-1">AES-256-GCM</h3>
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Mã hóa có xác thực độ bảo mật quân sự, đảm bảo tính bí mật và phát hiện sửa đổi dữ liệu.
          </p>
        </div>

        <div className="hud-box">
          <div className="p-2 border border-border bg-[rgba(0,0,0,0.3)] rounded w-fit mb-3">
            <Fingerprint size={18} className="text-neon-green" />
          </div>
          <h3 className="text-xs uppercase font-mono font-bold text-neon-green mb-1">HMAC Guard</h3>
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Xác thực toàn vẹn thông điệp bằng khóa bí mật băm một chiều, chống sửa đổi số tiền giao dịch.
          </p>
        </div>

        <div className="hud-box">
          <div className="p-2 border border-border bg-[rgba(0,0,0,0.3)] rounded w-fit mb-3">
            <Shield size={18} className="text-neon-cyan" />
          </div>
          <h3 className="text-xs uppercase font-mono font-bold text-neon-cyan mb-1">RSA Signatures</h3>
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Chữ ký số khóa bất đối xứng, đảm bảo tính xác thực nguồn gửi và chống chối bỏ giao dịch.
          </p>
        </div>

        <div className="hud-box">
          <div className="p-2 border border-border bg-[rgba(0,0,0,0.3)] rounded w-fit mb-3">
            <Zap size={18} className="text-neon-amber" />
          </div>
          <h3 className="text-xs uppercase font-mono font-bold text-neon-amber mb-1">Replay Cache</h3>
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Bộ nhớ đệm duy nhất kết hợp Nonce và mốc thời gian tươi, chặn đứng cuộc tấn công gửi lại.
          </p>
        </div>
      </section>
    </div>
  );
};
