import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Lock, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { SEOHelmet } from '../components/common/SEOHelmet';
import { toast } from '../components/ui/Toast';
import { api } from '../api/client';

export const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [token, setToken] = useState(searchParams.get('token') || '');
  const [newPassword, setNewPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim() || newPassword.length < 6) {
      toast.error('Vui lòng nhập đầy đủ token và mật khẩu mới (tối thiểu 6 ký tự)');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.post('/auth/reset-password', { token, newPassword });
      toast.success(res.data.message);
      navigate('/login');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Token không hợp lệ hoặc đã hết hạn.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 rounded-3xl glass-dropdown shadow-2xl border border-slate-200/80 dark:border-slate-800/80 space-y-6 text-left animate-slide-up">
      <SEOHelmet title="Đặt Lại Mật Khẩu | TechStore" />

      <div className="space-y-1.5 text-center">
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
          Đặt Lại Mật Khẩu Mới
        </h1>
        <p className="text-xs text-slate-500">
          Nhập mã xác thực token và thiết lập mật khẩu bảo mật mới
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Mã Token Khôi Phục"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Mã token 64 ký tự..."
          required
        />

        <Input
          label="Mật khẩu mới (tối thiểu 6 ký tự)"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="••••••••"
          leftIcon={<Lock className="w-4 h-4" />}
          required
        />

        <Button
          type="submit"
          variant="glow"
          size="lg"
          isLoading={isLoading}
          className="w-full font-bold"
          rightIcon={<ArrowRight className="w-4 h-4" />}
        >
          Cập Nhật Mật Khẩu
        </Button>
      </form>
    </div>
  );
};
