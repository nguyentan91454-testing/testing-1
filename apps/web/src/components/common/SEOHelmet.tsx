import React, { useEffect } from 'react';

export interface SEOHelmetProps {
  title?: string;
  description?: string;
}

export const SEOHelmet: React.FC<SEOHelmetProps> = ({
  title = 'TechStore - Siêu Thị Thiết Bị Công Nghệ Cao Cấp & Trợ Lý AI',
  description = 'Khám phá các sản phẩm công nghệ chính hãng: Laptop, Smartphone, Âm thanh, Gaming Gear với sự hỗ trợ của Trợ lý Mua sắm AI thông minh.',
}) => {
  useEffect(() => {
    document.title = title.includes('TechStore') ? title : `${title} | TechStore`;

    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', description);
  }, [title, description]);

  return null;
};
