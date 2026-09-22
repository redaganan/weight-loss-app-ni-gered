import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Flame, Utensils, Dumbbell, TrendingDown, Sparkles, RefreshCw, ChevronRight, PencilLine } from 'lucide-react';
import { api, getStoredUserId } from '../services/api';
import { useToast } from '../components/Toast';
import { calculateWeightProgress } from '../utils/progress';
import { getCurrentWeekDates } from '../utils/week';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

function buildEmptyAnalytics() {
  return getCurrentWeekDates().map(({ day, dateKey, shortDate }) => {
    return {
      label: day.slice(0, 3),
      dateLabel: shortDate,
      dateKey,
      calories: 0,
      burned: 0,
      workouts: 0,
      weight: null,
    };
  });
}

function getLocalDateKey(value = new Date()) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeAnalytics(history = [], meals = [], weightLogs = [], profile = {}) {
  const points = buildEmptyAnalytics();
  const pointMap = new Map(points.map((point) => [point.dateKey, point]));
  meals.forEach((meal) => {
    const dateKey = getLocalDateKey(meal.createdAt || meal.date || Date.now());
    const point = pointMap.get(dateKey);
    if (point) point.calories += Number(meal.calories) || 0;
  });

  weightLogs.forEach((log) => {
    const dateKey = log.loggedDate || getLocalDateKey(log.loggedAt || log.createdAt || Date.now());
    const point = pointMap.get(dateKey);
    if (point) point.weight = Number(log.weight) || point.weight;
  });

  const latestPlannerEntry = [...history]
    .filter((entry) => Array.isArray(entry.payload?.weeklyRhythm))
    .sort((a, b) => new Date(b.createdAt || b.generatedAt) - new Date(a.createdAt || a.generatedAt))[0];

  history.forEach((entry) => {
    const date = entry.createdAt || entry.generatedAt || Date.now();
    const dateKey = getLocalDateKey(date);
    const payload = entry.payload || {};
    const rhythm = Array.isArray(payload.weeklyRhythm) ? payload.weeklyRhythm : [];
    if (rhythm.length) {
      if (entry !== latestPlannerEntry) return;
      rhythm.forEach((day) => {
        if (!day.completed) return;
        const point = points.find((candidate) => candidate.label.toLowerCase() === String(day.day || '').slice(0, 3).toLowerCase());
        if (point) point.workouts += 1;
      });
      return;
    }

    const point = pointMap.get(dateKey);
    if (!point) return;
    point.workouts += entry.type === 'workout_log' ? 1 : 0;
    point.burned += Number(payload.caloriesBurned) || 0;
    const loggedWeight = Number(payload.currentWeight || payload.weight);
    if (loggedWeight > 0) point.weight = loggedWeight;
  });

  return points;
}

function buildFallbackMealPlan(data) {
  const calories = Number(data?.targetCalories) || Number(data?.calories) || 2200;
  const protein = Number(data?.proteinTarget) || 150;
  const carbs = Number(data?.carbsTarget) || 200;
  const fat = Number(data?.fatTarget) || 60;

  return [
    {
      type: 'Breakfast',
      name: 'Oatmeal with Greek Yogurt & Berries',
      calories: Math.round(calories * 0.25),
      protein: Math.round(protein * 0.25),
      carbs: Math.round(carbs * 0.35),
      fat: Math.round(fat * 0.2),
      instructions: 'Cook oats in water or unsweetened almond milk and top with berries and yogurt.',
    },
    {
      type: 'Lunch',
      name: 'Grilled Chicken Bowl',
      calories: Math.round(calories * 0.35),
      protein: Math.round(protein * 0.4),
      carbs: Math.round(carbs * 0.35),
      fat: Math.round(fat * 0.3),
      instructions: 'Pair grilled chicken with brown rice, greens, and roasted vegetables.',
    },
    {
      type: 'Snack',
      name: 'Protein Shake + Almonds',
      calories: Math.round(calories * 0.15),
      protein: Math.round(protein * 0.2),
      carbs: Math.round(carbs * 0.1),
      fat: Math.round(fat * 0.3),
      instructions: 'Blend a protein shake with water and pair it with a small handful of almonds.',
    },
    {
      type: 'Dinner',
      name: 'Baked Salmon Plate',
      calories: Math.round(calories * 0.25),
      protein: Math.round(protein * 0.15),
      carbs: Math.round(carbs * 0.2),
      fat: Math.round(fat * 0.2),
      instructions: 'Serve salmon with quinoa and roasted asparagus with lemon and herbs.',
    },
  ];
}

export default function BodyOfDashboard({ onViewSetup }) {
  const navigate = useNavigate();
  const { notify } = useToast();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [mealPlan, setMealPlan] = useState([]);
  const [error, setError] = useState('');
  const [analytics, setAnalytics] = useState(buildEmptyAnalytics);
  const [weightTrend, setWeightTrend] = useState(buildEmptyAnalytics);
  const [weightRange, setWeightRange] = useState('goal');

  const getProgressMetrics = (data = {}) => {
    const startWeight = Number(data.startWeight ?? data.weight ?? 0);
    const currentWeight = Number(data.weight ?? startWeight ?? 0);
    const goalWeight = Number(data.goalWeight ?? currentWeight ?? 0);
    const weightProgress = calculateWeightProgress({ startWeight, weight: currentWeight, currentWeight, goalWeight });

    const rhythm = Array.isArray(data.weeklyRhythm) ? data.weeklyRhythm : [];
    const completedDays = rhythm.filter((item) => Boolean(item.completed)).length;

    return {
      startWeight,
      currentWeight,
      goalWeight,
      weightDropPercent: weightProgress.percent,
      progressLabel: weightProgress.label,
      completedDays,
      totalDays: 7,
      workoutStreakPercent: Math.min(100, (completedDays / 7) * 100),
    };
  };

  const getBmiMetrics = (data = {}) => {
    const heightMeters = Number(data.height) / 100;
    const weight = Number(data.weight);

    if (!Number.isFinite(heightMeters) || heightMeters <= 0 || !Number.isFinite(weight) || weight <= 0) {
      return { value: null, status: 'Add height and weight' };
    }

    const value = Number((weight / (heightMeters * heightMeters)).toFixed(1));
    const status = value < 18.5
      ? 'Underweight'
      : value < 25
        ? 'Healthy range'
        : value < 30
          ? 'Overweight'
          : 'Obesity range';

    return { value, status };
  };

  const calculateMacros = () => {
    if (!userData) return { calories: 2000, protein: 150, carbs: 200, fat: 55 };

    const targetCalories = Number(userData.targetCalories) || Number(userData.calories) || 0;
    if (targetCalories) {
      return {
        calories: targetCalories,
        protein: Number(userData.proteinTarget) || Math.round((targetCalories * 0.3) / 4),
        carbs: Number(userData.carbsTarget) || Math.round((targetCalories * 0.4) / 4),
        fat: Number(userData.fatTarget) || Math.round((targetCalories * 0.3) / 9),
      };
    }

    const weight = Number(userData.weight) || 70;
    const height = Number(userData.height) || 170;
    const age = Number(userData.age) || 25;
    const isMale = userData.gender === 'male';

    let bmr = 10 * weight + 6.25 * height - 5 * age + (isMale ? 5 : -161);
    const activityMultipliers = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 };
    let tdee = bmr * (activityMultipliers[userData.activityLevel] || 1.55);

    if (Number(userData.goalWeight) < weight) {
      tdee -= 450;
    }

    const calories = Math.round(tdee);
    return {
      calories,
      protein: Math.round((calories * 0.3) / 4),
      carbs: Math.round((calories * 0.4) / 4),
      fat: Math.round((calories * 0.3) / 9),
    };
  };

  const fetchPlan = async (userId) => {
    setLoading(true);
    setError('');

    try {
      const { data } = await api.get(`/plan/${userId}`);
      const analyticsResponse = await api.get(`/analytics/${userId}?range=week&refresh=${Date.now()}`).catch((analyticsError) => {
        console.error('Unable to load analytics:', analyticsError);
        return { data: null };
      });
      const profile = data?.profile || {};
      const nextUserData = { ...profile, ...data?.user };
      setUserData(nextUserData);
      localStorage.setItem('userPlanData', JSON.stringify(nextUserData));
      setMealPlan(Array.isArray(data?.mealPlan) && data.mealPlan.length ? data.mealPlan : buildFallbackMealPlan(nextUserData));
      setAnalytics(Array.isArray(analyticsResponse.data?.days) ? analyticsResponse.data.days : normalizeAnalytics(
        [],
        [],
        [],
        { ...nextUserData, weeklyRhythm: data?.weeklyRhythm || nextUserData.weeklyRhythm },
      ));
    } catch (err) {
      const saved = localStorage.getItem('userPlanData');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setUserData(parsed);
          setMealPlan(buildFallbackMealPlan(parsed));
          setAnalytics(normalizeAnalytics([], [], [], parsed));
          setWeightTrend(normalizeAnalytics([], [], [], parsed));
          return;
        } catch (parseErr) {
          console.error('Unable to parse saved plan:', parseErr);
        }
      }

      setError(err.response?.data?.message || 'Unable to load plan from the backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const userId = getStoredUserId();
    if (!userId) return;

    api.get(`/analytics/${userId}?range=${weightRange}&refresh=${Date.now()}`)
      .then(({ data }) => {
        if (Array.isArray(data?.days)) setWeightTrend(data.days);
      })
      .catch((weightError) => console.error('Unable to refresh weight trend:', weightError));
  }, [weightRange]);

  useEffect(() => {
    const syncFromStorage = () => {
      const savedUser = JSON.parse(localStorage.getItem('user') || '{}');
      const userId = getStoredUserId();
      const saved = localStorage.getItem('userPlanData');

      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setUserData((prev) => ({ ...savedUser, ...parsed, ...prev }));
          setMealPlan(buildFallbackMealPlan({ ...savedUser, ...parsed }));
        } catch (error) {
          console.error('Unable to parse saved plan data:', error);
        }
      } else if (savedUser && savedUser.name) {
        setUserData((prev) => ({ ...savedUser, ...prev }));
      }

      if (userId) {
        fetchPlan(userId);
      }
    };

    syncFromStorage();
    window.addEventListener('planner-updated', syncFromStorage);
    window.addEventListener('profile-updated', syncFromStorage);
    const refreshAnalytics = () => {
      const currentUserId = getStoredUserId();
      if (currentUserId) fetchPlan(currentUserId);
    };
    window.addEventListener('meal-logged', refreshAnalytics);
    window.addEventListener('workout-logged', refreshAnalytics);

    return () => {
      window.removeEventListener('planner-updated', syncFromStorage);
      window.removeEventListener('profile-updated', syncFromStorage);
      window.removeEventListener('meal-logged', refreshAnalytics);
      window.removeEventListener('workout-logged', refreshAnalytics);
    };
  }, []);

  const [showWeightInput, setShowWeightInput] = useState(false);
  const [weightInput, setWeightInput] = useState('');
  const [savingWeight, setSavingWeight] = useState(false);
  const macros = calculateMacros();
  const progressStats = getProgressMetrics(userData || {});
  const bmiMetrics = getBmiMetrics(userData || {});
  const weeklyCaloriesConsumed = analytics.reduce((total, point) => total + point.calories, 0);
  const weeklyCaloriesBurned = analytics.reduce((total, point) => total + point.burned, 0);
  const weeklyWorkouts = Array.isArray(userData?.weeklyRhythm)
    ? userData.weeklyRhythm.filter((day) => day.completed).length
    : 0;

  const handleLogWeight = async () => {
    const userId = getStoredUserId();
    const parsedWeight = Number(weightInput);

    if (!Number.isFinite(parsedWeight) || parsedWeight < 20 || parsedWeight > 500) {
      notify('Enter a weight between 20 and 500 kg.', 'error');
      return;
    }

    setSavingWeight(true);
    try {
      if (!userId) {
        const nextUserData = { ...(userData || {}), weight: parsedWeight, lastWeightUpdate: new Date().toISOString() };
        setUserData(nextUserData);
        localStorage.setItem('userPlanData', JSON.stringify(nextUserData));
        notify('Weight saved locally. Sign in to sync it across devices.', 'info');
      } else {
        const { data } = await api.post('/weight-logs', { userAccount: userId, weight: parsedWeight });
        const savedProfile = { ...(userData || {}), ...(data?.profile || {}) };
        setUserData(savedProfile);
        localStorage.setItem('userPlanData', JSON.stringify(savedProfile));
        window.dispatchEvent(new CustomEvent('profile-updated'));
        const analyticsResponse = await api.get(`/analytics/${userId}?range=week&refresh=${Date.now()}`);
        if (Array.isArray(analyticsResponse.data?.days)) {
          setAnalytics(analyticsResponse.data.days);
        }
        const weightResponse = await api.get(`/analytics/${userId}?range=${weightRange}&refresh=${Date.now()}`);
        if (Array.isArray(weightResponse.data?.days)) {
          setWeightTrend(weightResponse.data.days);
        }
        notify('Today’s weight was logged successfully.', 'success');
      }
      setWeightInput('');
      setShowWeightInput(false);
    } catch (error) {
      console.error('Unable to save new weight entry:', error);
      notify(error.response?.data?.message || 'Unable to save your weight. Please try again.', 'error');
    } finally {
      setSavingWeight(false);
    }
  };

  const regeneratePlan = async () => {
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = getStoredUserId() || storedUser._id || storedUser.userId;

    if (!userId) {
      const saved = localStorage.getItem('userPlanData');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setUserData({ ...storedUser, ...parsed });
          setMealPlan(buildFallbackMealPlan({ ...storedUser, ...parsed }));
        } catch (error) {
          console.error('Unable to regenerate saved plan:', error);
        }
      }
      return;
    }

    setGeneratingPlan(true);
    setError('');

    try {
      const { data } = await api.post('/plan/regenerate', { userId });
      const profile = data?.profile || {};
      const nextUserData = { ...storedUser, ...profile, ...data?.user };
      setUserData(nextUserData);
      localStorage.setItem('userPlanData', JSON.stringify(nextUserData));
      setMealPlan(Array.isArray(data?.mealPlan) && data.mealPlan.length ? data.mealPlan : buildFallbackMealPlan(nextUserData));
      window.dispatchEvent(new CustomEvent('profile-updated', { detail: data?.weeklyRhythm || [] }));
      setError('');
      notify('Your AI plan has been regenerated.', 'success');
    } catch (err) {
      const fallback = JSON.parse(localStorage.getItem('userPlanData') || '{}');
      const nextUserData = { ...storedUser, ...fallback };
      setUserData(nextUserData || storedUser);
      setMealPlan(buildFallbackMealPlan(nextUserData));
      setError('');
      notify('Using your saved plan while the AI service is unavailable.', 'info');
    } finally {
      setGeneratingPlan(false);
    }
  };

  const analyticsTooltipStyle = {
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '12px',
    color: '#f8fafc',
  };

  if (!userData) {
    if (loading) {
      return (
        <div className="mx-auto max-w-6xl space-y-6 py-8" aria-label="Loading dashboard">
          <div className="h-32 animate-pulse rounded-2xl border border-slate-800 bg-slate-900/90" />
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-28 animate-pulse rounded-2xl border border-slate-800 bg-slate-900/90" />)}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="h-72 animate-pulse rounded-2xl border border-slate-800 bg-slate-900/90" />
            <div className="h-72 animate-pulse rounded-2xl border border-slate-800 bg-slate-900/90" />
          </div>
        </div>
      );
    }

    return (
      <div className="text-center py-20 space-y-4">
        <p className="text-slate-400">No setup profile is available yet.</p>
        <Link to="/" className="inline-block bg-amber-500 text-white px-6 py-2.5 rounded-xl font-semibold">
          Go to Setup Page
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <span>Welcome back, {userData.name || 'Athlete'}!</span>
            <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2.5 py-0.5 rounded-full capitalize">
              {userData.dietPreference || 'balanced'} Plan
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Target Goal: <span className="text-slate-200 font-medium">{userData.goalWeight || 65} kg</span> within{' '}
            <span className="text-slate-200 font-medium">{userData.timelineWeeks || 8} weeks</span>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (onViewSetup) {
                onViewSetup();
                return;
              }
              navigate('/');
            }}
            className="flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-300 transition-all hover:bg-amber-500/20"
          >
            <PencilLine className="h-4 w-4" />
            <span>Edit / Re-generate Plan</span>
          </button>
          <button
            onClick={regeneratePlan}
            disabled={generatingPlan}
            className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 transition-all hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <RefreshCw className={`h-4 w-4 ${generatingPlan ? 'animate-spin' : ''}`} />
            <span>{generatingPlan ? 'Generating plan...' : 'Regenerate AI Plan'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Daily Target</span>
            <Flame className="w-5 h-5 text-amber-400" />
          </div>
          <p className="text-3xl font-extrabold text-slate-100">{macros.calories}</p>
          <p className="text-xs text-slate-400 mt-1">kcal / day</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Protein</span>
            <span className="text-xs text-amber-400 font-bold">30%</span>
          </div>
          <p className="text-3xl font-extrabold text-slate-100">{macros.protein}<span className="text-base font-normal text-slate-400">g</span></p>
          <p className="text-xs text-slate-400 mt-1">Muscle Building</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Carbs</span>
            <span className="text-xs text-yellow-300 font-bold">40%</span>
          </div>
          <p className="text-3xl font-extrabold text-slate-100">{macros.carbs}<span className="text-base font-normal text-slate-400">g</span></p>
          <p className="text-xs text-slate-400 mt-1">Energy Support</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Fat</span>
            <span className="text-xs text-amber-300 font-bold">30%</span>
          </div>
          <p className="text-3xl font-extrabold text-slate-100">{macros.fat}<span className="text-base font-normal text-slate-400">g</span></p>
          <p className="text-xs text-slate-400 mt-1">Satiety & Hormones</p>
        </div>

        <div className="col-span-2 rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl lg:col-span-1">
          <div className="mb-2 flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">BMI</span>
            <span className="text-xs font-bold text-yellow-300">Health</span>
          </div>
          <p className="text-3xl font-extrabold text-slate-100">{bmiMetrics.value ?? '--'}</p>
          <p className="mt-1 text-xs text-slate-400">{bmiMetrics.status}</p>
        </div>
      </div>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-400">Analytics</p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <h2 className="text-xl font-bold text-slate-100">Weight trend</h2>
                <div className="flex rounded-lg border border-slate-700 bg-slate-950/60 p-1">
                  {['goal', '7d', '30d', '90d'].map((range) => (
                    <button
                      key={range}
                      type="button"
                      onClick={() => setWeightRange(range)}
                      className={`rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition ${
                        weightRange === range ? 'bg-amber-400 text-slate-950' : 'text-slate-400 hover:text-slate-100'
                      }`}
                    >
                      {range === 'goal' ? 'Goal' : range}
                    </button>
                  ))}
                </div>
              </div>
              <p className="mt-1 text-sm text-slate-400">
                {weightRange === 'goal'
                ? `Actual progress through today · ${userData?.timelineWeeks || 8}-week goal target.`
                  : `Actual weigh-ins across the selected ${weightRange === '7d' ? 'rolling 7-day' : weightRange === '30d' ? '30-day' : '90-day'} range.`}
              </p>
            </div>
            <TrendingDown className="h-5 w-5 text-amber-400" />
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weightTrend} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="weightFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.42} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="dateLabel"
                  interval={weightRange === 'goal' ? 6 : weightRange === '90d' ? 13 : weightRange === '30d' ? 4 : 0}
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={38} />
                <Tooltip contentStyle={analyticsTooltipStyle} labelFormatter={(_, payload) => payload?.[0]?.payload?.dateLabel || ''} formatter={(value) => [`${value ?? '--'} kg`, 'Weight']} />
                <Area type="monotone" dataKey="weight" stroke="#fbbf24" strokeWidth={3} fill="url(#weightFill)" connectNulls dot={{ r: 3, fill: '#fbbf24', strokeWidth: 0 }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-400">Weekly activity</p>
              <h2 className="mt-2 text-xl font-bold text-slate-100">Meal calories</h2>
              <p className="mt-1 text-sm text-slate-400">Calories logged from meals, Monday to Sunday.</p>
            </div>
            <Flame className="h-5 w-5 text-amber-400" />
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={38} />
                <Tooltip contentStyle={analyticsTooltipStyle} labelFormatter={(_, payload) => payload?.[0]?.payload?.dateLabel || ''} formatter={(value) => [`${value ?? 0} kcal`, 'Meal calories']} />
                <Bar dataKey="calories" name="Meal calories" fill="#f59e0b" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Calories consumed', value: `${weeklyCaloriesConsumed.toLocaleString()} kcal`, detail: 'Logged meals this week', tone: 'text-amber-400' },
          { label: 'Calories burned', value: `${weeklyCaloriesBurned.toLocaleString()} kcal`, detail: 'Logged workout burn', tone: 'text-yellow-300' },
          { label: 'Workouts logged', value: weeklyWorkouts, detail: 'Completed training sessions', tone: 'text-amber-400' },
          { label: 'Net balance', value: `${(weeklyCaloriesConsumed - weeklyCaloriesBurned).toLocaleString()} kcal`, detail: 'Consumed minus burned', tone: 'text-yellow-300' },
        ].map((metric) => (
          <div key={metric.label} className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 shadow-xl">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{metric.label}</p>
            <p className={`mt-2 text-xl font-black ${metric.tone}`}>{metric.value}</p>
            <p className="mt-1 text-xs text-slate-500">{metric.detail}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-400">Meal plan</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-100">Your personalized nutrition</h2>
            </div>
            <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300">
              {userData.dietPreference || 'balanced'}
            </span>
          </div>

          <div className="space-y-4">
            {mealPlan.map((meal) => (
              <div key={`${meal.type}-${meal.name}`} className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400">{meal.type}</span>
                  <span className="text-sm font-bold text-slate-100">{meal.calories} kcal</span>
                </div>
                <h3 className="text-lg font-semibold text-slate-100">{meal.name}</h3>
                <p className="mt-2 text-sm text-slate-400">{meal.instructions}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-slate-300">
                  <span className="rounded-full border border-slate-700 bg-slate-800 px-2.5 py-1">P {meal.protein}g</span>
                  <span className="rounded-full border border-slate-700 bg-slate-800 px-2.5 py-1">C {meal.carbs}g</span>
                  <span className="rounded-full border border-slate-700 bg-slate-800 px-2.5 py-1">F {meal.fat}g</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-400">Progress</p>
                <h3 className="mt-2 text-xl font-bold text-slate-100">This week</h3>
              </div>
              <TrendingDown className="h-5 w-5 text-amber-400" />
            </div>
            <div className="space-y-4">
              <div>
                <div className="mb-1 flex items-center justify-between text-sm text-slate-300">
                  <span>Goal progress</span>
                  <span>{progressStats.weightDropPercent}%</span>
                </div>
                <div className="h-2.5 rounded-full bg-slate-800">
                  <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-300" style={{ width: `${progressStats.weightDropPercent}%` }} />
                </div>
                <p className="mt-2 text-[11px] text-slate-400">
                  {progressStats.currentWeight || 0} kg / {progressStats.goalWeight || 0} kg goal · {progressStats.progressLabel}
                </p>
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between text-sm text-slate-300">
                  <span>Workout streak</span>
                  <span>{progressStats.completedDays}/{progressStats.totalDays}</span>
                </div>
                <div className="h-2.5 rounded-full bg-slate-800">
                  <div className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-amber-500" style={{ width: `${progressStats.workoutStreakPercent}%` }} />
                </div>
              </div>

              <div className="pt-2">
                {!showWeightInput ? (
                  <button
                    type="button"
                    onClick={() => setShowWeightInput(true)}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm font-semibold text-amber-300 hover:bg-amber-500/20"
                  >
                    <span>+ Log Today&apos;s Weight</span>
                  </button>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="number"
                      value={weightInput}
                      onChange={(event) => setWeightInput(event.target.value)}
                      placeholder={String(progressStats.currentWeight || userData.weight || '')}
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 outline-none focus:border-amber-400"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleLogWeight}
                        disabled={savingWeight}
                        className="flex-1 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-300 px-3 py-2 text-xs font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {savingWeight ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowWeightInput(false);
                          setWeightInput('');
                        }}
                        className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-400">Focus</p>
              <Sparkles className="h-4 w-4 text-yellow-300" />
            </div>
            <div className="space-y-3 text-sm text-slate-300">
              <div className="flex items-center gap-2"><Dumbbell className="h-4 w-4 text-amber-400" />Strength + mobility</div>
              <div className="flex items-center gap-2"><Utensils className="h-4 w-4 text-amber-400" />High protein consistency</div>
              <div className="flex items-center gap-2"><Flame className="h-4 w-4 text-amber-400" />Calorie deficit tracking</div>
            </div>
            <button className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 px-4 py-2.5 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/20">
              Review plan <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
