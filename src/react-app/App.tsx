import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from "react-router";
import { TenantProvider } from "@/react-app/contexts/TenantContext";
import Quiz from "@/react-app/pages/Quiz";
import Admin from "@/react-app/pages/Admin";
import SuperAdmin from "@/react-app/pages/SuperAdmin";
import AuthCallback from "@/react-app/pages/AuthCallback";

function AdminWithTenant() {
  const slug = new URLSearchParams(window.location.search).get('tenant') ?? undefined;
  return <TenantProvider slug={slug}><Admin /></TenantProvider>;
}

function QuizWithTenant({ slug }: { slug?: string }) {
  return (
    <TenantProvider slug={slug}>
      <Quiz />
    </TenantProvider>
  );
}

function PartnerQuiz() {
  const { slug } = useParams<{ slug: string }>();
  return <QuizWithTenant slug={slug} />;
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<QuizWithTenant />} />
        <Route path="/quiz" element={<Navigate to="/" replace />} />
        <Route path="/p/:slug" element={<PartnerQuiz />} />
        <Route path="/admin" element={<AdminWithTenant />} />
        <Route path="/super-admin" element={<TenantProvider><SuperAdmin /></TenantProvider>} />
        <Route path="/auth/callback" element={<AuthCallback />} />
      </Routes>
    </Router>
  );
}
