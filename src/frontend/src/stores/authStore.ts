import { create } from 'zustand';

interface User {
  user_id: string;
  email: string;
  full_name: string;
  role: string;
}

interface Profile {
  profile_id: string;
  total_score: number;
  completed_level_count: number;
  operator_rank: string;
  selected_theme: string;
  unlocked_themes: string[];
}

interface AuthState {
  token: string | null;
  user: User | null;
  profile: Profile | null;
  sessionId: string | null;
  activeLevelData: any | null;
  setAuth: (token: string, user: User, sessionId: string) => void;
  setProfile: (profile: Profile) => void;
  setActiveLevelData: (data: any) => void;
  logout: () => void;
  loadMe: () => Promise<void>;
  updateTheme: (theme: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: localStorage.getItem('cyber_token'),
  user: null,
  profile: null,
  sessionId: localStorage.getItem('cyber_session_id'),
  activeLevelData: null,

  setAuth: (token, user, sessionId) => {
    localStorage.setItem('cyber_token', token);
    localStorage.setItem('cyber_session_id', sessionId);
    set({ token, user, sessionId });
  },

  setProfile: (profile) => {
    set({ profile });
    // Apply theme class to document body
    document.body.className = `effect-scanlines effect-grid theme-${profile.selected_theme.toLowerCase()}`;
  },

  setActiveLevelData: (activeLevelData) => set({ activeLevelData }),

  logout: () => {
    localStorage.removeItem('cyber_token');
    localStorage.removeItem('cyber_session_id');
    set({ token: null, user: null, profile: null, sessionId: null, activeLevelData: null });
    document.body.className = 'effect-scanlines effect-grid';
  },

  loadMe: async () => {
    const { token } = get();
    if (!token) return;

    try {
      const res = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        set({ user: data.data.user });
        get().setProfile(data.data.profile);
      } else {
        get().logout();
      }
    } catch (e) {
      console.error('[AUTH_STORE] Error loading operator profile:', e);
      get().logout();
    }
  },

  updateTheme: async (theme) => {
    const { token, profile } = get();
    if (!token || !profile) return;

    try {
      const res = await fetch('/api/profile/theme', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ theme }),
      });
      const data = await res.json();
      if (data.success) {
        const updatedProfile = { ...profile, selected_theme: theme };
        get().setProfile(updatedProfile);
      }
    } catch (e) {
      console.error('[AUTH_STORE] Error setting custom theme:', e);
    }
  },
}));
