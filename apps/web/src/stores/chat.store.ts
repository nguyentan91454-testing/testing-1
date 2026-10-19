import { create } from 'zustand';
import { api } from '../api/client';
import { ChatMessageDto, ChatSender } from '@techstore/shared';

interface ChatState {
  isOpen: boolean;
  messages: ChatMessageDto[];
  isTyping: boolean;
  conversationId: string | null;
  activeTool: string | null;
  toggleChat: () => void;
  openChat: () => void;
  closeChat: () => void;
  sendMessage: (text: string) => Promise<void>;
  clearChat: () => void;
}

const INITIAL_GREETING: ChatMessageDto = {
  id: 'welcome-msg',
  role: ChatSender.ASSISTANT,
  content: 'Xin chào! Tôi là **TechBot** - Trợ lý Mua sắm AI của TechStore 🤖✨\n\nTôi có thể giúp bạn tìm kiếm thiết bị công nghệ, so sánh thông số kỹ thuật, kiểm tra tồn kho hoặc tra cứu đơn hàng. Bạn cần tôi hỗ trợ gì hôm nay?',
  createdAt: new Date().toISOString(),
};

export const useChatStore = create<ChatState>((set, get) => ({
  isOpen: false,
  messages: [INITIAL_GREETING],
  isTyping: false,
  conversationId: localStorage.getItem('chatConversationId'),
  activeTool: null,

  toggleChat: () => set((state) => ({ isOpen: !state.isOpen })),
  openChat: () => set({ isOpen: true }),
  closeChat: () => set({ isOpen: false }),

  sendMessage: async (text: string) => {
    if (!text.trim()) return;

    const userMsg: ChatMessageDto = {
      id: `user-${Date.now()}`,
      role: ChatSender.USER,
      content: text,
      createdAt: new Date().toISOString(),
    };

    set((state) => ({
      messages: [...state.messages, userMsg],
      isTyping: true,
      activeTool: 'Đang tra cứu dữ liệu sản phẩm...',
    }));

    try {
      const response = await api.post('/chat/messages', {
        message: text,
        conversationId: get().conversationId || undefined,
      });

      const assistantMsg = response.data.data;
      if (assistantMsg.conversationId) {
        localStorage.setItem('chatConversationId', assistantMsg.conversationId);
        set({ conversationId: assistantMsg.conversationId });
      }

      set((state) => ({
        messages: [...state.messages, assistantMsg],
        isTyping: false,
        activeTool: null,
      }));
    } catch (error: any) {
      const errorMsg: ChatMessageDto = {
        id: `err-${Date.now()}`,
        role: ChatSender.ASSISTANT,
        content: 'Rất tiếc, đã có lỗi khi kết nối với trợ lý AI. Vui lòng thử lại sau giây lát.',
        createdAt: new Date().toISOString(),
      };
      set((state) => ({
        messages: [...state.messages, errorMsg],
        isTyping: false,
        activeTool: null,
      }));
    }
  },

  clearChat: () => {
    localStorage.removeItem('chatConversationId');
    set({ messages: [INITIAL_GREETING], conversationId: null });
  },
}));
