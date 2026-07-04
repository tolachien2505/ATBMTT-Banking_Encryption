import React, { useEffect, useState } from 'react';
import { useAuthStore } from './stores/authStore';
import { SoundFX, SoundFXController } from './components/SoundFXController';
import { LandingPage } from './screens/LandingPage';
import { LoginPage } from './screens/LoginPage';
import { RegisterPage } from './screens/RegisterPage';
import { DashboardPage } from './screens/DashboardPage';
import { CampaignPage } from './screens/CampaignPage';
import { GameplayPage } from './screens/GameplayPage';
import { SandboxPage } from './screens/SandboxPage';
import { TestReportPage } from './screens/TestReportPage';
import { HistoryPage } from './screens/HistoryPage';
import { NotebookPage } from './screens/NotebookPage';
import { GuidePage } from './screens/GuidePage';
import { LeaderboardPage } from './screens/LeaderboardPage';
import { Layout, Terminal, LogOut, Award, User, Layers, PlayCircle, Cpu, ShieldAlert, History, BookOpen, Book, Trophy } from 'lucide-react';

export const App: React.FC = () => {
  const token = useAuthStore(state => state.token);
  const user = useAuthStore(state => state.user);
  const profile = useAuthStore(state => state.profile);
  const loadMe = useAuthStore(state => state.loadMe);
  const logout = useAuthStore(state => state.logout);

  const [currentScreen, setCurrentScreen] = useState<string>('LANDING');
  const [selectedLevelId, setSelectedLevelId] = useState<string>('');
  const [selectedLevelMeta, setSelectedLevelMeta] = useState<any>(null);

  // Restore session
  useEffect(() => {
    if (token) {
      loadMe().then(() => {
        setCurrentScreen('DASHBOARD');
      });
    } else {
      setCurrentScreen('LANDING');
    }
  }, [token]);

  const handleLogout = () => {
    SoundFX.playClick();
    logout();
    setCurrentScreen('LANDING');
  };

  const handleNavClick = (screen: string) => {
    SoundFX.playClick();
    setCurrentScreen(screen);
  };

  // If not logged in, restrict routing to Landing / Auth
  const isAuthScreen = ['LANDING', 'LOGIN', 'REGISTER'].includes(currentScreen);
  const loggedIn = !!token && !!user;

  const renderActiveScreen = () => {
    if (!loggedIn) {
      switch (currentScreen) {
        case 'REGISTER':
          return <RegisterPage onNavigate={setCurrentScreen} />;
        case 'LOGIN':
          return <LoginPage onNavigate={setCurrentScreen} />;
        default:
          return <LandingPage onNavigate={setCurrentScreen} />;
      }
    }

    switch (currentScreen) {
      case 'DASHBOARD':
        return <DashboardPage onNavigate={setCurrentScreen} />;
      case 'CAMPAIGN':
        return <CampaignPage onNavigate={setCurrentScreen} onSelectLevel={(id, meta) => { setSelectedLevelId(id); setSelectedLevelMeta(meta); }} />;
      case 'GAMEPLAY':
        return <GameplayPage levelId={selectedLevelId} levelMeta={selectedLevelMeta} onNavigate={setCurrentScreen} />;
      case 'SANDBOX':
        return <SandboxPage />;
      case 'TEST_REPORT':
        return <TestReportPage />;
      case 'HISTORY':
        return <HistoryPage />;
      case 'LEADERBOARD':
        return <LeaderboardPage />;
      case 'GUIDE':
        return <GuidePage />;
      case 'NOTEBOOK':
        return <NotebookPage />;
      default:
        return <DashboardPage onNavigate={setCurrentScreen} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between">
      
      {/* 1. Header Navigation Bar (Only for authenticated sessions) */}
      {loggedIn && (
        <header className="border-b border-border bg-[#050811]/90 backdrop-blur-md sticky top-0 z-40">
          <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col md:flex-row justify-between items-center gap-4">
            
            {/* Logo */}
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleNavClick('DASHBOARD')}>
              <span className="text-sm font-extrabold uppercase tracking-widest text-neon-cyan glitch-text">
                🛡️ CYBERBANK SEC v2.0
              </span>
            </div>

            {/* Navigation Tabs */}
            <nav className="flex flex-wrap items-center justify-center gap-2 md:gap-4">
              {[
                { screen: 'DASHBOARD', label: 'Tổng Quan', icon: Cpu },
                { screen: 'CAMPAIGN', label: 'Bản Đồ Ải', icon: Layers },
                { screen: 'SANDBOX', label: 'Phòng Thí Nghiệm', icon: PlayCircle },
                { screen: 'TEST_REPORT', label: 'Bộ Kiểm Thử', icon: ShieldAlert },
                { screen: 'HISTORY', label: 'Nhật Ký Lịch Sử', icon: History },
                { screen: 'LEADERBOARD', label: 'Bảng Xếp Hạng', icon: Trophy },
                { screen: 'GUIDE', label: 'Hướng Dẫn Chơi', icon: Book },
                { screen: 'NOTEBOOK', label: 'Sổ Tay Mật Mã', icon: BookOpen },
              ].map(tab => {
                const isActive = currentScreen === tab.screen || (tab.screen === 'CAMPAIGN' && currentScreen === 'GAMEPLAY');
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.screen}
                    onClick={() => handleNavClick(tab.screen)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider border rounded transition-all duration-300 ${
                      isActive
                        ? 'border-neon-cyan text-neon-cyan bg-[rgba(0,240,255,0.05)] glow-cyan font-bold'
                        : 'border-transparent text-muted hover:text-[#e2f1ff] hover:border-border'
                    }`}
                  >
                    <Icon size={12} className={isActive ? 'animate-pulse' : ''} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Operator statistics HUD */}
            <div className="flex items-center gap-3">
              <div className="flex flex-col text-right font-mono text-[10px]">
                <div className="text-muted uppercase tracking-widest text-[8px] flex items-center justify-end gap-1">
                  <User size={10} />
                  <span>{user.full_name}</span>
                </div>
                <div className="text-neon-cyan font-bold tracking-widest mt-0.5">
                  ĐIỂM: <span className="text-[#e2f1ff] text-xs font-extrabold bg-[rgba(0,0,0,0.5)] border border-border px-1.5 py-0.5 rounded">{profile?.total_score || 0} ĐIỂM</span>
                </div>
              </div>

              {/* Programs and controllers */}
              <SoundFXController />

              <button
                onClick={handleLogout}
                className="p-2 border border-neon-pink/30 hover:border-neon-pink bg-[rgba(255,0,85,0.02)] hover:bg-[rgba(255,0,85,0.08)] text-neon-pink rounded-md flex items-center gap-1.5 transition-all text-xs font-mono uppercase tracking-wider"
                title="Đăng xuất khỏi hệ thống"
              >
                <LogOut size={14} />
                <span className="hidden lg:inline">ĐĂNG XUẤT</span>
              </button>
            </div>

          </div>
        </header>
      )}

      {/* 2. Main Screen Area */}
      <main className="flex-grow flex flex-col justify-center">
        {renderActiveScreen()}
      </main>

      {/* 3. Tactical Footer */}
      <footer className="border-t border-border/40 py-4 bg-[#02040a]">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center text-[9px] font-mono text-muted gap-2">
          <span>&copy; 2026 CYBERBANK SECURITY v2.0 - GIẢ LẬP HỌC TẬP AN TOÀN BẢO MẬT HỆ THỐNG GIAO DỊCH</span>
          <div className="flex gap-4">
            <span>ĐƯỜNG TRUYỀN BẢO MẬT: <span className="text-neon-green animate-pulse">HOẠT ĐỘNG [SSL/RSA]</span></span>
            <span>CƠ SỞ DỮ LIỆU: <span className="text-neon-cyan font-bold">MYSQL TRỰC TUYẾN</span></span>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default App;
