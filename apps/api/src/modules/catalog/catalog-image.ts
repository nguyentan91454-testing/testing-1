import { env } from "../../config/env.js";

export function publicCatalogImageUrl(value: string): string {
  const publicBase = env.R2_PUBLIC_BASE_URL;
  if (!publicBase || !value.startsWith("/images/")) return value;
  const key = value.slice("/images/".length);
  const segments = key.split("/");
  if (segments.some((part) => !part || part === "." || part === ".." || /[\\?#]/.test(part))) return value;
  return publicBase + "/" + segments.map(encodeURIComponent).join("/");
}

export function publicTaxonomyImage<T extends { imageUrl: string | null }>(item: T): T {
  return item.imageUrl ? { ...item, imageUrl: publicCatalogImageUrl(item.imageUrl) } : item;
}

export function publicCatalogImage<T extends { url: string }>(image: T): T {
  return { ...image, url: publicCatalogImageUrl(image.url) };
}

