import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { useTrakkerData } from "./hooks/useTrakkerData";
import { ApplicationDetailPage } from "./pages/ApplicationDetailPage";
import { ApplicationsPage } from "./pages/ApplicationsPage";
import { HomePage } from "./pages/HomePage";
import { StatusPage } from "./pages/StatusPage";
import { TreePage } from "./pages/TreePage";

export default function App() {
  const data = useTrakkerData();
  return (
    <Routes>
      <Route element={<AppShell offline={data.offline} error={data.loadError} />}>
        <Route index element={<HomePage applications={data.applications} tree={data.tree} />} />
        <Route path="/applications" element={<ApplicationsPage {...data} />} />
        <Route path="/applications/:id" element={<ApplicationDetailPage {...data} />} />
        <Route path="/tree" element={<TreePage {...data} />} />
        <Route path="/status" element={<StatusPage {...data} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
