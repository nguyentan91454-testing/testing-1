import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Send } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { SEOHelmet } from '../components/common/SEOHelmet';
import { toast } from '../components/ui/Toast';
import { api } from '../api/client';

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sentToken, setSentToken] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email: email.trim() });
      toast.success(res.data.message);
      if (res.data.resetToken) {
        setSentToken(res.data.resetToken);
      }
    } catch (err: any) {
      toast.error('Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 rounded-3xl glass-dropdown shadow-2xl border border-slate-200/80 dark:border-slate-800/80 space-y-6 text-left animate-slide-up">
      <SEOHelmet title="Quên Mật Khẩu | TechStore" />

      <div className="space-y-1.5 text-center">
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
          Khôi Phục Mật Khẩu
        </h1>
        <p className="text-xs text-slate-500">
          Nhập địa chỉ email đã đăng ký để nhận mã liên kết đặt lại mật khẩu
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Địa chỉ Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@example.com"
          leftIcon={<Mail className="w-4 h-4" />}
          required
        />

        <Button
          type="submit"
          variant="primary"
          size="lg"
          isLoading={isLoading}
          className="w-full font-bold"
          rightIcon={<Send className="w-4 h-4" />}
        >
          Gửi Yêu Cầu
        </Button>
      </form>

      {sentToken && (
        <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-xs space-y-2">
          <p className="font-bold text-indigo-700 dark:text-indigo-300">
            🔑 Mã Token Đặt Lại (Môi trường Dev Test):
          </p>
          <code className="block p-2 rounded-lg bg-white dark:bg-slate-900 font-mono text-[11px] break-all border border-indigo-200 dark:border-indigo-800">
            {sentToken}
          </code>
          <Link
            to={`/reset-password?token=${sentToken}`}
            className="inline-block text-xs font-bold text-indigo-600 dark:text-indigo-400 underline"
          >
            Chuyển tới trang đổi mật khẩu ngay →
          </Link>
        </div>
      )}

      <div className="pt-2 text-center">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại Đăng nhập</span>
        </Link>
      </div>
    </div>
  );
};
