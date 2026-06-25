import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router";
import { TenantProvider } from "@/react-app/contexts/TenantContext";
import Quiz from "@/react-app/pages/Quiz";
import Admin from "@/react-app/pages/Admin";
import SuperAdmin from "@/react-app/pages/SuperAdmin";
import AuthCallback from "@/react-app/pages/AuthCallback";

export default function App() {
  return (
    <TenantProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Quiz />} />
          <Route path="/quiz" element={<Navigate to="/" replace />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/super-admin" element={<SuperAdmin />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
        </Routes>
      </Router>
    </TenantProvider>
  );
}
