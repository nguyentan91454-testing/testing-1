import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Lock, Mail, ArrowRight, ShieldCheck, UserCheck } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { SEOHelmet } from '../components/common/SEOHelmet';
import { toast } from '../components/ui/Toast';
import { useAuthStore } from '../stores/auth.store';
import { LoginSchema } from '@techstore/shared';
import { z } from 'zod';

type LoginFormData = z.infer<typeof LoginSchema>;

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';

  const { login, isLoading } = useAuthStore();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data);
      toast.success('Đăng nhập thành công!');
      navigate(redirect);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Email hoặc mật khẩu không chính xác');
    }
  };

  const handleQuickFill = (role: 'admin' | 'customer') => {
    if (role === 'admin') {
      setValue('email', 'admin@techstore.vn');
      setValue('password', 'Admin@123456');
    } else {
      setValue('email', 'an.nguyen@gmail.com');
      setValue('password', 'User@123456');
    }
  };

  return (
    <div className="p-8 rounded-3xl glass-dropdown shadow-2xl border border-slate-200/80 dark:border-slate-800/80 space-y-6 text-left animate-slide-up">
      <SEOHelmet title="Đăng Nhập | TechStore" />

      <div className="space-y-1.5 text-center">
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
          Chào mừng trở lại! 👋
        </h1>
        <p className="text-xs text-slate-500">
          Đăng nhập để quản lý đơn hàng và lưu danh sách yêu thích
        </p>
      </div>

      {/* Demo Account Quick Fill Buttons */}
      <div className="p-3.5 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/60 space-y-2">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-700 dark:text-indigo-300">
          <ShieldCheck className="w-4 h-4" />
          <span>Tài khoản Demo thử nghiệm nhanh:</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleQuickFill('admin')}
            className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 shadow-sm transition-all text-center flex items-center justify-center gap-1"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
            <span>Admin Demo</span>
          </button>
          <button
            type="button"
            onClick={() => handleQuickFill('customer')}
            className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 shadow-sm transition-all text-center flex items-center justify-center gap-1"
          >
            <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Khách Hàng</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Địa chỉ Email"
          type="email"
          placeholder="name@example.com"
          leftIcon={<Mail className="w-4 h-4" />}
          error={errors.email?.message}
          {...register('email')}
        />

        <div className="space-y-1">
          <Input
            label="Mật khẩu"
            type="password"
            placeholder="••••••••"
            leftIcon={<Lock className="w-4 h-4" />}
            error={errors.password?.message}
            {...register('password')}
          />
          <div className="flex justify-end pt-1">
            <Link
              to="/forgot-password"
              className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Quên mật khẩu?
            </Link>
          </div>
        </div>

        <Button
          type="submit"
          variant="glow"
          size="lg"
          isLoading={isLoading}
          className="w-full font-bold"
          rightIcon={<ArrowRight className="w-4 h-4" />}
        >
          Đăng Nhập
        </Button>
      </form>

      <div className="pt-4 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500">
        Chưa có tài khoản?{' '}
        <Link to="/register" className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
          Đăng ký ngay
        </Link>
      </div>
    </div>
  );
};
