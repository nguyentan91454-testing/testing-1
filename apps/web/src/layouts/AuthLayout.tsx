import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Sparkles, Sun, Moon } from 'lucide-react';
import { useThemeStore } from '../stores/theme.store';
import { ToastContainer } from '../components/ui/Toast';

export const AuthLayout: React.FC = () => {
  const { isDark, toggleTheme } = useThemeStore();

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors p-4 sm:p-6">
      {/* Top Header */}
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center text-white shadow-md">
            <Sparkles className="w-5 h-5" />
          </div>
          <span className="text-xl font-extrabold text-gradient">TechStore</span>
        </Link>

        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>

      {/* Auth Card Content */}
      <div className="w-full max-w-md mx-auto my-8">
        <Outlet />
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-slate-400">
        © 2026 TechStore E-Commerce SPA. Bảo mật chuẩn OWASP & JWT.
      </div>

      <ToastContainer />
    </div>
  );
};
