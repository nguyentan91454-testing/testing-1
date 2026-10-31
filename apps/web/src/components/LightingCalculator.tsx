import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowRight, Lightbulb } from "lucide-react";
import { api } from "../lib/api";
import { formatVnd } from "../lib/format";

export function LightingCalculator() {
  const [area, setArea] = useState("18");
  const [roomType, setRoomType] = useState("phong-khach");
  const [height, setHeight] = useState("2.8");
  const rooms = useQuery({ queryKey: ["lighting-room-types"], queryFn: api.lightingRoomTypes });
  const calculate = useMutation({ mutationFn: api.calculateLighting });

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    calculate.mutate({ areaM2: Number(area), roomType, ceilingHeightM: Number(height), clearanceHeightM: Math.min(2.1, Number(height) - 0.2) });
  }

  return (
    <div className="lighting-layout">
      <div className="lighting-copy"><span className="eyebrow"><Lightbulb size={15} /> CÔNG CỤ MIỄN PHÍ</span><h2>Đủ sáng, vừa vặn<br />với từng căn phòng.</h2><p>Nhập diện tích và chiều cao trần. Chúng tôi tính lượng sáng tham khảo rồi lọc những mẫu đèn phù hợp.</p><span className="lighting-footnote">Kết quả tham khảo dựa trên tiêu chuẩn chiếu sáng phổ biến.</span></div>
      <form className="lighting-form" onSubmit={submit}>
        <label>Không gian<select value={roomType} onChange={(event) => setRoomType(event.target.value)} disabled={rooms.isLoading || !rooms.data?.length}>{rooms.data?.map((room) => <option value={room.roomType} key={room.roomType}>{room.roomType.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase())}</option>)}</select></label>
        <div className="field-row"><label>Diện tích <span>m²</span><input type="number" min="1" max="500" step="0.5" value={area} onChange={(event) => setArea(event.target.value)} required /></label><label>Chiều cao trần <span>m</span><input type="number" min="2.2" max="8" step="0.1" value={height} onChange={(event) => setHeight(event.target.value)} required /></label></div>
        <button className="button button-dark" type="submit" disabled={calculate.isPending || rooms.isLoading}>{calculate.isPending ? "Đang tính..." : "Tính ánh sáng"}<ArrowRight size={17} /></button>
        {calculate.data && <div className="lighting-result" aria-live="polite"><span>LƯỢNG SÁNG KHUYẾN NGHỊ</span><strong>{new Intl.NumberFormat("vi-VN").format(calculate.data.recommendedLumens)} <small>lm</small></strong><p>Khoảng phù hợp {new Intl.NumberFormat("vi-VN").format(calculate.data.acceptedLumens.min)}–{new Intl.NumberFormat("vi-VN").format(calculate.data.acceptedLumens.max)} lm · {calculate.data.products.length} mẫu phù hợp</p>{calculate.data.products[0] && <a href={`/products/${calculate.data.products[0].slug}`}>Xem từ {formatVnd(calculate.data.products[0].priceVnd)} <ArrowRight size={14} /></a>}</div>}
        {calculate.isError && <p className="inline-error">{calculate.error.message}</p>}
      </form>
    </div>
  );
}
