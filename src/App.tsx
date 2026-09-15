import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { useTrakkerData } from "./hooks/useTrakkerData";
import { useTrakkerOs } from "./hooks/useTrakkerOs";
import { startFirestoreSync } from "./lib/firestoreSync";
import { ApplicationDetailPage } from "./pages/ApplicationDetailPage";
import { ApplicationsPage } from "./pages/ApplicationsPage";
import { DailyPage } from "./pages/DailyPage";
import { GoalsPage } from "./pages/GoalsPage";
import { HomePage } from "./pages/HomePage";
import { LandingPage } from "./pages/LandingPage";
import { MeetingsPage } from "./pages/MeetingsPage";
import { OnboardingPage } from "./pages/OnboardingPage";
import { StatusPage } from "./pages/StatusPage";
import { TasksPage } from "./pages/TasksPage";
import { TimetablePage } from "./pages/TimetablePage";
import { TodayPage } from "./pages/TodayPage";
import { TreePage } from "./pages/TreePage";
import { WorkoutPage } from "./pages/WorkoutPage";

function AppContent() {
  const { user, loading, showOnboarding, isOfflineMode } = useAuth();
  const data = useTrakkerData(user?.uid);
  const os = useTrakkerOs(user?.uid);

  // Background Firestore sync for authenticated user
  useEffect(() => {
    if (user?.uid) {
      const syncPromise = startFirestoreSync(user.uid);
      return () => {
        void syncPromise.then((cleanup) => cleanup());
      };
    }
  }, [user?.uid]);

  // Loading screen with minimal branded pulse
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F3ED]">
        <div className="font-serif text-xl font-semibold tracking-[0.18em] text-[#242424] animate-pulse">
          TRAKKER
        </div>
      </div>
    );
  }

  // Unauthenticated users see public landing page with "Continue with Google"
  if (!user && !isOfflineMode) {
    return <LandingPage />;
  }

  // First-ever login: show onboarding tutorial screen once
  if (user && showOnboarding) {
    return <OnboardingPage />;
  }

  // Authenticated or offline mode user: standard operating system
  return (
    <Routes>
      <Route
        element={
          <AppShell
            offline={data.offline}
            error={data.loadError}
            mode={os.os.mode}
            onModeChange={os.setMode}
            initialTheme={os.os.theme}
            onThemePersist={os.setTheme}
          />
        }
      >
        <Route
          index
          element={
            <HomePage applications={data.applications} tree={data.tree} os={os.os} mode={os.os.mode} />
          }
        />
        <Route
          path="/today"
          element={
            <TodayPage osState={os.os} os={os} />
          }
        />
        <Route path="/timetable" element={<TimetablePage />} />
        <Route path="/tasks" element={<TasksPage osState={os.os} os={os} mode={os.os.mode} />} />
        <Route path="/meetings" element={<MeetingsPage osState={os.os} os={os} />} />
        <Route path="/daily" element={<DailyPage osState={os.os} os={os} />} />
        <Route path="/goals" element={<GoalsPage osState={os.os} os={os} />} />
        <Route path="/workout" element={<WorkoutPage osState={os.os} os={os} />} />
        <Route path="/applications" element={<ApplicationsPage {...data} />} />
        <Route path="/applications/:id" element={<ApplicationDetailPage {...data} />} />
        <Route path="/tree" element={<TreePage {...data} />} />
        <Route path="/status" element={<StatusPage {...data} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

