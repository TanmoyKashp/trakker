import { useMemo, useState } from "react";
import {
  Check,
  CheckCircle2,
  Clock,
  Dumbbell,
  FastForward,
  History,
  Pause,
  Play,
  RotateCcw,
  Square,
  Timer as TimerIcon,
  Undo2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useWorkoutState } from "../hooks/useWorkoutState";
import { useWorkoutTimer } from "../hooks/useWorkoutTimer";
import { ORDERED_WEEKDAYS } from "../lib/workoutData";
import type { ExerciseItem, WorkoutSession } from "../types";

export function WorkoutPage() {
  const { user } = useAuth();
  const {
    plans,
    activePlan,
    activeDay,
    currentExercises,
    todayProgress,
    completedCount,
    skippedCount,
    totalCount,
    completionPercentage,
    history,
    selectPlan,
    selectDay,
    markComplete,
    undoComplete,
    skipExercise,
    restartWorkout,
    startSession: startSessionState,
    finishWorkout: finishWorkoutState,
  } = useWorkoutState(user?.uid);

  const timer = useWorkoutTimer();

  const [isSessionActive, setIsSessionActive] = useState(() => {
    return Boolean(timer.timerState?.workoutStartedAt);
  });
  const [sessionFinishedModal, setSessionFinishedModal] = useState<WorkoutSession | null>(null);

  // Find the next incomplete exercise
  const nextPendingIndex = useMemo(() => {
    const idx = currentExercises.findIndex(
      (ex) => !todayProgress.completed.includes(ex.id) && !todayProgress.skipped.includes(ex.id),
    );
    return idx >= 0 ? idx : -1;
  }, [currentExercises, todayProgress]);

  const activeExercise: ExerciseItem | null =
    nextPendingIndex >= 0 ? currentExercises[nextPendingIndex] : null;

  const nextUpcomingExercise: ExerciseItem | null =
    nextPendingIndex >= 0 && nextPendingIndex + 1 < currentExercises.length
      ? currentExercises[nextPendingIndex + 1]
      : null;

  function handleStartWorkout() {
    setIsSessionActive(true);
    startSessionState();
    timer.startSession();

    // If the first exercise has a duration, prime it
    if (activeExercise?.durationSeconds) {
      timer.startCountdown(activeExercise.durationSeconds, activeExercise.name, "exercise");
    }
  }

  function handleCompleteActive() {
    if (!activeExercise) return;
    markComplete(activeExercise.id);

    // Auto trigger rest timer if appropriate (60 seconds)
    if (!activeExercise.isRest) {
      timer.startRestTimer(60);
    } else {
      timer.stopTimer();
    }
  }

  function handleSkipActive() {
    if (!activeExercise) return;
    skipExercise(activeExercise.id);
    timer.stopTimer();
  }

  async function handleFinishWorkout() {
    const duration = timer.sessionElapsedSeconds || 60;
    const session = await finishWorkoutState(duration);
    timer.stopWorkoutSession();
    setIsSessionActive(false);
    setSessionFinishedModal(session);
  }

  function handleRestart() {
    if (window.confirm("Restart this day's workout progress?")) {
      restartWorkout();
      timer.stopWorkoutSession();
      setIsSessionActive(false);
    }
  }

  return (
    <section className="page-enter mx-auto max-w-4xl px-4 py-6 sm:px-6">
      {/* Header & Plan Selection */}
      <header className="mb-6 border-b border-stone-200/80 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--primary)]">
              <Dumbbell size={15} />
              <span>Training Program</span>
            </div>
            <h1 className="mt-1 font-serif text-2xl sm:text-3xl font-bold tracking-tight text-[#242424]">
              {activePlan.name}
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-stone-500 max-w-xl">
              {activePlan.description}
            </p>
          </div>

          {/* Plan Selector Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {plans.map((p) => {
              const isSelected = p.id === activePlan.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => selectPlan(p.id)}
                  className={`focus-ring rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    isSelected
                      ? "bg-[var(--primary)] text-white shadow-xs"
                      : "border border-stone-300/80 bg-[#FFFCF7] text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                  }`}
                >
                  {p.name.replace("Workout ", "")}
                </button>
              );
            })}
          </div>
        </div>

        {/* Weekday Switcher */}
        <div className="mt-5 flex items-center gap-2 overflow-x-auto pb-1">
          {ORDERED_WEEKDAYS.map((day) => {
            const isSelected = day === activeDay;
            const exercisesForDay = activePlan.days[day] || [];
            const hasExercises = exercisesForDay.length > 0;

            return (
              <button
                key={day}
                type="button"
                onClick={() => selectDay(day)}
                disabled={!hasExercises}
                className={`focus-ring flex min-h-10 items-center gap-2 rounded-lg border px-3.5 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                  isSelected
                    ? "border-[var(--primary)] bg-[var(--primary-tint)] text-[var(--primary)] ring-1 ring-[var(--primary)] font-semibold"
                    : hasExercises
                      ? "border-stone-300/70 bg-[#FFFCF7] text-stone-700 hover:bg-stone-100 hover:border-stone-400"
                      : "border-dashed border-stone-200 bg-transparent text-stone-400 cursor-not-allowed opacity-50"
                }`}
              >
                <span>{day}</span>
                {hasExercises && (
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                      isSelected
                        ? "bg-[var(--primary)] text-white"
                        : "bg-stone-200/80 text-stone-600"
                    }`}
                  >
                    {exercisesForDay.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* ACTIVE WORKOUT PANEL (Clean, prominent, mobile-first) */}
      {isSessionActive && (
        <div className="card-shadow mb-6 overflow-hidden rounded-2xl border-2 border-[var(--primary)] bg-[#FFFCF7] p-5 sm:p-6 transition-all">
          <div className="flex items-center justify-between border-b border-stone-200/70 pb-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--primary)] opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--primary)]" />
              </span>
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--primary)]">
                Active Workout Session · {activeDay}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono font-medium text-stone-500">
              <Clock size={13} />
              <span>Elapsed: {timer.formattedSessionElapsed}</span>
            </div>
          </div>

          {/* Current Exercise Spotlight */}
          {activeExercise ? (
            <div className="py-5">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                {/* Exercise Details */}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium uppercase tracking-wider text-stone-400">
                    Exercise {activeExercise.order} of {totalCount}
                  </div>
                  <h2 className="mt-1 text-2xl sm:text-3xl font-serif font-bold text-[#242424] leading-tight break-words">
                    {activeExercise.name}
                  </h2>
                  <div className="mt-2.5 inline-flex items-center gap-2 rounded-lg bg-[var(--primary-tint)] px-3.5 py-1.5 text-base sm:text-lg font-semibold text-[var(--primary)]">
                    <span>Target:</span>
                    <span>{activeExercise.target}</span>
                  </div>

                  {nextUpcomingExercise && (
                    <div className="mt-3.5 text-xs text-stone-500 flex items-center gap-1.5">
                      <span className="font-medium text-stone-400">Up next:</span>
                      <span className="truncate">{nextUpcomingExercise.name} ({nextUpcomingExercise.target})</span>
                    </div>
                  )}
                </div>

                {/* Integrated Countdown / Rest Timer */}
                <div className="flex flex-col items-center justify-center rounded-xl border border-stone-200 bg-[#F7F3ED]/60 p-4 min-w-[240px]">
                  <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-stone-500">
                    <TimerIcon size={14} className="text-[var(--primary)]" />
                    <span>{timer.label}</span>
                  </div>

                  <div className="my-2 font-mono text-4xl sm:text-5xl font-bold tracking-tight text-[var(--primary)]">
                    {timer.secondsLeft > 0 ? timer.formattedSecondsLeft : "00:00"}
                  </div>

                  {timer.isCountdownFinished && (
                    <div className="mb-2 text-xs font-semibold text-emerald-600 animate-bounce">
                      Time reached! Ready for next set
                    </div>
                  )}

                  {/* Timer Controls */}
                  <div className="flex items-center gap-2">
                    {timer.isCountdownActive ? (
                      <button
                        type="button"
                        onClick={timer.pauseTimer}
                        className="focus-ring inline-flex min-h-9 items-center gap-1 rounded-md border border-stone-300 bg-white px-3 text-xs font-medium text-stone-700 hover:bg-stone-50 cursor-pointer"
                        title="Pause timer"
                      >
                        <Pause size={13} /> Pause
                      </button>
                    ) : timer.isPaused ? (
                      <button
                        type="button"
                        onClick={timer.resumeTimer}
                        className="focus-ring inline-flex min-h-9 items-center gap-1 rounded-md bg-[var(--primary)] px-3 text-xs font-medium text-white hover:opacity-90 cursor-pointer"
                        title="Resume timer"
                      >
                        <Play size={13} className="fill-current" /> Resume
                      </button>
                    ) : activeExercise.durationSeconds ? (
                      <button
                        type="button"
                        onClick={() =>
                          timer.startCountdown(activeExercise.durationSeconds!, activeExercise.name, "exercise")
                        }
                        className="focus-ring inline-flex min-h-9 items-center gap-1 rounded-md bg-[var(--primary)] px-3 text-xs font-medium text-white hover:opacity-90 cursor-pointer"
                      >
                        <Play size={13} className="fill-current" /> Start Exercise Timer
                      </button>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => timer.startRestTimer(60)}
                      className="focus-ring inline-flex min-h-9 items-center gap-1 rounded-md border border-stone-300 bg-white px-2.5 text-xs font-medium text-stone-700 hover:bg-stone-50 cursor-pointer"
                      title="Start 60-second rest timer"
                    >
                      <RotateCcw size={13} /> 60s Rest
                    </button>

                    {timer.secondsLeft > 0 && (
                      <button
                        type="button"
                        onClick={() => timer.addSeconds(30)}
                        className="focus-ring inline-flex min-h-9 items-center rounded-md border border-stone-300 bg-white px-2 text-xs font-medium text-stone-700 hover:bg-stone-50 cursor-pointer"
                        title="Add 30 seconds"
                      >
                        +30s
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Primary Mobile-Friendly Action Buttons */}
              <div className="mt-6 flex flex-wrap items-center gap-3 pt-4 border-t border-stone-200/70">
                <button
                  type="button"
                  onClick={handleCompleteActive}
                  className="focus-ring inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-6 text-sm font-semibold text-white shadow-sm hover:bg-[var(--primary-hover)] transition-all cursor-pointer"
                >
                  <Check size={18} strokeWidth={2.5} />
                  <span>Complete Exercise</span>
                </button>

                <button
                  type="button"
                  onClick={handleSkipActive}
                  className="focus-ring inline-flex min-h-12 items-center justify-center gap-1.5 rounded-xl border border-stone-300 bg-white px-5 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors cursor-pointer"
                >
                  <FastForward size={16} />
                  <span>Skip</span>
                </button>

                <button
                  type="button"
                  onClick={handleFinishWorkout}
                  className="focus-ring inline-flex min-h-12 items-center justify-center gap-1.5 rounded-xl bg-stone-800 px-5 text-sm font-medium text-white hover:bg-stone-900 transition-colors cursor-pointer"
                >
                  <Square size={14} className="fill-current" />
                  <span>Finish Workout</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <CheckCircle2 size={28} />
              </div>
              <h2 className="mt-3 text-xl font-bold text-[#242424]">
                All exercises for {activeDay} completed!
              </h2>
              <p className="mt-1 text-xs text-stone-500">
                {completedCount} completed, {skippedCount} skipped · Outstanding work today.
              </p>
              <div className="mt-5 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={handleFinishWorkout}
                  className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-lg bg-[var(--primary)] px-6 text-sm font-semibold text-white hover:bg-[var(--primary-hover)] transition-colors cursor-pointer"
                >
                  <Square size={14} className="fill-current" /> Finish & Record Session
                </button>
                <button
                  type="button"
                  onClick={handleRestart}
                  className="focus-ring inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-4 text-xs font-medium text-stone-700 hover:bg-stone-50 cursor-pointer"
                >
                  <RotateCcw size={14} /> Restart Day
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TODAY'S OVERVIEW & PROGRESS SUMMARY */}
      <div className="card-shadow mb-6 rounded-xl border border-stone-300/80 bg-[#FFFCF7] p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-stone-400">
              {activePlan.name} · {activeDay}
            </div>
            <div className="mt-1 text-lg font-bold text-[#242424] flex items-center gap-3">
              <span>{currentExercises.length} Total Exercises</span>
              <span className="text-sm font-normal text-stone-500">
                ({completedCount} completed · {skippedCount} skipped)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {!isSessionActive ? (
              <button
                type="button"
                onClick={handleStartWorkout}
                className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-lg bg-[var(--primary)] px-6 text-sm font-semibold text-white shadow-xs hover:bg-[var(--primary-hover)] transition-all cursor-pointer"
              >
                <Play size={15} className="fill-current" />
                <span>START WORKOUT</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinishWorkout}
                className="focus-ring inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-stone-800 px-5 text-xs font-semibold text-white hover:bg-stone-900 transition-colors cursor-pointer"
              >
                <Square size={13} className="fill-current" />
                <span>Finish Workout</span>
              </button>
            )}

            {(completedCount > 0 || skippedCount > 0) && (
              <button
                type="button"
                onClick={handleRestart}
                className="focus-ring inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3.5 text-xs font-medium text-stone-600 hover:bg-stone-50 cursor-pointer"
                title="Restart today's routine"
              >
                <RotateCcw size={14} />
                <span className="hidden sm:inline">Restart</span>
              </button>
            )}
          </div>
        </div>

        {/* Quiet, Tasteful Progress Bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-stone-500 mb-1.5">
            <span>Progress: {completedCount} / {totalCount} completed</span>
            <span className="font-semibold text-stone-700">{completionPercentage}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-stone-200">
            <div
              className="h-full bg-[var(--primary)] transition-all duration-300 ease-out"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* EXERCISES LIST IN AUTHORITATIVE EXACT ORDER */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
            Exercises in Order ({activeDay})
          </h2>
          <span className="text-[11px] text-stone-400">
            Click checkmark to mark complete
          </span>
        </div>

        {currentExercises.map((exercise, idx) => {
          const isCompleted = todayProgress.completed.includes(exercise.id);
          const isSkipped = todayProgress.skipped.includes(exercise.id);
          const isNextUp = isSessionActive && nextPendingIndex === idx;

          return (
            <div
              key={exercise.id}
              className={`card-shadow flex items-center justify-between gap-3.5 rounded-xl border p-3.5 sm:p-4 transition-all ${
                isCompleted
                  ? "border-emerald-200/80 bg-emerald-50/40 text-emerald-950"
                  : isSkipped
                    ? "border-stone-200 bg-stone-100/60 opacity-60"
                    : isNextUp
                      ? "border-[var(--primary)] bg-[var(--primary-tint)]/20 ring-1 ring-[var(--primary)]"
                      : "border-stone-300/70 bg-[#FFFCF7]"
              }`}
            >
              {/* Order Number & Title */}
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                    isCompleted
                      ? "bg-emerald-600 text-white"
                      : isSkipped
                        ? "bg-stone-300 text-stone-600"
                        : isNextUp
                          ? "bg-[var(--primary)] text-white"
                          : "bg-stone-200/80 text-stone-700"
                  }`}
                >
                  {exercise.order}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-sm sm:text-base font-semibold ${
                        isCompleted ? "line-through text-stone-500" : "text-[#242424]"
                      }`}
                    >
                      {exercise.name}
                    </span>

                    {exercise.isRest && (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-800">
                        Rest Break
                      </span>
                    )}

                    {isNextUp && (
                      <span className="rounded bg-[var(--primary)] px-2 py-0.5 text-[10px] font-semibold uppercase text-white">
                        Next Up
                      </span>
                    )}
                  </div>

                  <div className="mt-0.5 text-xs font-medium text-stone-500 flex items-center gap-2">
                    <span className="text-[var(--primary)] font-semibold">{exercise.target}</span>
                    {exercise.durationSeconds && (
                      <span className="text-stone-400">
                        · {Math.round(exercise.durationSeconds / 60)} min timer
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 shrink-0">
                {exercise.durationSeconds && !isCompleted && (
                  <button
                    type="button"
                    onClick={() =>
                      timer.startCountdown(exercise.durationSeconds!, exercise.name, "exercise")
                    }
                    className="focus-ring hidden sm:inline-flex min-h-9 items-center gap-1 rounded-md border border-stone-300 bg-white px-2.5 text-xs text-stone-600 hover:bg-stone-50 cursor-pointer"
                    title={`Start ${Math.round(exercise.durationSeconds / 60)}m timer`}
                  >
                    <TimerIcon size={13} />
                    <span>Timer</span>
                  </button>
                )}

                {isCompleted ? (
                  <button
                    type="button"
                    onClick={() => undoComplete(exercise.id)}
                    className="focus-ring inline-flex min-h-9 items-center gap-1 rounded-md border border-emerald-300 bg-emerald-100/80 px-2.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-200 transition-colors cursor-pointer"
                    title="Undo completion"
                  >
                    <Check size={14} strokeWidth={3} />
                    <span>Done</span>
                    <Undo2 size={12} className="ml-0.5 opacity-60" />
                  </button>
                ) : isSkipped ? (
                  <button
                    type="button"
                    onClick={() => undoComplete(exercise.id)}
                    className="focus-ring inline-flex min-h-9 items-center gap-1 rounded-md border border-stone-300 bg-stone-200 px-2.5 text-xs font-medium text-stone-600 hover:bg-stone-300 cursor-pointer"
                    title="Undo skip"
                  >
                    <span>Skipped</span>
                    <Undo2 size={12} className="opacity-60" />
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => markComplete(exercise.id)}
                      className="focus-ring flex min-h-10 min-w-10 items-center justify-center rounded-lg border border-stone-300 bg-white text-stone-600 hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-700 transition-colors cursor-pointer"
                      title="Mark as completed"
                      aria-label={`Mark ${exercise.name} completed`}
                    >
                      <Check size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => skipExercise(exercise.id)}
                      className="focus-ring flex min-h-10 min-w-10 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors cursor-pointer"
                      title="Skip this exercise"
                      aria-label={`Skip ${exercise.name}`}
                    >
                      <FastForward size={14} />
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}

        {currentExercises.length === 0 && (
          <div className="rounded-xl border border-dashed border-stone-300/80 bg-[#FFFCF7] p-8 text-center text-stone-500">
            No exercises scheduled for {activeDay} in this plan.
          </div>
        )}
      </div>

      {/* LIGHTWEIGHT WORKOUT HISTORY SECTION */}
      <section className="mt-12 border-t border-stone-200/80 pt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <History size={16} className="text-stone-500" />
            <h2 className="font-serif text-lg font-semibold text-[#242424]">
              Recent Workout Sessions
            </h2>
          </div>
          <span className="text-xs text-stone-400">
            {history.length} logged
          </span>
        </div>

        {history.length > 0 ? (
          <div className="space-y-2">
            {history.slice(0, 10).map((sess) => {
              const mins = Math.max(1, Math.round(sess.durationSeconds / 60));
              const pct = sess.totalExercises > 0 ? Math.round((sess.completedCount / sess.totalExercises) * 100) : 100;

              return (
                <div
                  key={sess.id}
                  className="card-shadow flex items-center justify-between gap-3 rounded-lg border border-stone-300/70 bg-[#FFFCF7] px-4 py-3 text-xs text-stone-700"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-stone-800 flex items-center gap-2">
                      <span>{sess.planName} · {sess.day}</span>
                      <span className="text-[10px] text-stone-400 font-normal">{sess.date}</span>
                    </div>
                    <div className="mt-0.5 text-stone-500">
                      {sess.completedCount} of {sess.totalExercises} exercises completed ({pct}%)
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 font-mono text-stone-600">
                    <span className="rounded bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-700">
                      {mins} min
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-stone-300/70 bg-[#FFFCF7] p-6 text-center text-xs text-stone-500">
            No completed sessions recorded yet. Start a workout session to build your history.
          </div>
        )}
      </section>

      {/* SESSION FINISHED CELEBRATION MODAL */}
      {sessionFinishedModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setSessionFinishedModal(null)}
          />

          <div className="card-shadow relative w-full max-w-sm rounded-2xl border border-stone-300/80 bg-[#FFFCF7] p-6 text-center shadow-2xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--primary-tint)] text-[var(--primary)] mb-3">
              <CheckCircle2 size={32} />
            </div>

            <h3 className="font-serif text-xl font-bold text-[#242424]">
              Session Completed!
            </h3>
            <p className="mt-1 text-xs text-stone-500">
              {sessionFinishedModal.planName} · {sessionFinishedModal.day}
            </p>

            <div className="my-5 grid grid-cols-2 gap-2 rounded-xl bg-[#F7F3ED]/80 p-3 text-left">
              <div>
                <span className="block text-[10px] font-semibold uppercase text-stone-400">Duration</span>
                <span className="font-mono text-sm font-bold text-stone-800">
                  {Math.round(sessionFinishedModal.durationSeconds / 60)} min
                </span>
              </div>
              <div>
                <span className="block text-[10px] font-semibold uppercase text-stone-400">Completed</span>
                <span className="font-mono text-sm font-bold text-stone-800">
                  {sessionFinishedModal.completedCount} / {sessionFinishedModal.totalExercises}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSessionFinishedModal(null)}
              className="focus-ring w-full rounded-xl bg-[var(--primary)] py-2.5 text-sm font-semibold text-white hover:bg-[var(--primary-hover)] transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
