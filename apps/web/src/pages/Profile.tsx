import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { User, Lock, MapPin, Plus, Trash2, CheckCircle2, Shield } from 'lucide-react';
import { Breadcrumb } from '../components/common/Breadcrumb';
import { SEOHelmet } from '../components/common/SEOHelmet';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { toast } from '../components/ui/Toast';
import { useAuthStore } from '../stores/auth.store';
import { api } from '../api/client';
import { UpdateProfileSchema, ChangePasswordSchema } from '@techstore/shared';
import { z } from 'zod';

export const Profile: React.FC = () => {
  const { user, updateUser } = useAuthStore();

  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);

  // Profile Form
  const {
    register: regProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors },
  } = useForm({
    resolver: zodResolver(UpdateProfileSchema),
    defaultValues: {
      fullName: user?.fullName || '',
      phone: user?.phone || '',
      avatarUrl: user?.avatarUrl || '',
    },
  });

  // Password Form
  const {
    register: regPass,
    handleSubmit: handlePassSubmit,
    reset: resetPassForm,
    formState: { errors: passErrors },
  } = useForm({
    resolver: zodResolver(ChangePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
    },
  });

  const onProfileSubmit = async (data: any) => {
    setIsUpdatingProfile(true);
    try {
      const res = await api.patch('/users/profile', data);
      updateUser(res.data.data);
      toast.success('Cập nhật thông tin tài khoản thành công!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể cập nhật hồ sơ');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const onPasswordSubmit = async (data: any) => {
    setIsChangingPass(true);
    try {
      await api.post('/auth/change-password', data);
      toast.success('Đổi mật khẩu thành công!');
      resetPassForm();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Mật khẩu hiện tại không đúng');
    } finally {
      setIsChangingPass(false);
    }
  };

  return (
    <div className="space-y-8 text-left max-w-4xl mx-auto">
      <SEOHelmet title="Hồ Sơ Cá Nhân | TechStore" />
      <Breadcrumb items={[{ label: 'Hồ sơ cá nhân' }]} />

      <div className="pb-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100">
            Cài Đặt Tài Khoản
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý thông tin bảo mật, số điện thoại và địa chỉ giao nhận hàng
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-xs font-bold">
          <Shield className="w-3.5 h-3.5" />
          <span>Vai trò: {user?.role}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Personal Details Form */}
        <div className="p-6 rounded-3xl glass-panel border border-slate-200/80 dark:border-slate-800/80 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
            <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Thông tin cá nhân
            </h3>
          </div>

          <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1">Email (Cố định)</label>
              <input
                type="text"
                disabled
                value={user?.email || ''}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-400 cursor-not-allowed"
              />
            </div>

            <Input
              label="Họ và tên"
              error={profileErrors.fullName?.message as string}
              {...regProfile('fullName')}
            />

            <Input
              label="Số điện thoại"
              error={profileErrors.phone?.message as string}
              {...regProfile('phone')}
            />

            <Input
              label="Ảnh đại diện (URL)"
              placeholder="https://..."
              error={profileErrors.avatarUrl?.message as string}
              {...regProfile('avatarUrl')}
            />

            <div className="pt-2">
              <Button type="submit" variant="primary" size="sm" isLoading={isUpdatingProfile}>
                Lưu thay đổi
              </Button>
            </div>
          </form>
        </div>

        {/* Change Password Form */}
        <div className="p-6 rounded-3xl glass-panel border border-slate-200/80 dark:border-slate-800/80 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
            <Lock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Đổi mật khẩu
            </h3>
          </div>

          <form onSubmit={handlePassSubmit(onPasswordSubmit)} className="space-y-3">
            <Input
              type="password"
              label="Mật khẩu hiện tại"
              placeholder="••••••••"
              error={passErrors.currentPassword?.message as string}
              {...regPass('currentPassword')}
            />

            <Input
              type="password"
              label="Mật khẩu mới (tối thiểu 6 ký tự)"
              placeholder="••••••••"
              error={passErrors.newPassword?.message as string}
              {...regPass('newPassword')}
            />

            <div className="pt-2">
              <Button type="submit" variant="secondary" size="sm" isLoading={isChangingPass}>
                Cập nhật mật khẩu
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
