import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Lock, Mail, User, Phone, ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { SEOHelmet } from '../components/common/SEOHelmet';
import { toast } from '../components/ui/Toast';
import { useAuthStore } from '../stores/auth.store';
import { RegisterSchema } from '@techstore/shared';
import { z } from 'zod';

type RegisterFormData = z.infer<typeof RegisterSchema>;

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const { register: registerUser, isLoading } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      phone: '',
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      await registerUser(data);
      toast.success('Đăng ký tài khoản thành công!');
      navigate('/');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Đăng ký không thành công. Email có thể đã tồn tại.');
    }
  };

  return (
    <div className="p-8 rounded-3xl glass-dropdown shadow-2xl border border-slate-200/80 dark:border-slate-800/80 space-y-6 text-left animate-slide-up">
      <SEOHelmet title="Đăng Ký Tài Khoản | TechStore" />

      <div className="space-y-1.5 text-center">
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
          Tạo Tài Khoản Mới ✨
        </h1>
        <p className="text-xs text-slate-500">
          Trở thành thành viên TechStore để nhận voucher giảm 10% ngay
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
        <Input
          label="Họ và tên"
          placeholder="Nguyễn Văn A"
          leftIcon={<User className="w-4 h-4" />}
          error={errors.fullName?.message}
          {...register('fullName')}
        />

        <Input
          label="Địa chỉ Email"
          type="email"
          placeholder="name@example.com"
          leftIcon={<Mail className="w-4 h-4" />}
          error={errors.email?.message}
          {...register('email')}
        />

        <Input
          label="Số điện thoại (Tùy chọn)"
          placeholder="0981234567"
          leftIcon={<Phone className="w-4 h-4" />}
          error={errors.phone?.message}
          {...register('phone')}
        />

        <Input
          label="Mật khẩu"
          type="password"
          placeholder="Ít nhất 6 ký tự..."
          leftIcon={<Lock className="w-4 h-4" />}
          error={errors.password?.message}
          {...register('password')}
        />

        <div className="pt-2">
          <Button
            type="submit"
            variant="glow"
            size="lg"
            isLoading={isLoading}
            className="w-full font-bold"
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Đăng Ký Tài Khoản
          </Button>
        </div>
      </form>

      <div className="pt-4 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500">
        Đã có tài khoản?{' '}
        <Link to="/login" className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
          Đăng nhập ngay
        </Link>
      </div>
    </div>
  );
};
