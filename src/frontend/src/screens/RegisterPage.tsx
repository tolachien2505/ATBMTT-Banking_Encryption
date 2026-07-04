import React, { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { SoundFX } from '../components/SoundFXController';
import { ShieldCheck, Radio, Eye, EyeOff } from 'lucide-react';

interface RegisterPageProps {
  onNavigate: (screen: string) => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onNavigate }) => {
  const setAuth = useAuthStore(state => state.setAuth);
  const setProfile = useAuthStore(state => state.setProfile);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    SoundFX.playClick();

    if (!fullName || !email || !password || !confirmPassword) return;
    if (password !== confirmPassword) {
      SoundFX.playAlarm();
      setError('Mật khẩu xác nhận không trùng khớp.');
      return;
    }
    if (!agreed) {
      SoundFX.playAlarm();
      setError('Vui lòng đồng ý với các điều khoản bảo mật.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, full_name: fullName }),
      });
      const data = await res.json();
      
      if (data.success) {
        SoundFX.playSuccess();
        setAuth(data.data.tokens.accessToken, data.data.user, data.data.session_id);
        
        // Fetch full profile immediately
        const meRes = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${data.data.tokens.accessToken}` },
        });
        const meData = await meRes.json();
        if (meData.success) {
          setProfile(meData.data.profile);
        }

        onNavigate('DASHBOARD');
      } else {
        SoundFX.playAlarm();
        setError(data.error === 'EMAIL_ALREADY_EXISTS' 
          ? 'Email này đã được đăng ký hệ thống.' 
          : 'Lỗi đăng ký tài khoản. Vui lòng kiểm tra lại.');
      }
    } catch (e) {
      SoundFX.playAlarm();
      setError('Lỗi kết nối cơ sở dữ liệu MySQL trực tuyến. Hãy thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-height-vh flex items-center justify-center p-6 relative max-w-4xl mx-auto">
      {/* Background Holographic Vector Grid */}
      <div className="absolute w-[250px] h-[250px] rounded-full bg-[rgba(0,240,255,0.01)] blur-3xl z-0 pointer-events-none" />

      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-center z-10">
        
        {/* Left Column: Biometric Visual Scan */}
        <div className="hidden md:flex flex-col items-center justify-center hud-box" style={{ minHeight: '430px' }}>
          <div className="relative w-36 h-36 rounded-full border border-neon-cyan flex items-center justify-center bg-[rgba(0,240,255,0.02)]">
            <ShieldCheck size={48} className="text-neon-cyan animate-pulse" />
            
            {/* Holographic Radar Sweep Circles */}
            <div className="absolute inset-2 border border-dashed border-neon-cyan/40 rounded-full animate-[spin_15s_linear_infinite]" />
            <div className="absolute inset-4 border border-neon-cyan/20 rounded-full animate-[spin_8s_linear_infinite_reverse]" />
            
            <div className="absolute -inset-1 border border-neon-cyan rounded-full animate-ping opacity-25" />
          </div>
          <span className="text-xs uppercase font-mono tracking-widest text-neon-cyan mt-6 animate-pulse">
            [ INITIALIZING CORE REGISTER... ]
          </span>
          <span className="text-[10px] font-mono text-muted mt-2">

          </span>
        </div>

        {/* Right Column: Register Form */}
        <div className="hud-box relative flex flex-col justify-between" style={{ minHeight: '430px' }}>
          <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-neon-cyan opacity-40"></div>
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-neon-cyan opacity-40"></div>

          <div>
            <h2 className="text-lg font-bold uppercase tracking-wider text-neon-cyan mb-1 glitch-text">
              INITIALIZE OPERATOR
            </h2>
            <p className="text-[10px] text-muted uppercase tracking-widest mb-4">
              Đăng ký tài khoản Operator an ninh mới
            </p>

            {error && (
              <div className="p-2.5 border border-neon-pink bg-[rgba(255,0,85,0.05)] text-neon-pink text-xs font-mono rounded mb-4 animate-pulse flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-neon-pink animate-ping"></span>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-3 font-mono text-xs">
              <div className="flex flex-col gap-1">
                <label className="text-[9px] uppercase text-muted tracking-widest">Họ và Tên</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="bg-terminal border border-border p-2 rounded text-neon-cyan focus:outline-none focus:border-neon-cyan focus:ring-1"
                  placeholder="Nguyen Van A"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] uppercase text-muted tracking-widest">Operator Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="bg-terminal border border-border p-2 rounded text-neon-cyan focus:outline-none focus:border-neon-cyan focus:ring-1"
                  placeholder="operator@student.edu.vn"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1 relative">
                  <label className="text-[9px] uppercase text-muted tracking-widest">Passcode</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="bg-terminal border border-border p-2 pr-8 rounded text-neon-cyan focus:outline-none focus:border-neon-cyan"
                    placeholder="••••••••"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[9px] uppercase text-muted tracking-widest">Xác nhận Passcode</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="bg-terminal border border-border p-2 rounded text-neon-cyan focus:outline-none focus:border-neon-cyan"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {/* Password visibility toggle */}
              <div className="flex justify-end -mt-1">
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[9px] uppercase text-muted hover:text-neon-cyan flex items-center gap-1"
                >
                  {showPassword ? 'Ẩn Passcode' : 'Hiện Passcode'}
                </button>
              </div>

              <label className="flex items-start gap-2 mt-2 text-[10px] cursor-pointer text-muted-foreground select-none">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={e => setAgreed(e.target.checked)}
                  className="mt-0.5 border-border rounded text-neon-cyan bg-terminal focus:ring-0 focus:ring-offset-0"
                />
                <span>Tôi xác nhận đây là hệ thống huấn luyện an toàn mật mã học giáo dục.</span>
              </label>

              <button
                type="submit"
                disabled={loading}
                className="btn-cyber mt-2 py-2 text-xs font-bold w-full uppercase"
              >
                {loading ? 'INITIALIZING INTERACTION...' : 'CREATE ACCOUNT [REGISTER]'}
              </button>
            </form>
          </div>

          <div className="mt-4 text-center text-[10px] font-mono text-muted flex justify-center border-t border-border/40 pt-3">
            <span className="hover:text-neon-cyan cursor-pointer" onClick={() => onNavigate('LOGIN')}>
              [ ĐÃ CÓ CORE? ĐĂNG NHẬP ]
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};
