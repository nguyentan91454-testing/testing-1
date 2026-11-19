import { useEffect, useId, useRef, useState, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import { Check, ImagePlus, LoaderCircle, Move, RotateCcw, RotateCw, X, ZoomIn, ZoomOut } from "lucide-react";
import { AVATAR_CROP_SIZE, avatarFileError, constrainAvatarCrop, drawAvatarCrop, exportAvatarCrop, initialAvatarCrop, type AvatarCrop } from "../lib/avatar-crop";

interface AvatarEditorProps {
  file: File;
  name: string;
  onChoose: (file: File) => void;
  onApply: (file: File) => Promise<unknown>;
  onCancel: () => void;
}

export function AvatarEditor({ file, name, onChoose, onApply, onCancel }: AvatarEditorProps) {
  const titleId = useId();
  const hintId = useId();
  const zoomId = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const preview = useRef<HTMLCanvasElement>(null);
  const smallPreview = useRef<HTMLCanvasElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const drag = useRef<{ id: number; x: number; y: number; crop: AvatarCrop } | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [crop, setCrop] = useState<AvatarCrop>(initialAvatarCrop);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const element = dialog.current!;
    const previousOverflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = "hidden";
    return () => { element.close(); document.body.style.overflow = previousOverflow; };
  }, []);

  useEffect(() => {
    let active = true;
    const source = URL.createObjectURL(file);
    const nextImage = new Image();
    setImage(null);
    setError("");
    setCrop(initialAvatarCrop);
    drag.current = null;
    nextImage.onload = () => { if (active) setImage(nextImage); };
    nextImage.onerror = () => { if (active) setError("Không thể đọc ảnh này. Hãy chọn một ảnh JPEG, PNG hoặc WebP khác."); };
    nextImage.src = source;
    return () => { active = false; URL.revokeObjectURL(source); };
  }, [file]);

  useEffect(() => {
    if (!image) return;
    try {
      for (const target of [canvas.current, preview.current, smallPreview.current]) {
        if (target) drawAvatarCrop(target, image, crop);
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể hiển thị ảnh."); }
  }, [image, crop]);

  function updateCrop(next: AvatarCrop) {
    if (image && !busy) setCrop(constrainAvatarCrop(image.naturalWidth, image.naturalHeight, next));
  }

  function zoom(value: number) {
    const nextZoom = Math.max(1, Math.min(3, value));
    updateCrop({ ...crop, zoom: nextZoom, x: crop.x * nextZoom / crop.zoom, y: crop.y * nextZoom / crop.zoom });
  }

  function startDrag(event: PointerEvent<HTMLCanvasElement>) {
    if (!image || busy || event.button !== 0 || drag.current) return;
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, crop };
  }

  function moveDrag(event: PointerEvent<HTMLCanvasElement>) {
    const start = drag.current;
    if (!start || start.id !== event.pointerId) return;
    const ratio = AVATAR_CROP_SIZE / event.currentTarget.getBoundingClientRect().width;
    updateCrop({ ...start.crop, x: start.crop.x + (event.clientX - start.x) * ratio, y: start.crop.y + (event.clientY - start.y) * ratio });
  }

  function stopDrag(event: PointerEvent<HTMLCanvasElement>) {
    if (drag.current?.id === event.pointerId) drag.current = null;
  }

  async function apply() {
    if (!image || busy) return;
    setBusy(true);
    setError("");
    try { await onApply(await exportAvatarCrop(image, crop)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Chưa thể lưu ảnh. Vui lòng thử lại."); }
    finally { setBusy(false); }
  }

  return createPortal(<dialog ref={dialog} className="avatar-editor" aria-labelledby={titleId} aria-describedby={hintId}
    onCancel={(event) => { event.preventDefault(); if (!busy) onCancel(); }}>
    <header className="avatar-editor-header">
      <div><span className="eyebrow">ẢNH ĐẠI DIỆN CỦA BẠN</span><h2 id={titleId}>Chỉnh ảnh theo cách bạn thích</h2><p id={hintId}>Kéo ảnh để căn vị trí, thu phóng và xoay cho vừa khung.</p></div>
      <button type="button" className="icon-button" aria-label="Đóng chỉnh ảnh" onClick={onCancel} disabled={busy}><X size={20}/></button>
    </header>
    <div className="avatar-editor-content">
      <div className="avatar-editor-workspace">
        <div className="avatar-editor-stage" aria-busy={!image && !error}>
          <canvas ref={canvas} width={320} height={320} tabIndex={image && !busy ? 0 : -1} role="group"
            aria-label="Vùng cắt ảnh. Kéo hoặc dùng phím mũi tên để di chuyển ảnh."
            onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={stopDrag} onPointerCancel={stopDrag} onLostPointerCapture={stopDrag}
            onKeyDown={(event) => {
              const step = event.shiftKey ? 20 : 4;
              const delta = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[event.key];
              if (delta) { event.preventDefault(); updateCrop({ ...crop, x: crop.x + delta[0], y: crop.y + delta[1] }); }
            }}/>
          <div className="avatar-editor-mask" aria-hidden="true"/>
          {!image && <div className="avatar-editor-loading" role="status">{error ? <ImagePlus size={28}/> : <><LoaderCircle size={24} className="spin"/><span>Đang đọc ảnh…</span></>}</div>}
        </div>
        <p className="avatar-editor-drag-hint"><Move size={14}/>Kéo ảnh để chọn vùng hiển thị</p>
        <fieldset className="avatar-editor-controls" disabled={!image || busy}>
          <label htmlFor={zoomId}>Thu phóng <output>{Math.round(crop.zoom * 100)}%</output></label>
          <div className="avatar-editor-zoom">
            <button type="button" className="icon-button" aria-label="Thu nhỏ" disabled={crop.zoom <= 1} onClick={() => zoom(crop.zoom - .1)}><ZoomOut size={19}/></button>
            <input id={zoomId} type="range" min={1} max={3} step={.01} value={crop.zoom} onChange={(event) => zoom(Number(event.target.value))}/>
            <button type="button" className="icon-button" aria-label="Phóng to" disabled={crop.zoom >= 3} onClick={() => zoom(crop.zoom + .1)}><ZoomIn size={19}/></button>
          </div>
          <div className="avatar-editor-tools">
            <button type="button" onClick={() => updateCrop({ ...crop, rotation: (crop.rotation + 90) % 360, x: 0, y: 0 })}><RotateCw size={16}/>Xoay 90°</button>
            <button type="button" onClick={() => updateCrop(initialAvatarCrop)}><RotateCcw size={16}/>Đặt lại</button>
          </div>
        </fieldset>
      </div>
      <aside className="avatar-editor-preview">
        <span className="eyebrow">XEM TRƯỚC</span>
        <canvas ref={preview} width={128} height={128} aria-label="Ảnh đại diện sau khi cắt"/>
        <strong>{name}</strong><p>Đây là cách mọi người nhìn thấy bạn.</p>
        <div className="avatar-editor-header-preview"><canvas ref={smallPreview} width={42} height={42} aria-hidden="true"/><span>{name}</span><Check size={14}/></div>
        <small>Hiển thị trên thanh điều hướng</small>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => { const next = event.target.files?.[0]; event.target.value = ""; if (!next) return; const message = avatarFileError(next); if (message) setError(message); else { setError(""); onChoose(next); } }}/>
        <button type="button" className="button button-outline" disabled={busy} onClick={() => input.current?.click()}><ImagePlus size={16}/>Chọn ảnh khác</button>
        <small>JPEG, PNG hoặc WebP · Tối đa 5 MB</small>
      </aside>
    </div>
    {error && <p className="customer-auth-alert avatar-editor-error" role="alert">{error}</p>}
    <footer className="avatar-editor-footer"><span>Ảnh chỉ được cập nhật khi bạn áp dụng.</span><div>
      <button type="button" className="button button-outline" disabled={busy} onClick={onCancel}>Hủy</button>
      <button type="button" className="button button-dark" disabled={!image || busy} onClick={() => void apply()}>{busy ? <><LoaderCircle size={16} className="spin"/>Đang lưu ảnh…</> : <><Check size={16}/>Áp dụng</>}</button>
    </div></footer>
  </dialog>, document.body);
}
