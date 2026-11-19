import { useEffect, useRef, useId } from "react";
import { createPortal } from "react-dom";
import { LoaderCircle, Trash2 } from "lucide-react";

export function AvatarRemovalConfirmation({ busy, onCancel, onConfirm }: { busy: boolean; onCancel: () => void; onConfirm: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const element = dialog.current!;
    element.showModal();
    return () => element.close();
  }, []);

  return createPortal(<dialog ref={dialog} className="avatar-delete-dialog" role="alertdialog" aria-labelledby={titleId} aria-describedby={descriptionId}
    onCancel={(event) => { event.preventDefault(); if (!busy) onCancel(); }}
    onClick={(event) => { if (event.target === dialog.current && !busy) onCancel(); }}>
    <span className="avatar-delete-icon"><Trash2 size={21}/></span>
    <h2 id={titleId}>Xóa ảnh đại diện?</h2>
    <p id={descriptionId}>Ảnh đại diện hiện tại sẽ được gỡ khỏi hồ sơ của bạn. Bạn có thể tải ảnh khác lên bất cứ lúc nào.</p>
    <div className="avatar-delete-actions">
      <button type="button" className="button button-outline" autoFocus disabled={busy} onClick={onCancel}>Giữ ảnh</button>
      <button type="button" className="button avatar-delete-confirm" disabled={busy} onClick={onConfirm}>{busy ? <><LoaderCircle size={16} className="spin"/>Đang xóa…</> : <><Trash2 size={16}/>Xóa ảnh</>}</button>
    </div>
  </dialog>, document.body);
}
