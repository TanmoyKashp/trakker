import { useCallback, useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { getTodayDayName, getWorkoutExercises, getWorkoutPlan, WORKOUT_PLANS } from "../lib/workoutData";
import type { DayOfWeekName, WorkoutPlan, WorkoutSession } from "../types";

export interface StoredUserState {
  activePlanId: string;
  activeDay: DayOfWeekName;
  // Progress keyed by "planId:day:YYYY-MM-DD"
  progressByDay: Record<string, { completed: string[]; skipped: string[] }>;
  updatedAt: string;
}

function getTodayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function stateStorageKey(uid?: string | null): string {
  return `trakker:workout_state:${uid || "anon"}`;
}

function historyStorageKey(uid?: string | null): string {
  return `trakker:workout_history:${uid || "anon"}`;
}

function readLocalState(uid?: string | null): StoredUserState {
  if (typeof window === "undefined") {
    return {
      activePlanId: "plan-1",
      activeDay: getTodayDayName(),
      progressByDay: {},
      updatedAt: new Date().toISOString(),
    };
  }
  try {
    const raw = localStorage.getItem(stateStorageKey(uid));
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<StoredUserState>;
      return {
        activePlanId: parsed.activePlanId || "plan-1",
        activeDay: (parsed.activeDay as DayOfWeekName) || getTodayDayName(),
        progressByDay: parsed.progressByDay || {},
        updatedAt: parsed.updatedAt || new Date().toISOString(),
      };
    }
  } catch {
    // fallback
  }
  return {
    activePlanId: "plan-1",
    activeDay: getTodayDayName(),
    progressByDay: {},
    updatedAt: new Date().toISOString(),
  };
}

function readLocalHistory(uid?: string | null): WorkoutSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(historyStorageKey(uid));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as WorkoutSession[];
    }
  } catch {
    // fallback
  }
  return [];
}

export function useWorkoutState(uid?: string | null) {
  const [state, setState] = useState<StoredUserState>(() => readLocalState(uid));
  const [history, setHistory] = useState<WorkoutSession[]>(() => readLocalHistory(uid));
  const [activeSessionStartTime, setActiveSessionStartTime] = useState<number | null>(null);

  // When UID changes (e.g. login/logout/switch user), re-read strictly for that UID
  useEffect(() => {
    setState(readLocalState(uid));
    setHistory(readLocalHistory(uid));
  }, [uid]);

  // Load remote workout state and sessions from Firestore when UID is authenticated
  useEffect(() => {
    if (!uid || !db) return;
    const userId = uid;

    let isMounted = true;
    const firestore = db;

    async function loadRemote() {
      try {
        // 1. Load workoutState doc
        const stateDocRef = doc(firestore, "users", userId, "data", "workoutState");
        const stateSnap = await getDoc(stateDocRef);
        if (stateSnap.exists() && isMounted) {
          const remoteData = stateSnap.data() as Partial<StoredUserState>;
          setState((prev) => {
            const remoteTime = remoteData.updatedAt || "";
            const localTime = prev.updatedAt || "";
            if (remoteTime >= localTime) {
              const merged: StoredUserState = {
                activePlanId: remoteData.activePlanId || prev.activePlanId,
                activeDay: (remoteData.activeDay as DayOfWeekName) || prev.activeDay,
                progressByDay: { ...(prev.progressByDay || {}), ...(remoteData.progressByDay || {}) },
                updatedAt: remoteTime || new Date().toISOString(),
              };
              try {
                localStorage.setItem(stateStorageKey(userId), JSON.stringify(merged));
              } catch {
                // ignore
              }
              return merged;
            }
            return prev;
          });
        }

        // 2. Load recent workout sessions
        const sessionsCollRef = collection(firestore, "users", userId, "data", "workoutSessions", "sessions");
        const q = query(sessionsCollRef, orderBy("startedAt", "desc"), limit(20));
        const sessionsSnap = await getDocs(q);
        if (!sessionsSnap.empty && isMounted) {
          const remoteSessions: WorkoutSession[] = [];
          sessionsSnap.forEach((docSnap) => {
            remoteSessions.push(docSnap.data() as WorkoutSession);
          });
          setHistory((prev) => {
            const map = new Map<string, WorkoutSession>();
            for (const s of remoteSessions) map.set(s.id, s);
            for (const s of prev) if (!map.has(s.id)) map.set(s.id, s);
            const combined = Array.from(map.values()).sort(
              (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
            );
            try {
              localStorage.setItem(historyStorageKey(uid), JSON.stringify(combined));
            } catch {
              // ignore
            }
            return combined;
          });
        }
      } catch (err) {
        console.warn("[WORKOUT] Remote load warning:", err);
      }
    }

    void loadRemote();
    return () => {
      isMounted = false;
    };
  }, [uid]);

  // Persist local state changes and sync to Firestore
  const saveState = useCallback(
    (nextState: StoredUserState) => {
      setState(nextState);
      try {
        localStorage.setItem(stateStorageKey(uid), JSON.stringify(nextState));
      } catch {
        // storage quota
      }

      if (uid && db) {
        const firestore = db;
        const userId = uid;
        const stateDocRef = doc(firestore, "users", userId, "data", "workoutState");
        void setDoc(stateDocRef, nextState, { merge: true }).catch((e) => {
          console.warn("[WORKOUT] state sync error:", e);
        });
      }
    },
    [uid],
  );

  const activePlan: WorkoutPlan = useMemo(() => {
    return getWorkoutPlan(state.activePlanId);
  }, [state.activePlanId]);

  const activeDay: DayOfWeekName = state.activeDay;

  const currentExercises = useMemo(() => {
    return getWorkoutExercises(state.activePlanId, activeDay);
  }, [state.activePlanId, activeDay]);

  const dayKey = `${state.activePlanId}:${activeDay}:${getTodayIso()}`;
  const todayProgress = state.progressByDay[dayKey] || { completed: [], skipped: [] };

  const selectPlan = useCallback(
    (planId: string) => {
      const next: StoredUserState = {
        ...state,
        activePlanId: planId,
        updatedAt: new Date().toISOString(),
      };
      saveState(next);
    },
    [state, saveState],
  );

  const selectDay = useCallback(
    (day: DayOfWeekName) => {
      const next: StoredUserState = {
        ...state,
        activeDay: day,
        updatedAt: new Date().toISOString(),
      };
      saveState(next);
    },
    [state, saveState],
  );

  const markComplete = useCallback(
    (exerciseId: string) => {
      const current = state.progressByDay[dayKey] || { completed: [], skipped: [] };
      const completed = current.completed.includes(exerciseId)
        ? current.completed
        : [...current.completed, exerciseId];
      const skipped = current.skipped.filter((id) => id !== exerciseId);

      const next: StoredUserState = {
        ...state,
        progressByDay: {
          ...state.progressByDay,
          [dayKey]: { completed, skipped },
        },
        updatedAt: new Date().toISOString(),
      };
      saveState(next);
    },
    [state, dayKey, saveState],
  );

  const undoComplete = useCallback(
    (exerciseId: string) => {
      const current = state.progressByDay[dayKey] || { completed: [], skipped: [] };
      const completed = current.completed.filter((id) => id !== exerciseId);
      const skipped = current.skipped.filter((id) => id !== exerciseId);

      const next: StoredUserState = {
        ...state,
        progressByDay: {
          ...state.progressByDay,
          [dayKey]: { completed, skipped },
        },
        updatedAt: new Date().toISOString(),
      };
      saveState(next);
    },
    [state, dayKey, saveState],
  );

  const skipExercise = useCallback(
    (exerciseId: string) => {
      const current = state.progressByDay[dayKey] || { completed: [], skipped: [] };
      const skipped = current.skipped.includes(exerciseId)
        ? current.skipped
        : [...current.skipped, exerciseId];
      const completed = current.completed.filter((id) => id !== exerciseId);

      const next: StoredUserState = {
        ...state,
        progressByDay: {
          ...state.progressByDay,
          [dayKey]: { completed, skipped },
        },
        updatedAt: new Date().toISOString(),
      };
      saveState(next);
    },
    [state, dayKey, saveState],
  );

  const restartWorkout = useCallback(() => {
    const next: StoredUserState = {
      ...state,
      progressByDay: {
        ...state.progressByDay,
        [dayKey]: { completed: [], skipped: [] },
      },
      updatedAt: new Date().toISOString(),
    };
    saveState(next);
    setActiveSessionStartTime(null);
  }, [state, dayKey, saveState]);

  const startSession = useCallback(() => {
    setActiveSessionStartTime(Date.now());
  }, []);

  const finishWorkout = useCallback(
    async (durationSeconds: number): Promise<WorkoutSession> => {
      const now = new Date();
      const finishedIso = now.toISOString();
      const startedIso = activeSessionStartTime
        ? new Date(activeSessionStartTime).toISOString()
        : new Date(now.getTime() - durationSeconds * 1000).toISOString();

      const session: WorkoutSession = {
        id: crypto.randomUUID(),
        uid: uid || "anon",
        planId: state.activePlanId,
        planName: activePlan.name,
        day: activeDay,
        date: getTodayIso(),
        startedAt: startedIso,
        finishedAt: finishedIso,
        durationSeconds: Math.max(1, durationSeconds),
        totalExercises: currentExercises.length,
        completedCount: todayProgress.completed.length,
        skippedCount: todayProgress.skipped.length,
        completedExerciseIds: [...todayProgress.completed],
        skippedExerciseIds: [...todayProgress.skipped],
      };

      // 1. Update local history
      setHistory((prev) => {
        const next = [session, ...prev];
        try {
          localStorage.setItem(historyStorageKey(uid), JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });

      // 2. Persist to Firestore under users/{uid}/data/workoutSessions/sessions/{sessionId}
      if (uid && db) {
        const userId = uid;
        try {
          const sessionDocRef = doc(
            db,
            "users",
            userId,
            "data",
            "workoutSessions",
            "sessions",
            session.id,
          );
          await setDoc(sessionDocRef, session);
        } catch (e) {
          console.warn("[WORKOUT] Session history sync error:", e);
        }
      }

      setActiveSessionStartTime(null);
      return session;
    },
    [uid, state.activePlanId, activePlan.name, activeDay, currentExercises.length, todayProgress, activeSessionStartTime],
  );

  const completedCount = todayProgress.completed.length;
  const skippedCount = todayProgress.skipped.length;
  const totalCount = currentExercises.length;
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return {
    plans: WORKOUT_PLANS,
    activePlan,
    activeDay,
    currentExercises,
    todayProgress,
    completedCount,
    skippedCount,
    totalCount,
    completionPercentage,
    history,
    activeSessionStartTime,
    selectPlan,
    selectDay,
    markComplete,
    undoComplete,
    skipExercise,
    restartWorkout,
    startSession,
    finishWorkout,
  };
}
