import React, { Component, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import SetupPage from './pages/SetupPage';
import DashboardPage from './pages/DashboardPage';
import FoodScanPage from './pages/FoodScanPage';
import WorkoutPage from './pages/WorkoutPage';
import PlannerPage from './pages/PlannerPage';
import HistoryPage from './pages/HistoryPage';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import { ToastProvider } from './components/Toast';

class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Application render error:', error, info);
  }

  handleRecovery = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#070707] px-6 text-center text-slate-100">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-400">Recovery mode</p>
            <h1 className="mt-3 text-2xl font-bold">This page hit an unexpected error</h1>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Your saved session is still intact. Reload the app and try the page again.
            </p>
            <button
              type="button"
              onClick={this.handleRecovery}
              className="mt-6 rounded-xl bg-linear-to-r from-amber-500 to-yellow-300 px-5 py-2.5 text-sm font-bold text-slate-950 transition hover:from-amber-600 hover:to-yellow-400"
            >
              Reload application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function ProtectedRoute({ children }) {
  const isAuthenticated = Boolean(localStorage.getItem('token'));

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function OverviewPage() {
  const [showDashboard, setShowDashboard] = useState(false);

  useEffect(() => {
    const syncView = () => {
      const hasSavedPlan = Boolean(localStorage.getItem('weightlossUserId') || localStorage.getItem('userPlanData'));
      setShowDashboard(hasSavedPlan);
    };

    syncView();
    window.addEventListener('storage', syncView);
    return () => window.removeEventListener('storage', syncView);
  }, []);

  if (showDashboard) {
    return <DashboardPage onViewSetup={() => setShowDashboard(false)} />;
  }

  return <SetupPage onViewDashboard={() => setShowDashboard(true)} />;
}

function MealsPage() {
  return (
    <div className="space-y-8">
      <FoodScanPage />
    </div>
  );
}

export default function App() {
  return (
    <AppErrorBoundary>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<OverviewPage />} />
          <Route path="setup" element={<SetupPage />} />
          <Route path="profile" element={<SetupPage isProfileEdit />} />
          <Route path="plan" element={<DashboardPage />} />
          <Route path="scan" element={<FoodScanPage />} />
          <Route path="meals" element={<MealsPage />} />
          <Route path="planner" element={<PlannerPage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="workouts" element={<WorkoutPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AppErrorBoundary>
  );
}
