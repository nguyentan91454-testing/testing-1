import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { ArrowUp, MessageCircle, X } from "lucide-react";
import { api } from "../../lib/api";

type Message = { role: "assistant" | "user"; text: string };

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", text: "Chào bạn, mình có thể giúp chọn đèn theo diện tích phòng, chiều cao trần hoặc phong cách bạn yêu thích." }]);
  const mutation = useMutation({
    mutationFn: api.sendMessage,
    onSuccess: (result) => setMessages((current) => [...current, { role: "assistant", text: result.answer }]),
    onError: (error) => setMessages((current) => [...current, { role: "assistant", text: error instanceof Error ? error.message : "Mình chưa kết nối được. Bạn thử lại nhé." }]),
  });

  function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = text.trim();
    if (!message || mutation.isPending) return;
    setMessages((current) => [...current, { role: "user", text: message }]);
    setText("");
    mutation.mutate(message);
  }

  return (
    <div className="chat-widget">
      {open && <section className="chat-panel" aria-label="Tư vấn ánh sáng" aria-live="polite">
        <header className="chat-header"><div className="chat-avatar">n.</div><div><strong>Chuyên viên Nhà Mình</strong><span>Tư vấn không gian & ánh sáng</span></div><button className="icon-button" onClick={() => setOpen(false)} aria-label="Đóng tư vấn"><X size={19} /></button></header>
        <div className="chat-messages">{messages.map((message, index) => <p className={`chat-bubble ${message.role}`} key={`${message.role}-${index}`}>{message.text}</p>)}{mutation.isPending && <p className="chat-bubble assistant typing">Đang tìm hiểu...</p>}</div>
        <form className="chat-form" onSubmit={send}><input maxLength={500} value={text} onChange={(event) => setText(event.target.value)} placeholder="Bạn đang cần tìm gì?" aria-label="Tin nhắn tư vấn" /><button aria-label="Gửi tin nhắn" disabled={!text.trim() || mutation.isPending}><ArrowUp size={19} /></button></form>
        <small className="chat-demo-note">Thông tin sản phẩm được tra từ dữ liệu demo.</small>
      </section>}
      <button className={`chat-launcher ${open ? "is-open" : ""}`} onClick={() => setOpen(!open)} aria-label={open ? "Đóng tư vấn" : "Mở tư vấn ánh sáng"}>{open ? <X /> : <><MessageCircle /><span>Tư vấn ánh sáng</span></>}</button>
    </div>
  );
}
