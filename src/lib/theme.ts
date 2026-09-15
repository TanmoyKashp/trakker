import { useCallback, useEffect, useState } from "react";
import type { Mode } from "../types";

export type ThemeId = "auto" | "maroon" | "matcha" | "ocean" | "lavender" | "terracotta" | "midnight";

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  description: string;
  preview: {
    bg: string;
    card: string;
    text: string;
    primary: string;
    accent: string;
  };
}

export const THEMES: ThemeDefinition[] = [
  {
    id: "auto",
    name: "Auto",
    description: "Adaptive mode: Maroon for Work, Matcha for Personal",
    preview: {
      bg: "#F7F3ED",
      card: "#FFFCF7",
      text: "#242424",
      primary: "#6B1F2A",
      accent: "#7A8450",
    },
  },
  {
    id: "maroon",
    name: "Maroon",
    description: "Warm cream, charcoal, and deep noble maroon",
    preview: {
      bg: "#F7F3ED",
      card: "#FFFCF7",
      text: "#242424",
      primary: "#6B1F2A",
      accent: "#F9CDD5",
    },
  },
  {
    id: "matcha",
    name: "Matcha",
    description: "Warm cream, calming olive, and delicate blush",
    preview: {
      bg: "#F7F3ED",
      card: "#FFFCF7",
      text: "#242424",
      primary: "#7A8450",
      accent: "#E8EACF",
    },
  },
  {
    id: "ocean",
    name: "Ocean",
    description: "Light crisp neutral with deep Nordic navy",
    preview: {
      bg: "#F4F6F8",
      card: "#FCFDFE",
      text: "#1E293B",
      primary: "#25526C",
      accent: "#CFE2EC",
    },
  },
  {
    id: "lavender",
    name: "Lavender",
    description: "Soft neutral mist with muted dusty lavender",
    preview: {
      bg: "#F6F4F7",
      card: "#FDFBFE",
      text: "#2D2534",
      primary: "#6B567A",
      accent: "#E3D8EB",
    },
  },
  {
    id: "terracotta",
    name: "Terracotta",
    description: "Warm parchment with earthy desert terracotta",
    preview: {
      bg: "#F8F4F0",
      card: "#FFFCFA",
      text: "#2C221D",
      primary: "#8A422D",
      accent: "#F5D6CB",
    },
  },
  {
    id: "midnight",
    name: "Midnight",
    description: "Deep charcoal with warm off-white and subtle gold",
    preview: {
      bg: "#18181B",
      card: "#222226",
      text: "#F4F4F5",
      primary: "#C29B38",
      accent: "#3A3424",
    },
  },
];

const THEME_STORAGE_KEY = "trakker:theme";

export function getStoredTheme(): ThemeId {
  if (typeof window === "undefined") return "auto";
  const val = localStorage.getItem(THEME_STORAGE_KEY) as ThemeId | null;
  if (val && THEMES.some((t) => t.id === val)) {
    return val;
  }
  return "auto";
}

/**
 * Applies the selected theme and mode to the document element.
 */
export function applyThemeToDom(themeId: ThemeId, mode: Mode): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  // Set the palette attribute
  root.setAttribute("data-palette", themeId);
  root.setAttribute("data-theme", mode);

  // Update browser status bar meta tag
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    if (themeId === "auto") {
      metaThemeColor.setAttribute("content", mode === "work" ? "#6B1F2A" : "#7A8450");
    } else {
      const def = THEMES.find((t) => t.id === themeId);
      if (def) {
        metaThemeColor.setAttribute("content", def.preview.primary);
      }
    }
  }
}

/**
 * Hook to read and write the active theme.
 */
export function useTheme(initialSyncedTheme?: string | null, onThemePersist?: (theme: ThemeId) => void) {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    if (initialSyncedTheme && THEMES.some((t) => t.id === initialSyncedTheme)) {
      return initialSyncedTheme as ThemeId;
    }
    return getStoredTheme();
  });

  useEffect(() => {
    if (initialSyncedTheme && THEMES.some((t) => t.id === initialSyncedTheme) && initialSyncedTheme !== theme) {
      setThemeState(initialSyncedTheme as ThemeId);
      localStorage.setItem(THEME_STORAGE_KEY, initialSyncedTheme);
    }
  }, [initialSyncedTheme, theme]);

  const setTheme = useCallback(
    (nextTheme: ThemeId) => {
      setThemeState(nextTheme);
      try {
        localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
      } catch {
        // quota
      }
      if (onThemePersist) {
        onThemePersist(nextTheme);
      }
      window.dispatchEvent(new CustomEvent("trakker:theme:changed", { detail: nextTheme }));
    },
    [onThemePersist],
  );

  useEffect(() => {
    function handleThemeChange(event: Event) {
      const customEvent = event as CustomEvent<ThemeId>;
      if (customEvent.detail && THEMES.some((t) => t.id === customEvent.detail)) {
        setThemeState(customEvent.detail);
      }
    }
    window.addEventListener("trakker:theme:changed", handleThemeChange);
    return () => window.removeEventListener("trakker:theme:changed", handleThemeChange);
  }, []);

  return {
    theme,
    setTheme,
    themes: THEMES,
  };
}
