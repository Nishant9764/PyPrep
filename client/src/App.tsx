import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './auth';
import { DEFAULT_TRACK, Shell } from './components/Shell';
import { Loading } from './components/ui';
import { Login, Signup } from './pages/Auth';
import { Dashboard } from './pages/Dashboard';
import { Learn } from './pages/Learn';
import { PracticeList } from './pages/PracticeList';
import { SavedPage } from './pages/Saved';
import { lazy, ReactNode, Suspense } from 'react';

// Heavy pages (code editor, markdown renderer) load on demand.
const Admin = lazy(() => import('./pages/Admin').then((m) => ({ default: m.Admin })));
const Lesson = lazy(() => import('./pages/Lesson').then((m) => ({ default: m.Lesson })));
const Problem = lazy(() => import('./pages/Problem').then((m) => ({ default: m.Problem })));
const Reference = lazy(() => import('./pages/Reference').then((m) => ({ default: m.Reference })));
const InterviewGlance = lazy(() => import('./pages/InterviewGlance').then((m) => ({ default: m.InterviewGlance })));
const TraceBench = lazy(() => import('./pages/TraceBench').then((m) => ({ default: m.TraceBench })));
const InterviewGuide = lazy(() => import('./pages/InterviewGuide').then((m) => ({ default: m.InterviewGuide })));

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <div className="page"><Loading /></div>;
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname + loc.search }} />;
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (user?.role !== 'admin') return <Navigate to="/" replace />;
  return <>{children}</>;
}

function NotFound() {
  return (
    <div className="page narrow">
      <h1>Page not found</h1>
      <p>That address does not exist. <Link to="/">Go to your dashboard</Link>.</p>
    </div>
  );
}

export function App() {
  return (
    <Suspense fallback={<div className="page"><Loading /></div>}>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route element={<RequireAuth><Shell /></RequireAuth>}>
        <Route path="/" element={<Navigate to={`/t/${DEFAULT_TRACK}`} replace />} />
        <Route path="/t/:track" element={<Dashboard />} />
        <Route path="/t/:track/learn" element={<Learn />} />
        <Route path="/t/:track/learn/:topic/:lesson" element={<Lesson />} />
        <Route path="/t/:track/reference/:topic" element={<Reference />} />
        <Route path="/t/:track/practice" element={<PracticeList />} />
        <Route path="/t/:track/practice/:slug" element={<Problem />} />
        <Route path="/t/:track/interview-glance" element={<InterviewGlance />} />
        <Route path="/t/:track/interview-guide" element={<InterviewGuide />} />
        <Route path="/t/:track/trace-bench" element={<TraceBench />} />
        <Route path="/t/:track/saved" element={<SavedPage />} />
        <Route path="/admin" element={<RequireAdmin><Admin /></RequireAdmin>} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
    </Suspense>
  );
}
