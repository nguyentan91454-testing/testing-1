import React, { useState } from 'react';
import { ProductImageDto } from '@techstore/shared';

export interface ProductGalleryProps {
  images: ProductImageDto[];
  productName: string;
}

export const ProductGallery: React.FC<ProductGalleryProps> = ({ images, productName }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const displayImages =
    images && images.length > 0
      ? images
      : [{ id: '1', url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800', isPrimary: true, sortOrder: 0 }];

  const currentImage = displayImages[selectedIndex] || displayImages[0];

  return (
    <div className="space-y-4">
      {/* Main Image */}
      <div className="relative aspect-square rounded-3xl overflow-hidden glass-panel border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 group">
        <img
          src={currentImage.url}
          alt={productName}
          className="w-full h-full object-contain p-4 sm:p-8 transition-transform duration-500 group-hover:scale-105"
        />
      </div>

      {/* Thumbnails */}
      {displayImages.length > 1 && (
        <div className="flex items-center gap-3 overflow-x-auto pb-2">
          {displayImages.map((img, idx) => (
            <button
              key={img.id || idx}
              onClick={() => setSelectedIndex(idx)}
              className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 transition-all shrink-0 bg-white dark:bg-slate-900 ${
                selectedIndex === idx
                  ? 'border-indigo-600 dark:border-indigo-400 shadow-md ring-2 ring-indigo-500/20'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-400 opacity-70 hover:opacity-100'
              }`}
            >
              <img src={img.url} alt={`${productName} thumbnail ${idx}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
