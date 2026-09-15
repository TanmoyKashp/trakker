import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { useTrakkerData } from "./hooks/useTrakkerData";
import { useTrakkerOs } from "./hooks/useTrakkerOs";
import { ApplicationDetailPage } from "./pages/ApplicationDetailPage";
import { ApplicationsPage } from "./pages/ApplicationsPage";
import { DailyPage } from "./pages/DailyPage";
import { GoalsPage } from "./pages/GoalsPage";
import { HomePage } from "./pages/HomePage";
import { MeetingsPage } from "./pages/MeetingsPage";
import { StatusPage } from "./pages/StatusPage";
import { TasksPage } from "./pages/TasksPage";
import { TimetablePage } from "./pages/TimetablePage";
import { TodayPage } from "./pages/TodayPage";
import { TreePage } from "./pages/TreePage";
import { WorkoutPage } from "./pages/WorkoutPage";

export default function App() {
  const data = useTrakkerData();
  const os = useTrakkerOs();
  return (
    <Routes>
      <Route
        element={
          <AppShell offline={data.offline} error={data.loadError} mode={os.os.mode} onModeChange={os.setMode} />
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
            <TodayPage applications={data.applications} tree={data.tree} osState={os.os} os={os} />
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
