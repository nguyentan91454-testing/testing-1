import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { SEOHelmet } from '../components/common/SEOHelmet';

export const NotFound: React.FC = () => {
  return (
    <div className="py-20 text-center space-y-6 max-w-md mx-auto">
      <SEOHelmet title="404 - Không Tìm Thấy Trang | TechStore" />

      <div className="text-7xl font-extrabold text-gradient">404</div>

      <div className="space-y-2">
        <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
          Trang bạn tìm kiếm không tồn tại
        </h1>
        <p className="text-xs text-slate-500">
          Đường dẫn có thể đã bị thay đổi hoặc không có trên hệ thống TechStore.
        </p>
      </div>

      <div className="flex items-center justify-center gap-3">
        <Link to="/">
          <Button variant="primary" leftIcon={<Home className="w-4 h-4" />}>
            Về trang chủ
          </Button>
        </Link>
        <Link to="/products">
          <Button variant="outline">Xem sản phẩm</Button>
        </Link>
      </div>
    </div>
  );
};
