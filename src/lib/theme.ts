import { useCallback, useEffect, useState } from "react";
import type { Mode, UserPreferences } from "../types";

export type ThemeId = "auto" | "maroon" | "matcha" | "ocean" | "lavender" | "terracotta" | "dark-side";

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
  darkPreview: {
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
    darkPreview: {
      bg: "#161618",
      card: "#1F1F23",
      text: "#F5F4F0",
      primary: "#C94A5C",
      accent: "#9BAA5E",
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
    darkPreview: {
      bg: "#161618",
      card: "#1F1F23",
      text: "#F5F4F0",
      primary: "#C94A5C",
      accent: "#F0A8B4",
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
    darkPreview: {
      bg: "#161618",
      card: "#1F1F23",
      text: "#F5F4F0",
      primary: "#9BAA5E",
      accent: "#D8DEC0",
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
    darkPreview: {
      bg: "#161618",
      card: "#1F1F23",
      text: "#F5F4F0",
      primary: "#4A8CAE",
      accent: "#B4D3E4",
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
    darkPreview: {
      bg: "#161618",
      card: "#1F1F23",
      text: "#F5F4F0",
      primary: "#9E84B2",
      accent: "#D7C5E4",
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
    darkPreview: {
      bg: "#161618",
      card: "#1F1F23",
      text: "#F5F4F0",
      primary: "#C4684A",
      accent: "#EBBAA8",
    },
  },
  {
    id: "dark-side",
    name: "A's Dark Side",
    description: "Trakker's dark/night mode with your active accent",
    preview: {
      bg: "#161618",
      card: "#1F1F23",
      text: "#F5F4F0",
      primary: "#C94A5C",
      accent: "#F0A8B4",
    },
    darkPreview: {
      bg: "#161618",
      card: "#1F1F23",
      text: "#F5F4F0",
      primary: "#C94A5C",
      accent: "#F0A8B4",
    },
  },
];

export const THEME_STORAGE_KEY = "trakker:theme";
export const DARK_SIDE_STORAGE_KEY = "trakker:dark_side";
export const PREFERENCES_STORAGE_KEY = "trakker:preferences";

export function getStoredTheme(): ThemeId {
  if (typeof window === "undefined") return "auto";
  const val = localStorage.getItem(THEME_STORAGE_KEY) as ThemeId | null;
  if (val && THEMES.some((t) => t.id === val)) {
    return val;
  }
  return "auto";
}

export function getStoredDarkSide(): boolean {
  if (typeof window === "undefined") return false;
  const val = localStorage.getItem(DARK_SIDE_STORAGE_KEY);
  return val === "true";
}

export function getStoredPreferences(): UserPreferences {
  if (typeof window === "undefined") {
    return { theme: "auto", darkSide: false, updatedAt: new Date().toISOString() };
  }
  try {
    const raw = localStorage.getItem(PREFERENCES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<UserPreferences>;
      if (parsed && typeof parsed.theme === "string") {
        return {
          theme: parsed.theme,
          darkSide: Boolean(parsed.darkSide),
          updatedAt: parsed.updatedAt || new Date().toISOString(),
        };
      }
    }
  } catch {
    // fallback
  }

  const theme = getStoredTheme();
  const darkSide = getStoredDarkSide() || theme === "dark-side";
  return {
    theme: theme === "dark-side" ? "auto" : theme,
    darkSide,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Applies the selected theme, mode, and dark mode state to the document element.
 */
export function applyThemeToDom(themeId: ThemeId, mode: Mode, darkSide: boolean): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  // If themeId is "dark-side", treat the accent as auto and darkSide as true
  const effectiveDarkSide = darkSide || themeId === "dark-side";
  const effectivePalette = themeId === "dark-side" ? "auto" : themeId;

  // Set attributes
  root.setAttribute("data-palette", effectivePalette);
  root.setAttribute("data-theme", mode);
  root.setAttribute("data-dark-side", effectiveDarkSide ? "true" : "false");

  if (effectiveDarkSide) {
    root.classList.add("dark-side");
  } else {
    root.classList.remove("dark-side");
  }

  // Update browser status bar meta tag
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    if (effectiveDarkSide) {
      metaThemeColor.setAttribute("content", "#161618");
    } else if (effectivePalette === "auto") {
      metaThemeColor.setAttribute("content", mode === "work" ? "#6B1F2A" : "#7A8450");
    } else {
      const def = THEMES.find((t) => t.id === effectivePalette);
      if (def) {
        metaThemeColor.setAttribute("content", def.preview.primary);
      }
    }
  }
}

/**
 * Hook to read and write active theme & A's Dark Side.
 */
export function useTheme(
  initialSyncedPreferences?: UserPreferences | null,
  onPreferencesPersist?: (prefs: UserPreferences) => void,
) {
  const [preferences, setPreferencesState] = useState<UserPreferences>(() => {
    if (initialSyncedPreferences) {
      return initialSyncedPreferences;
    }
    return getStoredPreferences();
  });

  // Sync when remote preferences arrive
  useEffect(() => {
    if (initialSyncedPreferences) {
      setPreferencesState((prev) => {
        if (
          prev.theme !== initialSyncedPreferences.theme ||
          prev.darkSide !== initialSyncedPreferences.darkSide
        ) {
          try {
            localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(initialSyncedPreferences));
            localStorage.setItem(THEME_STORAGE_KEY, initialSyncedPreferences.theme);
            localStorage.setItem(DARK_SIDE_STORAGE_KEY, String(initialSyncedPreferences.darkSide));
          } catch {
            // quota
          }
          return initialSyncedPreferences;
        }
        return prev;
      });
    }
  }, [initialSyncedPreferences]);

  const updatePreferences = useCallback(
    (patch: Partial<UserPreferences>) => {
      setPreferencesState((prev) => {
        const nextTheme = patch.theme !== undefined ? patch.theme : prev.theme;
        let nextDarkSide = patch.darkSide !== undefined ? patch.darkSide : prev.darkSide;

        // If user explicitly picked "dark-side" as theme:
        if (nextTheme === "dark-side") {
          nextDarkSide = true;
        }

        const nextPrefs: UserPreferences = {
          theme: nextTheme === "dark-side" ? (prev.theme === "dark-side" ? "auto" : prev.theme) : nextTheme,
          darkSide: nextDarkSide,
          updatedAt: new Date().toISOString(),
        };

        try {
          localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(nextPrefs));
          localStorage.setItem(THEME_STORAGE_KEY, nextPrefs.theme);
          localStorage.setItem(DARK_SIDE_STORAGE_KEY, String(nextPrefs.darkSide));
        } catch {
          // quota
        }

        if (onPreferencesPersist) {
          onPreferencesPersist(nextPrefs);
        }

        window.dispatchEvent(new CustomEvent("trakker:preferences:changed", { detail: nextPrefs }));
        window.dispatchEvent(new CustomEvent("trakker:theme:changed", { detail: nextPrefs.theme }));
        return nextPrefs;
      });
    },
    [onPreferencesPersist],
  );

  const setTheme = useCallback(
    (nextTheme: ThemeId) => {
      if (nextTheme === "dark-side") {
        updatePreferences({ darkSide: true });
      } else {
        updatePreferences({ theme: nextTheme });
      }
    },
    [updatePreferences],
  );

  const setDarkSide = useCallback(
    (enabled: boolean) => {
      updatePreferences({ darkSide: enabled });
    },
    [updatePreferences],
  );

  const toggleDarkSide = useCallback(() => {
    updatePreferences({ darkSide: !preferences.darkSide });
  }, [preferences.darkSide, updatePreferences]);

  // Sync across tabs and custom events
  useEffect(() => {
    function handlePrefsChange(event: Event) {
      const customEvent = event as CustomEvent<UserPreferences>;
      if (customEvent.detail) {
        setPreferencesState(customEvent.detail);
      }
    }

    function handleStorage(e: StorageEvent) {
      if (e.key === PREFERENCES_STORAGE_KEY || e.key === DARK_SIDE_STORAGE_KEY || e.key === THEME_STORAGE_KEY) {
        setPreferencesState(getStoredPreferences());
      }
    }

    window.addEventListener("trakker:preferences:changed", handlePrefsChange);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("trakker:preferences:changed", handlePrefsChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  return {
    theme: preferences.theme as ThemeId,
    darkSide: preferences.darkSide,
    preferences,
    setTheme,
    setDarkSide,
    toggleDarkSide,
    themes: THEMES,
  };
}
