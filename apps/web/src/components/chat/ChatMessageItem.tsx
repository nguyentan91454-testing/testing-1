import React from 'react';
import { Sparkles, Crown, Gem, Search, PackageCheck, User } from 'lucide-react';
import { ProductSuggestionCard } from './ProductSuggestionCard';
import { ChatMessageDto, ChatSender } from '@techstore/shared';

export interface ChatMessageItemProps {
  message: ChatMessageDto;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({ message }) => {
  const isUser = message.role === ChatSender.USER;

  // Simple markdown renderer for bold, bullets, links
  const renderFormattedText = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, idx) => {
      // Bold formatter **text**
      const parts = line.split(/(\*\*.*?\*\*)/g);
      const formattedLine = parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={pIdx} className="font-bold">{part.slice(2, -2)}</strong>;
        }
        return part;
      });

      if (line.startsWith('- ')) {
        return (
          <li key={idx} className="ml-4 list-disc text-xs">
            {formattedLine}
          </li>
        );
      }

      if (line.trim() === '') {
        return <div key={idx} className="h-1.5" />;
      }

      return (
        <p key={idx} className="text-xs leading-relaxed">
          {formattedLine}
        </p>
      );
    });
  };

  return (
    <div className={`flex gap-2.5 sm:gap-3 text-left ${isUser ? 'flex-row-reverse' : 'flex-row'} animate-fade-in`}>

      {/* ── Avatar ── */}
      <div
        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm`}
        style={
          isUser
            ? { background: '#3E2723', color: '#FDF6E3' }
            : {
                background: 'linear-gradient(135deg, #8B0000, #A50000)',
                border: '1px solid rgba(212,175,55,0.5)',
                color: '#D4AF37',
              }
        }
      >
        {isUser ? <User className="w-4 h-4" /> : <Crown className="w-4 h-4" />}
      </div>

      {/* ── Message Bubble ── */}
      <div className="space-y-2 max-w-[85%] sm:max-w-[78%]">
        <div
          className={`p-3 sm:p-3.5 rounded-2xl font-body`}
          style={
            isUser
              ? {
                  background: 'linear-gradient(135deg, #8B0000, #A50000)',
                  borderTopRightRadius: '0.25rem',
                  color: '#FDF6E3',
                  border: '1px solid rgba(212,175,55,0.4)',
                  boxShadow: '0 2px 8px rgba(139,0,0,0.25)',
                }
              : {
                  background: 'rgba(255,255,240,0.95)',
                  borderTopLeftRadius: '0.25rem',
                  color: '#2C1810',
                  border: '1px solid rgba(212,175,55,0.3)',
                  boxShadow: '0 1px 4px rgba(62,39,35,0.08)',
                }
          }
        >
          {/* Tool call indicator */}
          {message.toolCalls && message.toolCalls.length > 0 && !isUser && (
            <div
              className="mb-2 p-1.5 px-2.5 rounded-lg text-[10px] font-sans font-medium flex items-center gap-1.5"
              style={{
                background: 'rgba(139,0,0,0.06)',
                border: '1px solid rgba(139,0,0,0.15)',
                color: '#8B0000',
              }}
            >
              <Search className="w-3 h-3" />
              <span>Đã tra cứu kho sản phẩm Maison Élégante</span>
            </div>
          )}

          <div className="space-y-1">{renderFormattedText(message.content)}</div>
        </div>

        {/* Product Suggestion Cards */}
        {message.recommendedProducts && message.recommendedProducts.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <div
              className="text-[10px] font-sans font-bold uppercase tracking-widest px-1"
              style={{ color: '#B8860B' }}
            >
              ✦ Sản phẩm đề xuất ({message.recommendedProducts.length})
            </div>
            {message.recommendedProducts.map((p) => (
              <ProductSuggestionCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
