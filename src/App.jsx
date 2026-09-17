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
import { getCurrentWeekDates } from './utils/week';

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

function PlannerPage() {
  const defaultWeeklyPlan = [
    { day: 'Monday', workoutFocus: 'Strength power', workout: 'Upper-body power circuit', repetitions: '3 sets × 10 reps', timeScope: '45 sec work / 30 sec transition', rest: '60 sec between sets', meal: 'High-protein breakfast bowl', nutritionStrategy: 'Fuel with lean protein and hydration', status: 'On track', completed: false, missed: false },
    { day: 'Tuesday', workoutFocus: 'Cardio burn', workout: 'HIIT intervals + sprint blocks', repetitions: '8 rounds', timeScope: '30 sec sprint / 60 sec recovery', rest: '2 mins after every 4 rounds', meal: 'Lean chicken power salad', nutritionStrategy: 'Keep carbs timed around training', status: 'On track', completed: false, missed: false },
    { day: 'Wednesday', workoutFocus: 'Core stability', workout: 'Plank + anti-rotation sequence', repetitions: '3 sets × 3 exercises', timeScope: '40 sec each exercise', rest: '30 sec between exercises', meal: 'Salmon quinoa bowl', nutritionStrategy: 'Recovery-focused meal with omega-3s', status: 'Planned', completed: false, missed: false },
    { day: 'Thursday', workoutFocus: 'Lower-body strength', workout: 'Leg drive + squat progression', repetitions: '4 sets × 8 reps', timeScope: '3 sec lowering / controlled rise', rest: '90 sec between sets', meal: 'Greek yogurt protein bowl', nutritionStrategy: 'Prioritize protein and post-workout carbs', status: 'On track', completed: false, missed: false },
    { day: 'Friday', workoutFocus: 'Conditioning', workout: 'Rowing or incline walk', repetitions: '5 rounds', timeScope: '4 mins effort / 2 mins easy pace', rest: '2 mins active recovery', meal: 'Turkey rice plate', nutritionStrategy: 'Balanced energy with steady protein', status: 'Planned', completed: false, missed: false },
    { day: 'Saturday', workoutFocus: 'Recovery', workout: 'Mobility flow + light cardio', repetitions: '2 rounds', timeScope: '45 sec per movement', rest: '30 sec between movements', meal: 'Protein smoothie + oats', nutritionStrategy: 'Hydration and easy digestion', status: 'Planned', completed: false, missed: false },
    { day: 'Sunday', workoutFocus: 'Reset', workout: 'Rest + walk + stretch routine', repetitions: '1 easy walk', timeScope: '20–30 mins easy pace', rest: 'As needed', meal: 'Recovery dinner plate', nutritionStrategy: 'Light meal and consistent calories', status: 'Recovery', completed: false, missed: false },
  ];

  const [weeklyPlan, setWeeklyPlan] = useState(defaultWeeklyPlan);
  const [editingIndex, setEditingIndex] = useState(null);
  const [completionIndex, setCompletionIndex] = useState(null);
  const [completionDraft, setCompletionDraft] = useState({ repetitions: '', timeScope: '', rest: '', exercises: [] });
  const [editDraft, setEditDraft] = useState({ workout: '', workoutFocus: '', nutritionStrategy: '', repetitions: '', timeScope: '', rest: '' });
  const weekDates = getCurrentWeekDates();
  const getWorkoutDetails = (item, index) => {
    const defaults = [
      { repetitions: '3 sets × 10 reps', timeScope: '35 mins', rest: '60 sec between sets' },
      { repetitions: '8 rounds', timeScope: '25 mins', rest: '60 sec recovery between rounds' },
      { repetitions: '3 sets × 3 exercises', timeScope: '20 mins', rest: '30 sec between exercises' },
      { repetitions: '4 sets × 8 reps', timeScope: '35 mins', rest: '90 sec between sets' },
      { repetitions: '5 rounds', timeScope: '30 mins', rest: '2 mins active recovery' },
      { repetitions: '2 rounds', timeScope: '20 mins', rest: '30 sec between movements' },
      { repetitions: '1 easy walk', timeScope: '20 mins', rest: 'As needed' },
    ][index] || { repetitions: '3 sets × 8 reps', timeScope: '30 mins', rest: '60 sec between sets' };
    return {
      repetitions: item.repetitions && !item.repetitions.startsWith('Follow') ? item.repetitions : defaults.repetitions,
      timeScope: item.timeScope && !item.timeScope.startsWith('Complete') ? item.timeScope : defaults.timeScope,
      rest: item.rest && item.rest !== 'Rest as needed' ? item.rest : defaults.rest,
    };
  };

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
      window.dispatchEvent(new CustomEvent('workout-logged', { detail: data.plannerCaloriesBurned || 0 }));
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
        const sourcePlan = Array.isArray(nextPlan) && nextPlan.length ? nextPlan : defaultWeeklyPlan;
        const normalized = weekDates.map((date, index) => (
          sourcePlan.find((item) => item.day?.toLowerCase() === date.day.toLowerCase())
          || sourcePlan[index]
          || defaultWeeklyPlan[index]
        ));
        setWeeklyPlan(normalized);
      } catch (error) {
        setWeeklyPlan(savedRhythm.length ? savedRhythm : defaultWeeklyPlan);
      }
    };

    loadPlan();
  }, []);

  const markDayMissed = async (index) => {
    const nextPlan = weeklyPlan.map((item, itemIndex) => {
      if (itemIndex !== index) return item;
      return {
        ...item,
        completed: false,
        missed: true,
        status: 'Missed',
      };
    });

    setWeeklyPlan(nextPlan);
    await persistPlan(nextPlan);
  };

  const openCompletionForm = (index) => {
    const item = weeklyPlan[index];
    const workoutDetails = getWorkoutDetails(item, index);
    const exercises = String(item.workout || item.workoutFocus || 'Workout')
      .split(/\s*,\s*|\s+\+\s+/)
      .map((exercise) => exercise.trim())
      .filter(Boolean)
      .map((exercise) => ({ exercise, performance: workoutDetails.repetitions }));
    setCompletionIndex(index);
    setCompletionDraft({
      repetitions: workoutDetails.repetitions,
      timeScope: workoutDetails.timeScope,
      rest: workoutDetails.rest,
      exercises,
    });
  };

  const confirmDayCompletion = async () => {
    if (completionIndex === null) return;
    const nextPlan = weeklyPlan.map((item, index) => (
      index === completionIndex
        ? {
            ...item,
            completed: true,
            missed: false,
            status: 'Completed',
            completedRepetitions: completionDraft.repetitions.trim(),
            completedTimeScope: completionDraft.timeScope.trim(),
            completedRest: completionDraft.rest.trim(),
            completedExerciseDetails: completionDraft.exercises,
          }
        : item
    ));

    setWeeklyPlan(nextPlan);
    setCompletionIndex(null);
    await persistPlan(nextPlan);
  };

  const handleEditSave = async () => {
    if (editingIndex === null) return;
    const nextPlan = weeklyPlan.map((item, index) => {
      if (index !== editingIndex) return item;
      return {
        ...item,
        workout: editDraft.workout || item.workout,
        workoutFocus: editDraft.workoutFocus || item.workoutFocus,
        nutritionStrategy: editDraft.nutritionStrategy || item.nutritionStrategy,
        repetitions: editDraft.repetitions || item.repetitions,
        timeScope: editDraft.timeScope || item.timeScope,
        rest: editDraft.rest || item.rest,
      };
    });

    setWeeklyPlan(nextPlan);
    setEditingIndex(null);
    setEditDraft({ workout: '', workoutFocus: '', nutritionStrategy: '', repetitions: '', timeScope: '', rest: '' });
    await persistPlan(nextPlan);
  };

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl shadow-slate-950/40">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-400">Planner</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-100">Weekly rhythm</h1>
            <p className="mt-2 text-sm text-slate-400">
              {weekDates[0].shortDate} – {weekDates[6].shortDate} · Monday to Sunday
            </p>
            <p className="mt-2 text-xs text-amber-300">
              Marking a workout complete automatically logs its estimated duration and calories burned.
            </p>
          </div>
          <button className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-300 hover:bg-amber-500/20">
            Edit plan
          </button>
        </div>

        <div className="mb-5 grid grid-cols-7 gap-2 rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
          {weekDates.map((date, index) => (
            <div key={date.dateKey} className="min-w-0 rounded-xl border border-slate-800 bg-slate-900/70 px-2 py-3 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{date.day.slice(0, 3)}</p>
              <p className="mt-1 text-sm font-bold text-slate-100">{date.shortDate}</p>
              <div className={`mx-auto mt-2 h-2 w-2 rounded-full ${weeklyPlan[index]?.completed ? 'bg-emerald-400' : 'bg-slate-600'}`} />
            </div>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {weekDates.map((date, index) => {
            const item = weeklyPlan[index] || { day: date.day };
            const workoutDetails = getWorkoutDetails(item, index);
            return (
            <div key={`${item.day}-${index}`} className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <span className="text-lg font-bold text-slate-100">{date.day}</span>
                  <p className="mt-0.5 text-xs text-slate-500">{date.shortDate}</p>
                </div>
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
                    value={editDraft.nutritionStrategy || item.nutritionStrategy}
                    onChange={(event) => setEditDraft((draft) => ({ ...draft, nutritionStrategy: event.target.value }))}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 outline-none focus:border-amber-400"
                    placeholder="Nutrition strategy"
                  />
                  <input value={editDraft.repetitions || item.repetitions || ''} onChange={(event) => setEditDraft((draft) => ({ ...draft, repetitions: event.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 outline-none focus:border-amber-400" placeholder="Sets and repetitions" />
                  <input value={editDraft.timeScope || item.timeScope || item.duration || ''} onChange={(event) => setEditDraft((draft) => ({ ...draft, timeScope: event.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 outline-none focus:border-amber-400" placeholder="Time scope" />
                  <input value={editDraft.rest || item.rest || ''} onChange={(event) => setEditDraft((draft) => ({ ...draft, rest: event.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 outline-none focus:border-amber-400" placeholder="Rest interval" />
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
                    <p><span className="text-slate-400">Repetitions:</span> {item.completedRepetitions || workoutDetails.repetitions}</p>
                    <p><span className="text-slate-400">Time:</span> {item.completedTimeScope || workoutDetails.timeScope}</p>
                    <p><span className="text-slate-400">Rest:</span> {item.completedRest || workoutDetails.rest}</p>
                    {item.completed && (
                      <p className="font-semibold text-yellow-300">
                        Estimated burn: {item.caloriesBurned || 'Calculating'} kcal
                      </p>
                    )}
                    <p><span className="text-slate-400">Focus:</span> {item.workoutFocus || item.focus}</p>
                    <p><span className="text-slate-400">Nutrition:</span> {item.nutritionStrategy}</p>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => (item.completed ? markDayMissed(index) : openCompletionForm(index))}
                      className={`flex-1 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                        item.completed
                          ? 'bg-red-500/10 text-red-300 hover:bg-red-500/20'
                          : 'bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
                      }`}
                    >
                      {item.completed ? 'Mark Missed' : 'Complete + Log Calories'}
                    </button>
                    <button
                      onClick={() => {
                        setEditingIndex(index);
                        setEditDraft({
                          workout: item.workout || '',
                          workoutFocus: item.workoutFocus || '',
                          nutritionStrategy: item.nutritionStrategy || '',
                          repetitions: workoutDetails.repetitions,
                          timeScope: workoutDetails.timeScope,
                          rest: workoutDetails.rest,
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
            );
          })}
        </div>

        {completionIndex !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-400">Workout completed</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-100">
                Log your actual workout
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                Enter what you actually did. We’ll use the time and workout details to register your estimated calories burned.
              </p>
              <div className="mt-5 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-300">Today’s workout</p>
                <p className="mt-1 text-base font-bold text-slate-100">
                  {weeklyPlan[completionIndex]?.workout || weeklyPlan[completionIndex]?.workoutFocus}
                </p>
                <div className="mt-3 space-y-2">
                  {completionDraft.exercises.map((exercise, exerciseIndex) => (
                    <div key={`${exercise.exercise}-${exerciseIndex}`}>
                      <label className="mb-1 block text-xs text-slate-400">{exercise.exercise}</label>
                      <input
                        value={exercise.performance}
                        onChange={(event) => setCompletionDraft((draft) => ({
                          ...draft,
                          exercises: draft.exercises.map((entry, entryIndex) => (
                            entryIndex === exerciseIndex ? { ...entry, performance: event.target.value } : entry
                          )),
                        }))}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 outline-none focus:ring-2 focus:ring-amber-500"
                        placeholder="Actual sets and reps"
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-5 space-y-3">
                <input
                  value={completionDraft.repetitions}
                  onChange={(event) => setCompletionDraft((draft) => ({ ...draft, repetitions: event.target.value }))}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="Actual sets and repetitions (e.g. 3 sets × 8 reps)"
                />
                <input
                  value={completionDraft.timeScope}
                  onChange={(event) => setCompletionDraft((draft) => ({ ...draft, timeScope: event.target.value }))}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="Actual duration (e.g. 35 mins)"
                />
                <input
                  value={completionDraft.rest}
                  onChange={(event) => setCompletionDraft((draft) => ({ ...draft, rest: event.target.value }))}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="Rest taken (e.g. 60 sec between sets)"
                />
              </div>
              <div className="mt-5 flex gap-3">
                <button
                  onClick={confirmDayCompletion}
                  className="flex-1 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-300 px-4 py-2.5 font-bold text-slate-950"
                >
                  Save + Log Calories
                </button>
                <button
                  onClick={() => setCompletionIndex(null)}
                  className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 font-semibold text-slate-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
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
  const [removingWorkout, setRemovingWorkout] = useState('');

  const removeWorkoutLog = async (entryId) => {
    if (!window.confirm('Remove this workout log and its calories burned?')) return;
    setRemovingWorkout(entryId);
    try {
      await api.delete(`/workouts/${entryId}`);
      setActivityHistory((entries) => entries.filter((entry) => entry._id !== entryId));
      window.dispatchEvent(new CustomEvent('workout-logged'));
    } catch (error) {
      console.error('Unable to remove workout log:', error);
    } finally {
      setRemovingWorkout('');
    }
  };

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
                  {entry.type === 'workout_log' && (
                    <button
                      type="button"
                      onClick={() => removeWorkoutLog(entry._id)}
                      disabled={removingWorkout === entry._id}
                      className="ml-2 rounded-lg border border-red-500/30 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                    >
                      {removingWorkout === entry._id ? 'Removing...' : 'Remove'}
                    </button>
                  )}
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
