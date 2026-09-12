import React, { Component, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import SetupPage from './pages/SetupPage';
import DashboardPage from './pages/DashboardPage';
import FoodScanPage from './pages/FoodScanPage';
import WorkoutPage from './pages/WorkoutPage';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import { api, getStoredUserId } from './services/api';
import { ToastProvider } from './components/Toast';
import { calculateWeightProgress } from './utils/progress';

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
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('foodHistory') || '[]');
    setHistory(saved.slice(0, 5));
  }, []);

  return (
    <div className="space-y-8">
      <FoodScanPage />

      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl shadow-slate-950/40">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-400">Meal tracker</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-100">Recent meals</h2>
          </div>
        </div>

        {history.length > 0 ? (
          <div className="space-y-3">
            {history.map((item, index) => (
              <div key={`${item.foodName}-${index}`} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                <div>
                  <p className="font-semibold text-slate-100 capitalize">{item.foodName}</p>
                  <p className="text-xs text-slate-400">{new Date(item.date).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-amber-400">{item.calories} kcal</p>
                  <p className="text-xs text-slate-400">{item.protein}P / {item.carbs}C / {item.fat}F</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/40 p-6 text-center text-slate-400">
            No scanned meals yet. Upload a food photo to build your recent meal history.
          </div>
        )}
      </div>
    </div>
  );
}

function PlannerPage() {
  const defaultWeeklyPlan = [
    { day: 'Monday', workoutFocus: 'Strength power', workout: 'Upper-body power circuit', meal: 'High-protein breakfast bowl', nutritionStrategy: 'Fuel with lean protein and hydration', status: 'On track', completed: false, missed: false },
    { day: 'Tuesday', workoutFocus: 'Cardio burn', workout: 'HIIT intervals + sprint blocks', meal: 'Lean chicken power salad', nutritionStrategy: 'Keep carbs timed around training', status: 'On track', completed: false, missed: false },
    { day: 'Wednesday', workoutFocus: 'Core stability', workout: 'Plank + anti-rotation sequence', meal: 'Salmon quinoa bowl', nutritionStrategy: 'Recovery-focused meal with omega-3s', status: 'Planned', completed: false, missed: false },
    { day: 'Thursday', workoutFocus: 'Lower-body strength', workout: 'Leg drive + squat progression', meal: 'Greek yogurt protein bowl', nutritionStrategy: 'Prioritize protein and post-workout carbs', status: 'On track', completed: false, missed: false },
    { day: 'Friday', workoutFocus: 'Conditioning', workout: 'Rowing or incline walk', meal: 'Turkey rice plate', nutritionStrategy: 'Balanced energy with steady protein', status: 'Planned', completed: false, missed: false },
    { day: 'Saturday', workoutFocus: 'Recovery', workout: 'Mobility flow + light cardio', meal: 'Protein smoothie + oats', nutritionStrategy: 'Hydration and easy digestion', status: 'Planned', completed: false, missed: false },
    { day: 'Sunday', workoutFocus: 'Reset', workout: 'Rest + walk + stretch routine', meal: 'Recovery dinner plate', nutritionStrategy: 'Light meal and consistent calories', status: 'Recovery', completed: false, missed: false },
  ];

  const [weeklyPlan, setWeeklyPlan] = useState(defaultWeeklyPlan);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editDraft, setEditDraft] = useState({ workout: '', meal: '', workoutFocus: '', nutritionStrategy: '' });

  const persistPlan = async (nextPlan) => {
    const userId = getStoredUserId();
    const savedPlan = JSON.parse(localStorage.getItem('userPlanData') || '{}');
    const merged = { ...savedPlan, weeklyRhythm: nextPlan };
    localStorage.setItem('userPlanData', JSON.stringify(merged));
    window.dispatchEvent(new CustomEvent('planner-updated', { detail: nextPlan }));

    if (!userId) {
      return;
    }

    try {
      const { data } = await api.post('/user/planner/save', { userId, weeklyRhythm: nextPlan });
      const savedRhythm = Array.isArray(data?.weeklyRhythm) && data.weeklyRhythm.length ? data.weeklyRhythm : nextPlan;
      setWeeklyPlan(savedRhythm);
      const mergedProfile = { ...savedPlan, ...data.profile, weeklyRhythm: savedRhythm };
      localStorage.setItem('userPlanData', JSON.stringify(mergedProfile));
      window.dispatchEvent(new CustomEvent('planner-updated', { detail: savedRhythm }));
    } catch (error) {
      console.error('Unable to persist planner updates:', error);
      setWeeklyPlan(nextPlan);
    }
  };

  useEffect(() => {
    const loadPlan = async () => {
      const userId = getStoredUserId();
      const savedProfile = JSON.parse(localStorage.getItem('userPlanData') || '{}');
      const savedRhythm = savedProfile.weeklyRhythm || savedProfile.currentPlan?.weeklyRhythm || [];

      if (!userId) {
        setWeeklyPlan(savedRhythm.length ? savedRhythm : defaultWeeklyPlan);
        return;
      }

      try {
        const { data } = await api.get(`/plan/${userId}`);
        const nextPlan = data.weeklyRhythm || data.currentPlan?.weeklyRhythm || savedRhythm || defaultWeeklyPlan;
        const normalized = Array.isArray(nextPlan) && nextPlan.length ? nextPlan : defaultWeeklyPlan;
        setWeeklyPlan(normalized);
      } catch (error) {
        setWeeklyPlan(savedRhythm.length ? savedRhythm : defaultWeeklyPlan);
      }
    };

    loadPlan();
  }, []);

  const toggleDayCompletion = async (index) => {
    const nextPlan = weeklyPlan.map((item, itemIndex) => {
      if (itemIndex !== index) return item;
      const nextCompleted = !Boolean(item.completed);
      return {
        ...item,
        completed: nextCompleted,
        missed: !nextCompleted,
        status: nextCompleted ? 'Completed' : 'Missed',
      };
    });

    setWeeklyPlan(nextPlan);
    await persistPlan(nextPlan);
  };

  const handleEditSave = async () => {
    if (editingIndex === null) return;
    const nextPlan = weeklyPlan.map((item, index) => {
      if (index !== editingIndex) return item;
      return {
        ...item,
        workout: editDraft.workout || item.workout,
        meal: editDraft.meal || item.meal,
        workoutFocus: editDraft.workoutFocus || item.workoutFocus,
        nutritionStrategy: editDraft.nutritionStrategy || item.nutritionStrategy,
      };
    });

    setWeeklyPlan(nextPlan);
    setEditingIndex(null);
    setEditDraft({ workout: '', meal: '', workoutFocus: '', nutritionStrategy: '' });
    await persistPlan(nextPlan);
  };

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl shadow-slate-950/40">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-400">Planner</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-100">Weekly rhythm</h1>
          </div>
          <button className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-300 hover:bg-amber-500/20">
            Edit plan
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {weeklyPlan.map((item, index) => (
            <div key={`${item.day}-${index}`} className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-lg font-bold text-slate-100">{item.day}</span>
                <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${
                  item.completed
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                    : item.missed
                      ? 'border-red-500/30 bg-red-500/10 text-red-300'
                      : 'border-amber-500/20 bg-amber-500/10 text-amber-300'
                }`}>
                  {item.status || 'Planned'}
                </span>
              </div>

              {editingIndex === index ? (
                <div className="space-y-3 text-sm text-slate-300">
                  <input
                    value={editDraft.workoutFocus || item.workoutFocus}
                    onChange={(event) => setEditDraft((draft) => ({ ...draft, workoutFocus: event.target.value }))}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 outline-none focus:border-amber-400"
                    placeholder="Workout focus"
                  />
                  <input
                    value={editDraft.workout || item.workout}
                    onChange={(event) => setEditDraft((draft) => ({ ...draft, workout: event.target.value }))}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 outline-none focus:border-amber-400"
                    placeholder="Workout"
                  />
                  <input
                    value={editDraft.meal || item.meal}
                    onChange={(event) => setEditDraft((draft) => ({ ...draft, meal: event.target.value }))}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 outline-none focus:border-amber-400"
                    placeholder="Meal"
                  />
                  <input
                    value={editDraft.nutritionStrategy || item.nutritionStrategy}
                    onChange={(event) => setEditDraft((draft) => ({ ...draft, nutritionStrategy: event.target.value }))}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 outline-none focus:border-amber-400"
                    placeholder="Nutrition strategy"
                  />
                  <div className="flex gap-2">
                    <button onClick={handleEditSave} className="flex-1 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-300 px-3 py-2 text-xs font-bold text-slate-950">
                      Save
                    </button>
                    <button onClick={() => setEditingIndex(null)} className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="space-y-2 text-sm text-slate-300">
                    <p><span className="text-slate-400">Workout:</span> {item.workout || item.workoutFocus}</p>
                    <p><span className="text-slate-400">Meal:</span> {item.meal}</p>
                    <p><span className="text-slate-400">Focus:</span> {item.workoutFocus || item.focus}</p>
                    <p><span className="text-slate-400">Nutrition:</span> {item.nutritionStrategy}</p>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => toggleDayCompletion(index)}
                      className={`flex-1 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                        item.completed
                          ? 'bg-red-500/10 text-red-300 hover:bg-red-500/20'
                          : 'bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                      }`}
                    >
                      {item.completed ? 'Mark Missed' : 'Mark Completed'}
                    </button>
                    <button
                      onClick={() => {
                        setEditingIndex(index);
                        setEditDraft({
                          workout: item.workout || '',
                          meal: item.meal || '',
                          workoutFocus: item.workoutFocus || '',
                          nutritionStrategy: item.nutritionStrategy || '',
                        });
                      }}
                      className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700"
                    >
                      Edit Day
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HistoryPage() {
  const [historyEntries, setHistoryEntries] = useState([]);
  const [activityHistory, setActivityHistory] = useState([]);
  const [weightLogs, setWeightLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [progressData, setProgressData] = useState({ percent: 0, streak: 0, currentWeight: 0, goalWeight: 0 });

  useEffect(() => {
    const loadHistory = async () => {
      const userId = getStoredUserId();
      const savedProfile = JSON.parse(localStorage.getItem('userPlanData') || '{}');

      if (!userId) {
        const startWeight = Number(savedProfile.startWeight || savedProfile.weight || 72);
        const currentWeight = Number(savedProfile.weight || startWeight);
        const goalWeight = Number(savedProfile.goalWeight || currentWeight);
        const percent = calculateWeightProgress({ startWeight, weight: currentWeight, currentWeight, goalWeight }).percent;
        setProgressData({ percent: Number(percent.toFixed(1)), streak: 0, currentWeight, goalWeight });
        setHistoryEntries([
          { label: 'Weight trend', value: `${startWeight - currentWeight >= 0 ? '-' : '+'}${Math.abs(startWeight - currentWeight).toFixed(1)} kg`, detail: `From ${startWeight} kg to ${currentWeight} kg`, tone: 'amber' },
          { label: 'Workout streak', value: '0 days', detail: 'No workout logs yet', tone: 'yellow' },
          { label: 'Progress', value: `${Number(percent.toFixed(1))}%`, detail: `Goal ${goalWeight} kg`, tone: 'amber' },
          { label: 'Meal plan', value: 'Ready', detail: 'Nutrition plan available', tone: 'yellow' },
        ]);
        setActivityHistory([]);
        setWeightLogs([]);
        setLoading(false);
        return;
      }

      try {
        const [{ data }, weightLogsResponse] = await Promise.all([
          api.get(`/history/${userId}`),
          api.get(`/weight-logs/${userId}`).catch(() => ({ data: [] })),
        ]);
        const savedWeightLogs = Array.isArray(weightLogsResponse.data) ? weightLogsResponse.data : [];
        const profile = data.profile || savedProfile || {};
        const startWeight = Number(profile.startWeight || profile.weight || savedProfile.startWeight || savedProfile.weight || 72);
        const currentWeight = Number(profile.weight || savedProfile.weight || startWeight);
        const goalWeight = Number(profile.goalWeight || savedProfile.goalWeight || currentWeight);
        const weightProgress = calculateWeightProgress({ startWeight, weight: currentWeight, currentWeight, goalWeight }).percent;
        const streak = Number(data.workoutStreak || 0);

        const mapped = [
          { label: 'Weight progress', value: `${Number(weightProgress.toFixed(1))}%`, detail: `${currentWeight} kg / ${goalWeight} kg goal`, tone: 'amber' },
          { label: 'Workout streak', value: `${streak} days`, detail: 'Based on recent logged training', tone: 'yellow' },
          { label: 'Meal plan', value: 'Live', detail: 'Synced with AI-generated meals', tone: 'amber' },
          { label: 'History items', value: `${(data.history || []).length}`, detail: 'Total saved records', tone: 'yellow' },
        ];

        setProgressData({ percent: Number(weightProgress.toFixed(1)), streak, currentWeight, goalWeight });
        setHistoryEntries(mapped);
        setActivityHistory(Array.isArray(data.history) ? data.history : []);
        const legacyWeightLogs = (Array.isArray(data.history) ? data.history : [])
          .filter((entry) => entry.type === 'weight_log')
          .map((entry) => ({
            _id: `legacy-${entry._id}`,
            weight: Number(entry.payload?.currentWeight || entry.payload?.weight),
            loggedAt: entry.createdAt || entry.generatedAt,
          }))
          .filter((entry) => Number.isFinite(entry.weight));
        setWeightLogs(savedWeightLogs.length ? savedWeightLogs : legacyWeightLogs);
      } catch (error) {
        const startWeight = Number(savedProfile.startWeight || savedProfile.weight || 72);
        const currentWeight = Number(savedProfile.weight || startWeight);
        const goalWeight = Number(savedProfile.goalWeight || currentWeight);
        const percent = calculateWeightProgress({ startWeight, weight: currentWeight, currentWeight, goalWeight }).percent;
        setHistoryEntries([
          { label: 'Weight progress', value: `${Number(percent.toFixed(1))}%`, detail: `${currentWeight} kg / ${goalWeight} kg goal`, tone: 'amber' },
          { label: 'Workout streak', value: '0 days', detail: 'No recent workout logs', tone: 'yellow' },
          { label: 'Meal plan', value: 'Ready', detail: 'Nutrition plan available', tone: 'amber' },
          { label: 'History items', value: '0', detail: 'No saved records yet', tone: 'yellow' },
        ]);
        setProgressData({ percent: Number(percent.toFixed(1)), streak: 0, currentWeight, goalWeight });
        setActivityHistory([]);
        setWeightLogs([]);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, []);

  const describeActivity = (entry) => {
    const payload = entry.payload || {};
    switch (entry.type) {
      case 'meal_log':
        return {
          title: `Meal logged: ${payload.foodName || 'Meal'}`,
          detail: `${payload.calories || 0} kcal · ${payload.protein || 0}g protein`,
          tone: 'yellow',
        };

      case 'workout_log':
        if (payload.exerciseName) {
          return {
            title: `Workout completed: ${payload.exerciseName}`,
            detail: `${payload.durationMinutes || 0} min · ${payload.caloriesBurned || 0} kcal burned`,
            tone: 'amber',
          };
        }
        return {
          title: 'Planner progress updated',
          detail: `${(payload.weeklyRhythm || []).filter((day) => day.completed).length} completed days`,
          tone: 'amber',
        };
      case 'weight_log':
        return {
          title: 'Weight updated',
          detail: `${payload.currentWeight || payload.weight || '--'} kg`,
          tone: 'yellow',
        };
      case 'ai_plan_regen':
        return {
          title: 'AI plan regenerated',
          detail: payload.source === 'fallback' ? 'Fallback recommendations saved' : 'Personalized recommendations saved',
          tone: 'amber',
        };
      case 'meal_plan':
        return {
          title: 'Meal plan generated',
          detail: 'Nutrition recommendations saved',
          tone: 'yellow',
        };
      default:
        return {
          title: 'Fitness activity recorded',
          detail: 'Your progress data was updated',
          tone: 'amber',
        };
    }
  };

  const orderedWeightLogs = [...weightLogs]
    .sort((a, b) => new Date(a.loggedAt || a.createdAt) - new Date(b.loggedAt || b.createdAt))
    .slice(-14);
  const weightValues = orderedWeightLogs.map((entry) => Number(entry.weight)).filter(Number.isFinite);
  const minWeight = weightValues.length ? Math.min(...weightValues) : 0;
  const maxWeight = weightValues.length ? Math.max(...weightValues) : 0;
  const weightRange = Math.max(maxWeight - minWeight, 1);

  return (
    <div className="space-y-8">
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {historyEntries.map((entry) => (
          <div key={entry.label} className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl shadow-slate-950/40">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{entry.label}</p>
            <p className={`mt-4 text-3xl font-black ${entry.tone === 'amber' ? 'text-amber-400' : 'text-yellow-300'}`}>
              {entry.value}
            </p>
            <p className="mt-2 text-sm text-slate-400">{entry.detail}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl shadow-slate-950/40">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-400">Weight history</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-100">Dedicated weight trend</h2>
            <p className="mt-1 text-sm text-slate-400">Your saved weigh-ins, separate from general activity.</p>
          </div>
          {weightLogs.length > 0 && (
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
              {weightLogs.length} logged
            </span>
          )}
        </div>

        {orderedWeightLogs.length > 0 ? (
          <div className="space-y-5">
            <div className="flex h-44 items-end gap-2 rounded-xl border border-slate-800 bg-slate-950/50 px-3 pt-4">
              {orderedWeightLogs.map((entry) => {
                const weight = Number(entry.weight);
                const height = `${Math.max(12, ((weight - minWeight) / weightRange) * 78 + 22)}%`;
                return (
                  <div key={entry._id} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                    <span className="text-[10px] font-bold text-slate-300">{weight} kg</span>
                    <div className="w-full max-w-8 rounded-t-lg bg-linear-to-t from-amber-500 to-yellow-300 shadow-lg shadow-amber-500/20" style={{ height }} title={`${weight} kg`} />
                    <span className="text-[10px] text-slate-500">
                      {new Date(entry.loggedAt || entry.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[...orderedWeightLogs].reverse().slice(0, 6).map((entry) => (
                <div key={`detail-${entry._id}`} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-200">{Number(entry.weight).toFixed(1)} kg</p>
                    <p className="text-xs text-slate-500">{new Date(entry.loggedAt || entry.createdAt).toLocaleString()}</p>
                  </div>
                  <span className="text-xs font-semibold text-amber-300">Saved</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/40 p-6 text-center text-slate-400">
            No dedicated weight logs yet. Use “Log Today&apos;s Weight” on the dashboard to start your trend.
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl shadow-slate-950/40">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-400">History</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-100">Recent progress</h2>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-16 animate-pulse rounded-xl border border-slate-800 bg-slate-950/50" />)}
          </div>
        ) : activityHistory.length > 0 ? (
          <div className="space-y-3">
            {activityHistory.map((entry) => {
              const activity = describeActivity(entry);
              return (
                <div key={entry._id} className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                  <div className={`mt-1 h-2.5 w-2.5 rounded-full ${activity.tone === 'amber' ? 'bg-amber-400' : 'bg-yellow-300'} shadow-[0_0_12px_rgba(245,158,11,0.8)]`} />
                  <div className="flex-1">
                    <p className="font-semibold text-slate-200">{activity.title}</p>
                    <p className="mt-1 text-sm text-slate-400">{activity.detail}</p>
                    <p className="mt-1 text-xs text-slate-500">{new Date(entry.createdAt || entry.generatedAt).toLocaleString()}</p>
                  </div>
                  <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] uppercase tracking-wider text-slate-400">
                    {entry.type.replace(/_/g, ' ')}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
            <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/40 p-6 text-center text-slate-400">
              No history items yet. Generate a plan or log a workout to populate your progress timeline.
            </div>
        )}
      </div>
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
