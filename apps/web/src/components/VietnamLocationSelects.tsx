import { useEffect, useState } from "react";

export type LocationWard = { code: number; name: string };
export type LocationDistrict = { code: number; name: string; wards: LocationWard[] };
export type LocationProvince = { code: number; name: string; districts: LocationDistrict[] };

let locationsPromise: Promise<LocationProvince[]> | null = null;
function loadLocations() {
  locationsPromise ??= fetch("https://provinces.open-api.vn/api/?depth=3").then(async (response) => {
    if (!response.ok) throw new Error("Không thể tải danh sách tỉnh thành.");
    return response.json() as Promise<LocationProvince[]>;
  });
  return locationsPromise;
}

export function useVietnamLocations() {
  const [locations, setLocations] = useState<LocationProvince[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    loadLocations().then((value) => { if (active) { setLocations(value); setIsLoading(false); } }).catch((reason: unknown) => { if (active) { setError(reason instanceof Error ? reason.message : "Không thể tải danh sách địa chỉ."); setIsLoading(false); } });
    return () => { active = false; };
  }, []);
  return { locations, isLoading, error };
}

export function withCurrentOption(options: string[], current: string) {
  return current && !options.includes(current) ? [current, ...options] : options;
}
