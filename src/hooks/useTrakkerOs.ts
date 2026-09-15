import { useCallback, useEffect, useMemo, useState } from "react";
import type { Goal, Meeting, Mode, Routine, Task, TrakkerOsState, WorkoutItem, WorkoutSettings } from "../types";

const STORAGE_KEY = "trakker:os:v2";

const defaultWorkouts: WorkoutItem[] = [
  { id: "default-workout", title: "Daily Workout", startTime: "17:00", durationMinutes: 45, enabled: true },
];

const defaultState: TrakkerOsState = {
  version: 2,
  mode: "work",
  tasks: [],
  meetings: [],
  routines: [],
  routineCompletions: {},
  workout: { enabled: true, startTime: "17:00" },
  workouts: defaultWorkouts,
  goals: [],
};

/** Forward-compatible migration: fills missing fields, never drops existing user data. */
function migrate(raw: unknown): TrakkerOsState {
  if (!raw || typeof raw !== "object") return { ...defaultState };
  const stored = raw as Partial<TrakkerOsState>;

  const workouts: WorkoutItem[] = Array.isArray(stored.workouts) && stored.workouts.length > 0
    ? stored.workouts.map((w) => ({
        id: w.id || crypto.randomUUID(),
        title: w.title || "Daily Workout",
        startTime: w.startTime || "17:00",
        durationMinutes: typeof w.durationMinutes === "number" ? w.durationMinutes : 45,
        enabled: typeof w.enabled === "boolean" ? w.enabled : true,
        createdAt: w.createdAt,
        updatedAt: w.updatedAt,
        deletedAt: w.deletedAt ?? null,
      }))
    : [
        {
          id: "default-workout",
          title: "Daily Workout",
          startTime: stored.workout?.startTime ?? "17:00",
          durationMinutes: 45,
          enabled: stored.workout?.enabled ?? true,
        },
      ];

  const primaryWorkout = workouts.find((w) => w.enabled && !w.deletedAt) ?? workouts.find((w) => !w.deletedAt) ?? workouts[0];
  const workoutSetting: WorkoutSettings = {
    enabled: primaryWorkout ? primaryWorkout.enabled : (stored.workout?.enabled ?? true),
    startTime: primaryWorkout ? primaryWorkout.startTime : (stored.workout?.startTime ?? "17:00"),
    updatedAt: stored.workout?.updatedAt,
  };

  return {
    version: 2,
    mode: stored.mode === "personal" ? "personal" : "work",
    tasks: Array.isArray(stored.tasks) ? stored.tasks : [],
    meetings: Array.isArray(stored.meetings) ? stored.meetings : [],
    routines: Array.isArray(stored.routines) ? stored.routines : [],
    routineCompletions: stored.routineCompletions && typeof stored.routineCompletions === "object" ? stored.routineCompletions : {},
    workout: workoutSetting,
    workouts,
    goals: Array.isArray(stored.goals) ? stored.goals : [],
    theme: typeof stored.theme === "string" ? stored.theme : undefined,
    updatedAt: stored.updatedAt,
  };
}

function readInitialState(): TrakkerOsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return migrate(raw ? JSON.parse(raw) : null);
  } catch {
    return { ...defaultState };
  }
}

function newId() {
  return crypto.randomUUID();
}

/** Today as YYYY-MM-DD in local time. */
export function todayISO(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Day-of-week with the same 0=Monday..6=Sunday indexing used by routines. */
export function routineDayIndex(now: Date = new Date()): number {
  return (now.getDay() + 6) % 7;
}

import { syncOsToFirestore } from "../lib/firestoreSync";

export type { TrakkerOsState };

export function useTrakkerOs(userId?: string | null) {
  const [state, setState] = useState<TrakkerOsState>(readInitialState);

  // Listen for remote Firestore sync updates
  useEffect(() => {
    function handleRemoteSync(event: Event) {
      const customEvent = event as CustomEvent<TrakkerOsState>;
      if (customEvent.detail) {
        setState(customEvent.detail);
      }
    }
    window.addEventListener("trakker:sync:os", handleRemoteSync);
    return () => window.removeEventListener("trakker:sync:os", handleRemoteSync);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // storage unavailable (private mode); state stays in memory
    }
    if (userId) {
      syncOsToFirestore(userId, state);
    }
  }, [state, userId]);

  const setMode = useCallback((mode: Mode) => {
    const nowIso = new Date().toISOString();
    setState((s) => ({ ...s, mode, updatedAt: nowIso }));
  }, []);

  const addTask = useCallback((input: Pick<Task, "title" | "mode"> & Partial<Task>) => {
    const nowIso = new Date().toISOString();
    const task: Task = {
      id: newId(),
      title: input.title,
      mode: input.mode,
      createdAt: nowIso,
      updatedAt: nowIso,
      deletedAt: null,
      dueDate: input.dueDate ?? null,
      dueTime: input.dueTime ?? null,
      priority: input.priority ?? "medium",
      completed: false,
      notes: input.notes ?? null,
    };
    setState((s) => ({ ...s, updatedAt: nowIso, tasks: [...s.tasks, task] }));
    return task;
  }, []);

  const updateTask = useCallback((id: string, patch: Partial<Task>) => {
    const nowIso = new Date().toISOString();
    setState((s) => ({
      ...s,
      updatedAt: nowIso,
      tasks: s.tasks.map((task) => (task.id === id ? { ...task, ...patch, updatedAt: nowIso } : task)),
    }));
  }, []);

  const toggleTask = useCallback((id: string) => {
    const nowIso = new Date().toISOString();
    setState((s) => ({
      ...s,
      updatedAt: nowIso,
      tasks: s.tasks.map((task) => (task.id === id ? { ...task, completed: !task.completed, updatedAt: nowIso } : task)),
    }));
  }, []);

  const deleteTask = useCallback((id: string) => {
    const nowIso = new Date().toISOString();
    setState((s) => ({
      ...s,
      updatedAt: nowIso,
      tasks: s.tasks.map((task) => (task.id === id ? { ...task, deletedAt: nowIso, updatedAt: nowIso } : task)),
    }));
  }, []);

  const addMeeting = useCallback((input: Pick<Meeting, "title" | "date" | "startTime" | "endTime" | "mode"> & Partial<Meeting>) => {
    const nowIso = new Date().toISOString();
    const meeting: Meeting = {
      id: newId(),
      title: input.title,
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
      location: input.location ?? null,
      notes: input.notes ?? null,
      mode: input.mode,
      createdAt: nowIso,
      updatedAt: nowIso,
      deletedAt: null,
    };
    setState((s) => ({ ...s, updatedAt: nowIso, meetings: [...s.meetings, meeting] }));
    return meeting;
  }, []);

  const updateMeeting = useCallback((id: string, patch: Partial<Meeting>) => {
    const nowIso = new Date().toISOString();
    setState((s) => ({
      ...s,
      updatedAt: nowIso,
      meetings: s.meetings.map((meeting) => (meeting.id === id ? { ...meeting, ...patch, updatedAt: nowIso } : meeting)),
    }));
  }, []);

  const deleteMeeting = useCallback((id: string) => {
    const nowIso = new Date().toISOString();
    setState((s) => ({
      ...s,
      updatedAt: nowIso,
      meetings: s.meetings.map((meeting) => (meeting.id === id ? { ...meeting, deletedAt: nowIso, updatedAt: nowIso } : meeting)),
    }));
  }, []);

  const addRoutine = useCallback((input: Pick<Routine, "title" | "mode" | "daysOfWeek" | "startTime"> & Partial<Routine>) => {
    const nowIso = new Date().toISOString();
    const routine: Routine = {
      id: newId(),
      title: input.title,
      mode: input.mode,
      daysOfWeek: input.daysOfWeek,
      startTime: input.startTime,
      enabled: input.enabled ?? true,
      createdAt: nowIso,
      updatedAt: nowIso,
      deletedAt: null,
    };
    setState((s) => ({ ...s, updatedAt: nowIso, routines: [...s.routines, routine] }));
    return routine;
  }, []);

  const updateRoutine = useCallback((id: string, patch: Partial<Routine>) => {
    const nowIso = new Date().toISOString();
    setState((s) => ({
      ...s,
      updatedAt: nowIso,
      routines: s.routines.map((routine) => (routine.id === id ? { ...routine, ...patch, updatedAt: nowIso } : routine)),
    }));
  }, []);

  const deleteRoutine = useCallback((id: string) => {
    const nowIso = new Date().toISOString();
    setState((s) => ({
      ...s,
      updatedAt: nowIso,
      routines: s.routines.map((routine) => (routine.id === id ? { ...routine, deletedAt: nowIso, updatedAt: nowIso } : routine)),
    }));
  }, []);

  /** key is `${routineId}:${YYYY-MM-DD}` */
  const toggleRoutineDone = useCallback((routineId: string, day: string) => {
    const key = `${routineId}:${day}`;
    const nowIso = new Date().toISOString();
    setState((s) => {
      const next = { ...s.routineCompletions };
      if (next[key]) delete next[key];
      else next[key] = nowIso;
      return { ...s, updatedAt: nowIso, routineCompletions: next };
    });
  }, []);

  const addWorkout = useCallback(
    (input: { title: string; startTime: string; durationMinutes?: number; enabled?: boolean }) => {
      const nowIso = new Date().toISOString();
      const workout: WorkoutItem = {
        id: newId(),
        title: input.title.trim() || "Workout",
        startTime: input.startTime,
        durationMinutes: input.durationMinutes ?? 45,
        enabled: input.enabled ?? true,
        createdAt: nowIso,
        updatedAt: nowIso,
        deletedAt: null,
      };
      setState((s) => {
        const nextWorkouts = [...s.workouts, workout];
        const active = nextWorkouts.find((w) => w.enabled && !w.deletedAt) ?? nextWorkouts.find((w) => !w.deletedAt) ?? nextWorkouts[0];
        return {
          ...s,
          updatedAt: nowIso,
          workouts: nextWorkouts,
          workout: active ? { enabled: active.enabled, startTime: active.startTime, updatedAt: nowIso } : s.workout,
        };
      });
      return workout;
    },
    [],
  );

  const updateWorkout = useCallback((id: string, patch: Partial<WorkoutItem>) => {
    const nowIso = new Date().toISOString();
    setState((s) => {
      const nextWorkouts = s.workouts.map((w) => (w.id === id ? { ...w, ...patch, updatedAt: nowIso } : w));
      const active = nextWorkouts.find((w) => w.enabled && !w.deletedAt) ?? nextWorkouts.find((w) => !w.deletedAt) ?? nextWorkouts[0];
      return {
        ...s,
        updatedAt: nowIso,
        workouts: nextWorkouts,
        workout: active ? { enabled: active.enabled, startTime: active.startTime, updatedAt: nowIso } : s.workout,
      };
    });
  }, []);

  const deleteWorkout = useCallback((id: string) => {
    const nowIso = new Date().toISOString();
    setState((s) => {
      const nextWorkouts = s.workouts.map((w) => (w.id === id ? { ...w, deletedAt: nowIso, updatedAt: nowIso } : w));
      const active = nextWorkouts.find((w) => w.enabled && !w.deletedAt) ?? nextWorkouts.find((w) => !w.deletedAt);
      return {
        ...s,
        updatedAt: nowIso,
        workouts: nextWorkouts,
        workout: active ? { enabled: active.enabled, startTime: active.startTime, updatedAt: nowIso } : { enabled: false, startTime: "17:00", updatedAt: nowIso },
      };
    });
  }, []);

  const setWorkout = useCallback((patch: Partial<WorkoutSettings>) => {
    const nowIso = new Date().toISOString();
    setState((s) => {
      const nextWorkout = { ...s.workout, ...patch, updatedAt: nowIso };
      const nextWorkouts = s.workouts.map((w, idx) => (idx === 0 ? { ...w, ...patch, updatedAt: nowIso } : w));
      return {
        ...s,
        updatedAt: nowIso,
        workout: nextWorkout,
        workouts: nextWorkouts.length
          ? nextWorkouts
          : [{ id: "default-workout", title: "Daily Workout", startTime: nextWorkout.startTime, durationMinutes: 45, enabled: nextWorkout.enabled, createdAt: nowIso, updatedAt: nowIso, deletedAt: null }],
      };
    });
  }, []);

  const addGoal = useCallback((title: string, horizon: Goal["horizon"]) => {
    const nowIso = new Date().toISOString();
    const goal: Goal = { id: newId(), title, horizon, createdAt: nowIso, updatedAt: nowIso, deletedAt: null, done: false };
    setState((s) => ({ ...s, updatedAt: nowIso, goals: [...s.goals, goal] }));
    return goal;
  }, []);

  const updateGoal = useCallback((id: string, patch: Partial<Goal>) => {
    const nowIso = new Date().toISOString();
    setState((s) => ({ ...s, updatedAt: nowIso, goals: s.goals.map((goal) => (goal.id === id ? { ...goal, ...patch, updatedAt: nowIso } : goal)) }));
  }, []);

  const toggleGoal = useCallback((id: string) => {
    const nowIso = new Date().toISOString();
    setState((s) => ({
      ...s,
      updatedAt: nowIso,
      goals: s.goals.map((goal) => (goal.id === id ? { ...goal, done: !goal.done, updatedAt: nowIso } : goal)),
    }));
  }, []);

  const deleteGoal = useCallback((id: string) => {
    const nowIso = new Date().toISOString();
    setState((s) => ({
      ...s,
      updatedAt: nowIso,
      goals: s.goals.map((goal) => (goal.id === id ? { ...goal, deletedAt: nowIso, updatedAt: nowIso } : goal)),
    }));
  }, []);

  // Filter out soft-deleted items for UI rendering
  const visibleState = useMemo<TrakkerOsState>(() => {
    return {
      ...state,
      tasks: state.tasks.filter((t) => !t.deletedAt),
      meetings: state.meetings.filter((m) => !m.deletedAt),
      routines: state.routines.filter((r) => !r.deletedAt),
      workouts: state.workouts.filter((w) => !w.deletedAt),
      goals: state.goals.filter((g) => !g.deletedAt),
    };
  }, [state]);

  return {
    os: visibleState,
    rawOs: state,
    setMode,
    addTask,
    updateTask,
    toggleTask,
    deleteTask,
    addMeeting,
    updateMeeting,
    deleteMeeting,
    addRoutine,
    updateRoutine,
    deleteRoutine,
    toggleRoutineDone,
    setWorkout,
    addWorkout,
    updateWorkout,
    deleteWorkout,
    addGoal,
    updateGoal,
    toggleGoal,
    deleteGoal,
    setTheme: useCallback((theme: string) => {
      const nowIso = new Date().toISOString();
      setState((s) => ({ ...s, theme, updatedAt: nowIso }));
    }, []),
  };
}

export type TrakkerOs = ReturnType<typeof useTrakkerOs>;
