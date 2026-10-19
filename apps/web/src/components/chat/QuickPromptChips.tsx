import React from 'react';
import { Laptop, Headphones, Smartphone, PackageCheck, HelpCircle } from 'lucide-react';

export interface QuickPromptChipsProps {
  onSelectPrompt: (prompt: string) => void;
}

export const QuickPromptChips: React.FC<QuickPromptChipsProps> = ({ onSelectPrompt }) => {
  const prompts = [
    { icon: <Laptop className="w-3 h-3 text-indigo-500" />, label: 'Tư vấn laptop dưới 25tr', text: 'Tôi cần tìm laptop văn phòng và lập trình với ngân sách dưới 25 triệu.' },
    { icon: <Headphones className="w-3 h-3 text-pink-500" />, label: 'Tai nghe chống ồn Sony', text: 'Tư vấn cho tôi các dòng tai nghe chống ồn cao cấp Sony tốt nhất.' },
    { icon: <Smartphone className="w-3 h-3 text-purple-500" />, label: 'iPhone 15 Pro Max', text: 'iPhone 15 Pro Max có những phiên bản màu sắc và giá bán thế nào?' },
    { icon: <PackageCheck className="w-3 h-3 text-emerald-500" />, label: 'Tra cứu đơn #TS-2026-00101', text: 'Kiểm tra trạng thái đơn hàng TS-2026-00101' },
    { icon: <HelpCircle className="w-3 h-3 text-amber-500" />, label: 'Chính sách bảo hành', text: 'Chính sách bảo hành và đổi trả của TechStore như thế nào?' },
  ];

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-2 px-1 text-left scrollbar-none">
      {prompts.map((p, idx) => (
        <button
          key={idx}
          onClick={() => onSelectPrompt(p.text)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:border-indigo-300 text-[11px] text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap transition-all hover:scale-105 shrink-0"
        >
          {p.icon}
          <span>{p.label}</span>
        </button>
      ))}
    </div>
  );
};
