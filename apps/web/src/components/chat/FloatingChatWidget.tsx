import React, { useState, useRef, useEffect } from 'react';
import { Crown, X, Send, Trash2, Sparkles, Loader2, Maximize2, Minimize2, Gem } from 'lucide-react';
import { useChatStore } from '../../stores/chat.store';
import { ChatMessageItem } from './ChatMessageItem';
import { QuickPromptChips } from './QuickPromptChips';

export const FloatingChatWidget: React.FC = () => {
  const {
    isOpen,
    messages,
    isTyping,
    activeTool,
    toggleChat,
    closeChat,
    sendMessage,
    clearChat,
  } = useChatStore();

  const [input, setInput] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;
    const msg = input.trim();
    setInput('');
    await sendMessage(msg);
  };

  const handleSelectQuickPrompt = (prompt: string) => {
    sendMessage(prompt);
  };

  return (
    <>
      {/* ══════════════════════════════════════════════
          FLOATING TRIGGER BUTTON — Victorian Style
      ═══════════════════════════════════════════════ */}
      {!isOpen && (
        <button
          onClick={toggleChat}
          className="fixed bottom-6 right-6 z-40 group flex items-center gap-2 px-4 py-3.5 rounded-full transition-all duration-300 animate-slide-up hover:scale-105 active:scale-95"
          style={{
            background: 'linear-gradient(135deg, #8B0000 0%, #A50000 50%, #8B0000 100%)',
            border: '1.5px solid rgba(212,175,55,0.65)',
            boxShadow: '0 8px 32px rgba(139,0,0,0.4), 0 0 0 1px rgba(212,175,55,0.15), inset 0 1px 0 rgba(232,197,71,0.25)',
            color: '#D4AF37',
          }}
          title="Trò chuyện với Trợ lý Trang Trí AI"
        >
          <div className="relative">
            {/* Victorian crown icon */}
            <Crown className="w-5 h-5 text-gold-400" />
            {/* Online indicator */}
            <span
              className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full animate-pulse"
              style={{ background: '#4CAF50', boxShadow: '0 0 0 2px #8B0000' }}
            />
          </div>
          <span className="text-xs font-sans font-bold hidden sm:inline text-gold-300">Trợ lý AI Trang Trí</span>
        </button>
      )}

      {/* ══════════════════════════════════════════════
          CHAT WINDOW — Victorian Luxury
      ═══════════════════════════════════════════════ */}
      {isOpen && (
        <div
          className={`fixed bottom-4 sm:bottom-6 right-4 sm:right-6 z-50 rounded-2xl flex flex-col transition-all duration-300 animate-slide-up overflow-hidden ${
            isExpanded
              ? 'w-[calc(100vw-2rem)] sm:w-[600px] h-[85vh]'
              : 'w-[calc(100vw-2rem)] sm:w-[420px] h-[560px]'
          }`}
          style={{
            background: 'rgba(255,255,240,0.98)',
            border: '1.5px solid rgba(212,175,55,0.5)',
            boxShadow: '0 20px 60px rgba(62,39,35,0.2), 0 8px 24px rgba(139,0,0,0.12)',
          }}
        >
          {/* ── Chat Header (Burgundy + Gold) ── */}
          <div
            className="p-3.5 sm:p-4 text-cream-50 flex items-center justify-between shrink-0"
            style={{
              background: 'linear-gradient(135deg, #8B0000 0%, #6B0000 100%)',
              borderBottom: '1px solid rgba(212,175,55,0.45)',
            }}
          >
            <div className="flex items-center gap-2.5">
              {/* Victorian AI avatar */}
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shadow-inner"
                style={{
                  background: 'rgba(212,175,55,0.2)',
                  border: '1px solid rgba(212,175,55,0.5)',
                }}
              >
                <Crown className="w-4 h-4 text-gold-400" />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-1.5">
                  <h3
                    className="text-xs sm:text-sm font-bold text-cream-50"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                  >
                    Maison AI Assistant
                  </h3>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <p className="text-[10px] font-sans" style={{ color: 'rgba(212,175,55,0.85)' }}>
                  Tư vấn trang trí nội thất & đồ gia dụng cao cấp
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={clearChat}
                className="p-1.5 rounded-lg hover:bg-white/10 text-cream-200 hover:text-cream-50 transition-colors"
                title="Xóa đoạn chat"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-cream-200 hover:text-cream-50 transition-colors hidden sm:block"
                title={isExpanded ? 'Thu nhỏ' : 'Phóng to'}
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              <button
                onClick={closeChat}
                className="p-1.5 rounded-lg hover:bg-white/10 text-cream-200 hover:text-cream-50 transition-colors"
                title="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* ── Messages Container ── */}
          <div
            className="flex-1 overflow-y-auto p-4 space-y-4"
            style={{ background: 'rgba(253,246,227,0.5)' }}
          >
            {messages.map((msg) => (
              <ChatMessageItem key={msg.id} message={msg} />
            ))}

            {/* Typing / Tool Execution Indicator */}
            {isTyping && (
              <div className="flex gap-2.5 items-center text-left animate-pulse">
                <div
                  className="w-7 h-7 rounded-lg text-gold-400 flex items-center justify-center shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, #8B0000, #A50000)',
                    border: '1px solid rgba(212,175,55,0.4)',
                  }}
                >
                  <Crown className="w-3.5 h-3.5" />
                </div>
                <div
                  className="p-3 rounded-xl text-xs font-sans font-semibold flex items-center gap-2"
                  style={{
                    background: 'rgba(255,255,240,0.9)',
                    border: '1px solid rgba(212,175,55,0.3)',
                    color: '#8B0000',
                  }}
                >
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-gold-600" />
                  <span>{activeTool || 'Maison AI đang suy nghĩ...'}</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* ── Quick Prompts ── */}
          <div
            className="px-3 pt-1"
            style={{ borderTop: '1px solid rgba(212,175,55,0.2)', background: 'rgba(255,255,240,0.8)' }}
          >
            <QuickPromptChips onSelectPrompt={handleSelectQuickPrompt} />
          </div>

          {/* ── Input Box ── */}
          <form
            onSubmit={handleSubmit}
            className="p-3 sm:p-3.5 flex items-center gap-2"
            style={{
              background: 'rgba(253,246,227,0.95)',
              borderTop: '1px solid rgba(212,175,55,0.3)',
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Hỏi về sofa, đèn trang trí, thảm Ba Tư..."
              disabled={isTyping}
              className="flex-1 px-3.5 py-2 text-xs font-sans rounded-lg focus:outline-none transition-all disabled:opacity-60"
              style={{
                background: 'rgba(255,255,240,0.9)',
                border: '1px solid rgba(212,175,55,0.4)',
                color: '#2C1810',
              }}
              onFocus={(e) => {
                (e.target as HTMLInputElement).style.borderColor = 'rgba(212,175,55,0.75)';
                (e.target as HTMLInputElement).style.boxShadow = '0 0 0 2px rgba(212,175,55,0.2)';
              }}
              onBlur={(e) => {
                (e.target as HTMLInputElement).style.borderColor = 'rgba(212,175,55,0.4)';
                (e.target as HTMLInputElement).style.boxShadow = '';
              }}
            />
            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              className="p-2 sm:px-3 sm:py-2 rounded-lg font-sans text-xs font-bold transition-all flex items-center justify-center disabled:opacity-40 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #8B0000, #A50000)',
                border: '1px solid rgba(212,175,55,0.5)',
                color: '#D4AF37',
                boxShadow: '0 2px 8px rgba(139,0,0,0.3)',
              }}
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
