export const AVATAR_CROP_SIZE = 320;

export function avatarFileError(file: Pick<File, "type" | "size">) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return "Chỉ nhận ảnh JPEG, PNG hoặc WebP.";
  if (file.size > 5 * 1024 * 1024) return "Ảnh đại diện không được quá 5 MB.";
  if (file.size === 0) return "Ảnh trống. Vui lòng chọn ảnh khác.";
  return "";
}

export interface AvatarCrop {
  zoom: number;
  rotation: number;
  x: number;
  y: number;
}

export const initialAvatarCrop: AvatarCrop = { zoom: 1, rotation: 0, x: 0, y: 0 };

export function avatarCropGeometry(width: number, height: number, crop: AvatarCrop) {
  const sideways = crop.rotation % 180 !== 0;
  const rotatedWidth = sideways ? height : width;
  const rotatedHeight = sideways ? width : height;
  const scale = AVATAR_CROP_SIZE / Math.min(rotatedWidth, rotatedHeight) * crop.zoom;
  const maxX = Math.max(0, (rotatedWidth * scale - AVATAR_CROP_SIZE) / 2);
  const maxY = Math.max(0, (rotatedHeight * scale - AVATAR_CROP_SIZE) / 2);
  return { scale, x: Math.max(-maxX, Math.min(maxX, crop.x)), y: Math.max(-maxY, Math.min(maxY, crop.y)) };
}

export function constrainAvatarCrop(width: number, height: number, crop: AvatarCrop): AvatarCrop {
  const bounded = { ...crop, zoom: Math.max(1, Math.min(3, crop.zoom)) };
  const { x, y } = avatarCropGeometry(width, height, bounded);
  return { ...bounded, x, y };
}

export function drawAvatarCrop(canvas: HTMLCanvasElement, image: HTMLImageElement, crop: AvatarCrop) {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Trình duyệt chưa hỗ trợ chỉnh ảnh. Vui lòng thử lại trên trình duyệt khác.");
  const { scale, x, y } = avatarCropGeometry(image.naturalWidth, image.naturalHeight, crop);
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.save();
  context.scale(canvas.width / AVATAR_CROP_SIZE, canvas.height / AVATAR_CROP_SIZE);
  context.translate(AVATAR_CROP_SIZE / 2 + x, AVATAR_CROP_SIZE / 2 + y);
  context.rotate(crop.rotation * Math.PI / 180);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, -image.naturalWidth * scale / 2, -image.naturalHeight * scale / 2, image.naturalWidth * scale, image.naturalHeight * scale);
  context.restore();
}

export async function exportAvatarCrop(image: HTMLImageElement, crop: AvatarCrop): Promise<File> {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 512;
  drawAvatarCrop(canvas, image, crop);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => result ? resolve(result) : reject(new Error("Không thể xử lý ảnh. Vui lòng thử lại.")), "image/png");
  });
  return new File([blob], "avatar.png", { type: "image/png" });
}
