import React, { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { SoundFX } from '../components/SoundFXController';
import { ShieldCheck, Eye, EyeOff, Radio } from 'lucide-react';

interface LoginPageProps {
  onNavigate: (screen: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate }) => {
  const setAuth = useAuthStore(state => state.setAuth);
  const setProfile = useAuthStore(state => state.setProfile);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    SoundFX.playClick();
    if (!email || !password) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
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
        setError(data.error === 'INVALID_CREDENTIALS' 
          ? 'Email hoặc mật khẩu không chính xác.' 
          : 'Tài khoản đã bị khóa hoặc không hợp lệ.');
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
      <div className="absolute w-[250px] h-[250px] rounded-full bg-[rgba(255,0,85,0.01)] blur-3xl z-0 pointer-events-none" />

      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-center z-10">
        
        {/* Left Column: Biometric Visual Scan */}
        <div className="hidden md:flex flex-col items-center justify-center hud-box" style={{ minHeight: '340px' }}>
          <div className="relative w-36 h-36 rounded-full border border-neon-cyan flex items-center justify-center bg-[rgba(0,240,255,0.02)]">
            <Radio size={48} className="text-neon-cyan animate-pulse" />
            
            {/* Holographic Radar Sweep Circles */}
            <div className="absolute inset-2 border border-dashed border-neon-cyan/40 rounded-full animate-[spin_20s_linear_infinite]" />
            <div className="absolute inset-4 border border-neon-cyan/20 rounded-full animate-[spin_10s_linear_infinite_reverse]" />
            
            <div className="absolute -inset-1 border border-neon-cyan rounded-full animate-ping opacity-25" />
          </div>
          <span className="text-xs uppercase font-mono tracking-widest text-neon-cyan mt-6 animate-pulse">
            [ SECURE SYSTEM SCANNER ACTIVE ]
          </span>
        </div>

        {/* Right Column: Login Form */}
        <div className="hud-box relative flex flex-col justify-between" style={{ minHeight: '340px' }}>
          <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-neon-pink opacity-40"></div>
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-neon-pink opacity-40"></div>

          <div>
            <h2 className="text-lg font-bold uppercase tracking-wider text-neon-cyan mb-1 glitch-text">
              OPERATOR ACCESS
            </h2>
            <p className="text-[10px] text-muted uppercase tracking-widest mb-6">
              Đăng nhập tài khoản để vào hệ thống điều khiển an ninh
            </p>

            {error && (
              <div className="p-2.5 border border-neon-pink bg-[rgba(255,0,85,0.05)] text-neon-pink text-xs font-mono rounded mb-4 animate-pulse flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-neon-pink animate-ping"></span>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4 font-mono text-xs">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase text-muted tracking-widest">Operator Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="bg-terminal border border-border p-2.5 rounded text-neon-cyan focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan"
                  placeholder="operator@student.edu.vn"
                />
              </div>

              <div className="flex flex-col gap-1.5 relative">
                <label className="text-[10px] uppercase text-muted tracking-widest">Access Passcode</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="bg-terminal border border-border p-2.5 pr-10 rounded text-neon-cyan focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-8 text-muted hover:text-neon-cyan"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-cyber mt-4 py-2.5 text-xs font-bold w-full uppercase"
              >
                {loading ? 'INITIALIZING INTERACTION...' : 'AUTHENTICATE ACCESS [ENTER]'}
              </button>
            </form>
          </div>

          <div className="mt-6 text-center text-[10px] font-mono text-muted flex justify-between border-t border-border/40 pt-3">
            <span className="hover:text-neon-cyan cursor-pointer" onClick={() => onNavigate('REGISTER')}>
              [ CHƯA CÓ CORE? ĐĂNG KÝ ]
            </span>
            <span className="hover:text-neon-cyan cursor-pointer">
              [ QUÊN MẬT KHẨU ]
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};
