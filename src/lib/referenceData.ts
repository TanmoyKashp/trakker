import type { ReferenceData } from "../types";

export const emptyReferenceData: ReferenceData = {
  applications: [],
  applicationTemplate: [],
  tree: [],
  coreAssets: [],
};

export const bundledReferenceData: ReferenceData = emptyReferenceData;

export function getCachedReferenceData(): ReferenceData {
  if (typeof window === "undefined") return emptyReferenceData;
  try {
    const cached = localStorage.getItem("trakker:phd:reference");
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed.applications)) return parsed;
    }
    const local = localStorage.getItem("trakker:v1");
    if (local) {
      const parsed = JSON.parse(local);
      if (parsed.lastReferenceData?.applications?.length) {
        return parsed.lastReferenceData;
      }
    }
  } catch {
    // Ignore parse error
  }
  return emptyReferenceData;
}

export async function loadReferenceData(): Promise<{ data: ReferenceData; offline: boolean; error?: string }> {
  const cached = getCachedReferenceData();
  const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
  return {
    data: cached,
    offline: isOffline,
  };
}
