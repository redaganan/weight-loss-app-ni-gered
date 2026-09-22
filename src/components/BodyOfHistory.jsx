import React, { useEffect, useState } from 'react';
import { api, getStoredUserId } from '../services/api';
import { calculateWeightProgress } from '../utils/progress';

export default function BodyOfHistory() {
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
      const { data } = await api.delete(`/workouts/${entryId}`);
      setActivityHistory((entries) => entries.filter((entry) => entry._id !== entryId));
      if (Array.isArray(data?.weeklyRhythm)) {
        const savedProfile = JSON.parse(localStorage.getItem('userPlanData') || '{}');
        localStorage.setItem('userPlanData', JSON.stringify({
          ...savedProfile,
          weeklyRhythm: data.weeklyRhythm,
          currentPlan: {
            ...(savedProfile.currentPlan || {}),
            weeklyRhythm: data.weeklyRhythm,
          },
        }));
        window.dispatchEvent(new CustomEvent('planner-updated', { detail: data.weeklyRhythm }));
      }
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
      case 'planner_missed':
        return {
          title: `Workout missed: ${payload.day || 'Planned day'}`,
          detail: `${payload.workoutName || 'Planned workout'} was not completed`,
          tone: 'yellow',
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
