import { useCallback, useEffect, useState } from "react";
import type { ActiveWorkout } from "../types";

const TIMER_STORAGE_KEY = "trakker:active_workout:v1";

function readActiveWorkout(): ActiveWorkout | null {
  try {
    const raw = localStorage.getItem(TIMER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ActiveWorkout>;
    if (parsed && typeof parsed.startedAt === "number" && typeof parsed.durationSeconds === "number") {
      return parsed as ActiveWorkout;
    }
    return null;
  } catch {
    return null;
  }
}

export function useWorkoutTimer() {
  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkout | null>(readActiveWorkout);
  const [secondsLeft, setSecondsLeft] = useState<number>(() => {
    const initial = readActiveWorkout();
    if (!initial) return 0;
    const elapsed = Math.floor((Date.now() - initial.startedAt) / 1000);
    return Math.max(0, initial.durationSeconds - elapsed);
  });

  // Ticking countdown effect: single interval, clean cleanup, handles refresh/navigation
  useEffect(() => {
    if (!activeWorkout) {
      setSecondsLeft(0);
      return;
    }

    const updateTimer = () => {
      const elapsed = Math.floor((Date.now() - activeWorkout.startedAt) / 1000);
      const remaining = Math.max(0, activeWorkout.durationSeconds - elapsed);
      setSecondsLeft(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 500);

    return () => clearInterval(interval);
  }, [activeWorkout]);

  // Sync across tabs
  useEffect(() => {
    function handleStorageChange(e: StorageEvent) {
      if (e.key === TIMER_STORAGE_KEY) {
        setActiveWorkout(readActiveWorkout());
      }
    }
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const startWorkout = useCallback((workout: { id: string; title: string }) => {
    const active: ActiveWorkout = {
      workoutId: workout.id,
      workoutTitle: workout.title || "Workout",
      startedAt: Date.now(),
      durationSeconds: 60,
    };
    try {
      localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(active));
    } catch {
      // storage quota or disabled
    }
    setActiveWorkout(active);
    setSecondsLeft(60);
  }, []);

  const stopWorkout = useCallback(() => {
    try {
      localStorage.removeItem(TIMER_STORAGE_KEY);
    } catch {
      // storage quota or disabled
    }
    setActiveWorkout(null);
    setSecondsLeft(0);
  }, []);

  return {
    activeWorkout,
    secondsLeft,
    isActive: Boolean(activeWorkout),
    isCompleted: Boolean(activeWorkout && secondsLeft === 0),
    startWorkout,
    stopWorkout,
  };
}
