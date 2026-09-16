import { useCallback, useEffect, useRef, useState } from "react";

export type TimerMode = "exercise" | "rest" | "stopwatch";

export interface StoredTimerState {
  isRunning: boolean;
  isPaused: boolean;
  mode: TimerMode;
  label: string;
  initialDuration: number;
  targetEndTime: number | null; // Date.now() when timer will hit 0
  remainingWhenPaused: number | null;
  workoutStartedAt: number | null; // For tracking total workout session duration
}

const TIMER_STORAGE_KEY = "trakker:workout_timer:v2";

function readStoredTimer(): StoredTimerState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(TIMER_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredTimerState;
  } catch {
    return null;
  }
}

function writeStoredTimer(state: StoredTimerState | null) {
  if (typeof window === "undefined") return;
  try {
    if (state) {
      localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(state));
    } else {
      localStorage.removeItem(TIMER_STORAGE_KEY);
    }
  } catch {
    // quota
  }
}

/** Gentle, elegant two-tone chime via Web Audio API when countdown finishes */
function playChime() {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === "suspended") {
      void ctx.resume();
    }

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5
    gain1.gain.setValueAtTime(0.001, now);
    gain1.gain.linearRampToValueAtTime(0.2, now + 0.04);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.46);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880, now + 0.18);
    osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.3); // D6
    gain2.gain.setValueAtTime(0.001, now + 0.18);
    gain2.gain.linearRampToValueAtTime(0.25, now + 0.22);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.18);
    osc2.stop(now + 0.71);
  } catch {
    // Web audio blocked or unsupported
  }
}

/** Optional browser notification only if already permitted */
function notifyTimerFinish(label: string) {
  if (typeof window === "undefined" || typeof Notification === "undefined") return;
  if (Notification.permission === "granted") {
    try {
      new Notification("Trakker Workout", {
        body: `${label || "Timer"} finished! Ready for next set.`,
        icon: "/favicon.svg",
        silent: false,
      });
    } catch {
      // ignore
    }
  }
}

export function useWorkoutTimer() {
  const [timerState, setTimerState] = useState<StoredTimerState | null>(readStoredTimer);
  const [secondsLeft, setSecondsLeft] = useState<number>(() => {
    const s = readStoredTimer();
    if (!s) return 0;
    if (s.isPaused && s.remainingWhenPaused !== null) return s.remainingWhenPaused;
    if (s.targetEndTime) {
      return Math.max(0, Math.ceil((s.targetEndTime - Date.now()) / 1000));
    }
    return s.initialDuration || 0;
  });

  const [sessionElapsedSeconds, setSessionElapsedSeconds] = useState<number>(() => {
    const s = readStoredTimer();
    if (!s || !s.workoutStartedAt) return 0;
    return Math.max(0, Math.floor((Date.now() - s.workoutStartedAt) / 1000));
  });

  const [hasFinishedAlerted, setHasFinishedAlerted] = useState(false);
  const chimePlayedRef = useRef(false);

  // Synchronous tick effect driven by timestamps (resilient against React re-renders)
  useEffect(() => {
    if (!timerState) {
      setSecondsLeft(0);
      setSessionElapsedSeconds(0);
      return;
    }

    const interval = setInterval(() => {
      // 1. Session elapsed time
      if (timerState.workoutStartedAt) {
        setSessionElapsedSeconds(Math.max(0, Math.floor((Date.now() - timerState.workoutStartedAt) / 1000)));
      }

      // 2. Countdown timer
      if (!timerState.isRunning || timerState.isPaused) {
        if (timerState.isPaused && timerState.remainingWhenPaused !== null) {
          setSecondsLeft(timerState.remainingWhenPaused);
        }
        return;
      }

      if (timerState.targetEndTime) {
        const remaining = Math.max(0, Math.ceil((timerState.targetEndTime - Date.now()) / 1000));
        setSecondsLeft(remaining);

        if (remaining === 0 && !chimePlayedRef.current) {
          chimePlayedRef.current = true;
          setHasFinishedAlerted(true);
          playChime();
          notifyTimerFinish(timerState.label);
        }
      }
    }, 400);

    return () => clearInterval(interval);
  }, [timerState]);

  // Sync across browser tabs
  useEffect(() => {
    function handleStorage(e: StorageEvent) {
      if (e.key === TIMER_STORAGE_KEY) {
        const fresh = readStoredTimer();
        setTimerState(fresh);
        chimePlayedRef.current = false;
      }
    }
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const startSession = useCallback(() => {
    setTimerState((prev) => {
      const startedAt = prev?.workoutStartedAt || Date.now();
      const next: StoredTimerState = {
        isRunning: false,
        isPaused: false,
        mode: "stopwatch",
        label: "Workout Session",
        initialDuration: 0,
        targetEndTime: null,
        remainingWhenPaused: null,
        workoutStartedAt: startedAt,
      };
      writeStoredTimer(next);
      return next;
    });
  }, []);

  const startCountdown = useCallback((durationSeconds: number, label: string, mode: TimerMode = "exercise") => {
    chimePlayedRef.current = false;
    setHasFinishedAlerted(false);
    const targetEndTime = Date.now() + durationSeconds * 1000;
    setTimerState((prev) => {
      const next: StoredTimerState = {
        isRunning: true,
        isPaused: false,
        mode,
        label,
        initialDuration: durationSeconds,
        targetEndTime,
        remainingWhenPaused: null,
        workoutStartedAt: prev?.workoutStartedAt || Date.now(),
      };
      writeStoredTimer(next);
      return next;
    });
    setSecondsLeft(durationSeconds);
  }, []);

  const startRestTimer = useCallback((seconds: number = 60) => {
    startCountdown(seconds, "Rest Timer", "rest");
  }, [startCountdown]);

  const pauseTimer = useCallback(() => {
    setTimerState((prev) => {
      if (!prev || !prev.isRunning || prev.isPaused || !prev.targetEndTime) return prev;
      const remaining = Math.max(0, Math.ceil((prev.targetEndTime - Date.now()) / 1000));
      const next: StoredTimerState = {
        ...prev,
        isPaused: true,
        remainingWhenPaused: remaining,
        targetEndTime: null,
      };
      writeStoredTimer(next);
      setSecondsLeft(remaining);
      return next;
    });
  }, []);

  const resumeTimer = useCallback(() => {
    setTimerState((prev) => {
      if (!prev || !prev.isPaused || prev.remainingWhenPaused === null) return prev;
      const targetEndTime = Date.now() + prev.remainingWhenPaused * 1000;
      const next: StoredTimerState = {
        ...prev,
        isPaused: false,
        targetEndTime,
        remainingWhenPaused: null,
      };
      writeStoredTimer(next);
      return next;
    });
  }, []);

  const resetTimer = useCallback(() => {
    chimePlayedRef.current = false;
    setHasFinishedAlerted(false);
    setTimerState((prev) => {
      if (!prev || !prev.initialDuration) return prev;
      const targetEndTime = Date.now() + prev.initialDuration * 1000;
      const next: StoredTimerState = {
        ...prev,
        isRunning: true,
        isPaused: false,
        targetEndTime,
        remainingWhenPaused: null,
      };
      writeStoredTimer(next);
      setSecondsLeft(prev.initialDuration);
      return next;
    });
  }, []);

  const addSeconds = useCallback((seconds: number) => {
    setTimerState((prev) => {
      if (!prev) return prev;
      if (prev.isPaused && prev.remainingWhenPaused !== null) {
        const nextRemaining = prev.remainingWhenPaused + seconds;
        const next = { ...prev, remainingWhenPaused: nextRemaining };
        writeStoredTimer(next);
        setSecondsLeft(nextRemaining);
        return next;
      }
      if (prev.targetEndTime) {
        const nextTarget = prev.targetEndTime + seconds * 1000;
        const next = { ...prev, targetEndTime: nextTarget };
        writeStoredTimer(next);
        const remaining = Math.max(0, Math.ceil((nextTarget - Date.now()) / 1000));
        setSecondsLeft(remaining);
        return next;
      }
      return prev;
    });
  }, []);

  const stopTimer = useCallback(() => {
    chimePlayedRef.current = false;
    setHasFinishedAlerted(false);
    setTimerState((prev) => {
      if (!prev) return null;
      // Keep session stopwatch alive if in workout, only reset the countdown
      const next: StoredTimerState = {
        ...prev,
        isRunning: false,
        isPaused: false,
        targetEndTime: null,
        remainingWhenPaused: null,
        initialDuration: 0,
      };
      writeStoredTimer(next);
      return next;
    });
    setSecondsLeft(0);
  }, []);

  const stopWorkoutSession = useCallback(() => {
    chimePlayedRef.current = false;
    setHasFinishedAlerted(false);
    writeStoredTimer(null);
    setTimerState(null);
    setSecondsLeft(0);
    setSessionElapsedSeconds(0);
  }, []);

  // Format seconds as MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const isCountdownActive = Boolean(timerState?.isRunning && !timerState?.isPaused && secondsLeft > 0);
  const isCountdownFinished = Boolean(timerState?.isRunning && secondsLeft === 0);

  return {
    timerState,
    secondsLeft,
    sessionElapsedSeconds,
    formattedSecondsLeft: formatTime(secondsLeft),
    formattedSessionElapsed: formatTime(sessionElapsedSeconds),
    isCountdownActive,
    isCountdownFinished,
    isPaused: Boolean(timerState?.isPaused),
    mode: timerState?.mode || "stopwatch",
    label: timerState?.label || "Timer",
    hasFinishedAlerted,
    startSession,
    startCountdown,
    startRestTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
    addSeconds,
    stopTimer,
    stopWorkoutSession,
  };
}
