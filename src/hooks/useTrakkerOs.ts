import { useCallback, useEffect, useState } from "react";
import type { Goal, Meeting, Mode, Routine, Task, TrakkerOsState, WorkoutSettings } from "../types";

const STORAGE_KEY = "trakker:os:v2";

const defaultState: TrakkerOsState = {
  version: 2,
  mode: "work",
  tasks: [],
  meetings: [],
  routines: [],
  routineCompletions: {},
  workout: { enabled: true, startTime: "17:00" },
  goals: [],
};

/** Forward-compatible migration: fills missing fields, never drops existing user data. */
function migrate(raw: unknown): TrakkerOsState {
  if (!raw || typeof raw !== "object") return { ...defaultState };
  const stored = raw as Partial<TrakkerOsState>;
  return {
    version: 2,
    mode: stored.mode === "personal" ? "personal" : "work",
    tasks: Array.isArray(stored.tasks) ? stored.tasks : [],
    meetings: Array.isArray(stored.meetings) ? stored.meetings : [],
    routines: Array.isArray(stored.routines) ? stored.routines : [],
    routineCompletions: stored.routineCompletions && typeof stored.routineCompletions === "object" ? stored.routineCompletions : {},
    workout: {
      enabled: stored.workout?.enabled ?? true,
      startTime: stored.workout?.startTime ?? "17:00",
    },
    goals: Array.isArray(stored.goals) ? stored.goals : [],
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

export type { TrakkerOsState };

export function useTrakkerOs() {
  const [state, setState] = useState<TrakkerOsState>(readInitialState);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // storage unavailable (private mode); state stays in memory
    }
  }, [state]);

  const setMode = useCallback((mode: Mode) => setState((s) => ({ ...s, mode })), []);

  const addTask = useCallback((input: Pick<Task, "title" | "mode"> & Partial<Task>) => {
    const task: Task = {
      id: newId(),
      title: input.title,
      mode: input.mode,
      createdAt: new Date().toISOString(),
      dueDate: input.dueDate ?? null,
      dueTime: input.dueTime ?? null,
      priority: input.priority ?? "medium",
      completed: false,
      notes: input.notes ?? null,
    };
    setState((s) => ({ ...s, tasks: [...s.tasks, task] }));
    return task;
  }, []);

  const updateTask = useCallback((id: string, patch: Partial<Task>) => {
    setState((s) => ({ ...s, tasks: s.tasks.map((task) => (task.id === id ? { ...task, ...patch } : task)) }));
  }, []);

  const deleteTask = useCallback((id: string) => {
    setState((s) => ({ ...s, tasks: s.tasks.filter((task) => task.id !== id) }));
  }, []);

  const addMeeting = useCallback((input: Pick<Meeting, "title" | "date" | "startTime" | "endTime" | "mode"> & Partial<Meeting>) => {
    const meeting: Meeting = {
      id: newId(),
      title: input.title,
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
      location: input.location ?? null,
      notes: input.notes ?? null,
      mode: input.mode,
    };
    setState((s) => ({ ...s, meetings: [...s.meetings, meeting] }));
    return meeting;
  }, []);

  const updateMeeting = useCallback((id: string, patch: Partial<Meeting>) => {
    setState((s) => ({ ...s, meetings: s.meetings.map((meeting) => (meeting.id === id ? { ...meeting, ...patch } : meeting)) }));
  }, []);

  const deleteMeeting = useCallback((id: string) => {
    setState((s) => ({ ...s, meetings: s.meetings.filter((meeting) => meeting.id !== id) }));
  }, []);

  const addRoutine = useCallback((input: Pick<Routine, "title" | "mode" | "daysOfWeek" | "startTime"> & Partial<Routine>) => {
    const routine: Routine = {
      id: newId(),
      title: input.title,
      mode: input.mode,
      daysOfWeek: input.daysOfWeek,
      startTime: input.startTime,
      enabled: input.enabled ?? true,
    };
    setState((s) => ({ ...s, routines: [...s.routines, routine] }));
    return routine;
  }, []);

  const updateRoutine = useCallback((id: string, patch: Partial<Routine>) => {
    setState((s) => ({ ...s, routines: s.routines.map((routine) => (routine.id === id ? { ...routine, ...patch } : routine)) }));
  }, []);

  const deleteRoutine = useCallback((id: string) => {
    setState((s) => ({ ...s, routines: s.routines.filter((routine) => routine.id !== id) }));
  }, []);

  /** key is `${routineId}:${YYYY-MM-DD}` */
  const toggleRoutineDone = useCallback((routineId: string, day: string) => {
    const key = `${routineId}:${day}`;
    setState((s) => {
      const next = { ...s.routineCompletions };
      if (next[key]) delete next[key];
      else next[key] = new Date().toISOString();
      return { ...s, routineCompletions: next };
    });
  }, []);

  const setWorkout = useCallback((patch: Partial<WorkoutSettings>) => {
    setState((s) => ({ ...s, workout: { ...s.workout, ...patch } }));
  }, []);

  const addGoal = useCallback((title: string, horizon: Goal["horizon"]) => {
    const goal: Goal = { id: newId(), title, horizon, createdAt: new Date().toISOString(), done: false };
    setState((s) => ({ ...s, goals: [...s.goals, goal] }));
    return goal;
  }, []);

  const updateGoal = useCallback((id: string, patch: Partial<Goal>) => {
    setState((s) => ({ ...s, goals: s.goals.map((goal) => (goal.id === id ? { ...goal, ...patch } : goal)) }));
  }, []);

  const deleteGoal = useCallback((id: string) => {
    setState((s) => ({ ...s, goals: s.goals.filter((goal) => goal.id !== id) }));
  }, []);

  return {
    os: state,
    setMode,
    addTask,
    updateTask,
    deleteTask,
    addMeeting,
    updateMeeting,
    deleteMeeting,
    addRoutine,
    updateRoutine,
    deleteRoutine,
    toggleRoutineDone,
    setWorkout,
    addGoal,
    updateGoal,
    deleteGoal,
  };
}

export type TrakkerOs = ReturnType<typeof useTrakkerOs>;
