import React, { useState, useEffect } from 'react';
import { api, getStoredUserId } from '../services/api';
import { getCurrentWeekDates } from '../utils/week';

export default function BodyOfPlanner() {
  const defaultWeeklyPlan = [
    { day: 'Monday', workoutFocus: 'Strength power', workout: 'Upper-body power circuit', repetitions: '3 sets × 10 reps', rest: '60 sec between sets', meal: 'High-protein breakfast bowl', nutritionStrategy: 'Fuel with lean protein and hydration', status: 'On track', completed: false, missed: false },
    { day: 'Tuesday', workoutFocus: 'Cardio burn', workout: 'HIIT intervals + sprint blocks', repetitions: '8 rounds', rest: '2 mins after every 4 rounds', meal: 'Lean chicken power salad', nutritionStrategy: 'Keep carbs timed around training', status: 'On track', completed: false, missed: false },
    { day: 'Wednesday', workoutFocus: 'Core stability', workout: 'Plank + anti-rotation sequence', repetitions: '3 sets × 3 exercises', rest: '30 sec between exercises', meal: 'Salmon quinoa bowl', nutritionStrategy: 'Recovery-focused meal with omega-3s', status: 'Planned', completed: false, missed: false },
    { day: 'Thursday', workoutFocus: 'Lower-body strength', workout: 'Leg drive + squat progression', repetitions: '4 sets × 8 reps', rest: '90 sec between sets', meal: 'Greek yogurt protein bowl', nutritionStrategy: 'Prioritize protein and post-workout carbs', status: 'On track', completed: false, missed: false },
    { day: 'Friday', workoutFocus: 'Conditioning', workout: 'Rowing or incline walk', repetitions: '5 rounds', rest: '2 mins active recovery', meal: 'Turkey rice plate', nutritionStrategy: 'Balanced energy with steady protein', status: 'Planned', completed: false, missed: false },
    { day: 'Saturday', workoutFocus: 'Recovery', workout: 'Mobility flow + light cardio', repetitions: '2 rounds', rest: '30 sec between movements', meal: 'Protein smoothie + oats', nutritionStrategy: 'Hydration and easy digestion', status: 'Planned', completed: false, missed: false },
    { day: 'Sunday', workoutFocus: 'Reset', workout: 'Rest + walk + stretch routine', repetitions: '1 easy walk', rest: 'As needed', meal: 'Recovery dinner plate', nutritionStrategy: 'Light meal and consistent calories', status: 'Recovery', completed: false, missed: false },
  ];

  const [weeklyPlan, setWeeklyPlan] = useState(defaultWeeklyPlan);
  const [editingIndex, setEditingIndex] = useState(null);
  const [completionIndex, setCompletionIndex] = useState(null);
  const [completionDraft, setCompletionDraft] = useState({ repetitions: '', rest: '', exercises: [] });
  const [editDraft, setEditDraft] = useState({ workout: '', workoutFocus: '', nutritionStrategy: '', repetitions: '', rest: '', exercises: [] });
  const weekDates = getCurrentWeekDates();
  const getWorkoutDetails = (item, index) => {
    const defaults = [
      { repetitions: '3 sets × 10 reps', rest: '60 sec between sets' },
      { repetitions: '8 rounds', rest: '60 sec recovery between rounds' },
      { repetitions: '3 sets × 3 exercises', rest: '30 sec between exercises' },
      { repetitions: '4 sets × 8 reps', rest: '90 sec between sets' },
      { repetitions: '5 rounds', rest: '2 mins active recovery' },
      { repetitions: '2 rounds', rest: '30 sec between movements' },
      { repetitions: '1 easy walk', rest: 'As needed' },
    ][index] || { repetitions: '3 sets × 8 reps', rest: '60 sec between sets' };
    return {
      repetitions: item.repetitions && !item.repetitions.startsWith('Follow') ? item.repetitions : defaults.repetitions,
      rest: item.rest && item.rest !== 'Rest as needed' ? item.rest : defaults.rest,
    };
  };
  const applyAutomaticMissedStatus = (items) => {
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return items.map((item, index) => {
      const dateKey = weekDates[index]?.dateKey;
      const completed = Boolean(item.completed);
      const missed = !completed && dateKey < todayKey;
      return {
        ...item,
        completed,
        missed,
        status: completed ? 'Completed' : missed ? 'Missed' : 'Planned',
      };
    });
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
        setWeeklyPlan(applyAutomaticMissedStatus(savedRhythm.length ? savedRhythm : defaultWeeklyPlan));
        return;
      }

      try {
        const [{ data }, historyResponse] = await Promise.all([
          api.get(`/plan/${userId}`),
          api.get(`/history/${userId}`),
        ]);
        const nextPlan = data.weeklyRhythm || data.currentPlan?.weeklyRhythm || savedRhythm || defaultWeeklyPlan;
        const sourcePlan = Array.isArray(nextPlan) && nextPlan.length ? nextPlan : defaultWeeklyPlan;
        const plannerWorkoutDates = new Set(
          (Array.isArray(historyResponse.data?.history) ? historyResponse.data.history : [])
            .filter((entry) => entry.type === 'workout_log')
            .map((entry) => {
              const value = entry.payload?.scheduledDate || entry.createdAt;
              return value
                ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date(value))
                : null;
            })
            .filter(Boolean),
        );
        let hadStaleCompletion = false;
        const normalized = weekDates.map((date, index) => {
          const item = sourcePlan.find((entry) => entry.day?.toLowerCase() === date.day.toLowerCase())
            || sourcePlan[index]
            || defaultWeeklyPlan[index];
          if (item.completed && !plannerWorkoutDates.has(date.dateKey)) {
            hadStaleCompletion = true;
            return {
              ...item,
              completed: false,
              missed: false,
              status: 'Planned',
              caloriesBurned: undefined,
              completedRepetitions: undefined,
              completedRest: undefined,
              completedExerciseDetails: undefined,
            };
          }
          return item;
        });
        const reconciledPlan = applyAutomaticMissedStatus(normalized);
        setWeeklyPlan(reconciledPlan);
        if (hadStaleCompletion) {
          await persistPlan(reconciledPlan);
        }
      } catch (error) {
        setWeeklyPlan(applyAutomaticMissedStatus(savedRhythm.length ? savedRhythm : defaultWeeklyPlan));
      }
    };

    loadPlan();
  }, []);

  const openCompletionForm = (index) => {
    const item = weeklyPlan[index];
    const workoutDetails = getWorkoutDetails(item, index);
    const exercises = Array.isArray(item.exercises) && item.exercises.length
      ? item.exercises.map((entry) => ({
          exercise: entry.exercise?.name || entry.exercise || 'Exercise',
          performance: entry.sets && entry.reps
            ? `${entry.sets} sets × ${entry.reps} reps`
            : workoutDetails.repetitions,
        }))
      : String(item.workout || item.workoutFocus || 'Workout')
        .split(/\s*,\s*|\s+\+\s+/)
        .map((exercise) => exercise.trim())
        .filter(Boolean)
        .map((exercise) => ({ exercise, performance: workoutDetails.repetitions }));
    setCompletionIndex(index);
    setCompletionDraft({
      repetitions: workoutDetails.repetitions,
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
        rest: editDraft.rest || item.rest,
        ...(item.completed
          ? {
              completedRepetitions: editDraft.repetitions || item.repetitions,
              completedRest: editDraft.rest || item.rest,
              completedExerciseDetails: editDraft.exercises,
            }
          : {}),
      };
    });

    setWeeklyPlan(nextPlan);
    setEditingIndex(null);
    setEditDraft({ workout: '', workoutFocus: '', nutritionStrategy: '', repetitions: '', rest: '', exercises: [] });
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
              Marking a workout complete estimates calories from your sets and reps.
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
                  <input value={editDraft.rest || item.rest || ''} onChange={(event) => setEditDraft((draft) => ({ ...draft, rest: event.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 outline-none focus:border-amber-400" placeholder="Rest interval" />
                  {item.completed && editDraft.exercises.length > 0 && (
                    <div className="space-y-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">Completed exercises</p>
                      {editDraft.exercises.map((exercise, exerciseIndex) => (
                        <label key={`${exercise.exercise}-${exerciseIndex}`} className="block">
                          <span className="mb-1 block text-xs text-slate-400">{exercise.exercise}</span>
                          <input
                            value={exercise.performance}
                            onChange={(event) => setEditDraft((draft) => ({
                              ...draft,
                              exercises: draft.exercises.map((entry, entryIndex) => (
                                entryIndex === exerciseIndex
                                  ? { ...entry, performance: event.target.value }
                                  : entry
                              )),
                            }))}
                            className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 outline-none focus:border-amber-400"
                            placeholder="Sets and reps"
                          />
                        </label>
                      ))}
                    </div>
                  )}
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
                    <p><span className="text-slate-400">Rest:</span> {item.completedRest || workoutDetails.rest}</p>
                    {Array.isArray(item.exercises) && item.exercises.length > 0 && (
                      <div className="mt-4 rounded-xl border border-amber-500/15 bg-amber-500/5 p-3">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">
                          Exercise details
                        </p>
                        <div className="space-y-2">
                          {item.exercises.map((entry, exerciseIndex) => (
                            <div key={`${entry.id || entry.exercise?.name || entry.exercise}-${exerciseIndex}`} className="rounded-lg border border-slate-800 bg-slate-900/70 p-2.5">
                              <p className="text-sm font-semibold text-slate-100">
                                {entry.exercise?.name || entry.exercise || 'Exercise'}
                              </p>
                              <p className="mt-1 text-xs text-slate-400">
                                {entry.sets && entry.reps
                                  ? `${entry.sets} sets × ${entry.reps} reps`
                                  : item.completedRepetitions || item.repetitions || 'Follow the planned repetitions'}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
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
                      onClick={() => openCompletionForm(index)}
                      disabled={item.completed || item.missed}
                      className={`flex-1 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                        item.completed || item.missed
                          ? 'cursor-not-allowed bg-slate-800 text-slate-500'
                          : 'bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
                      }`}
                    >
                      {item.completed ? 'Workout Completed' : item.missed ? 'Workout Missed' : 'Complete + Log Calories'}
                    </button>
                    <button
                      onClick={() => {
                        setEditingIndex(index);
                        setEditDraft({
                          workout: item.workout || '',
                          workoutFocus: item.workoutFocus || '',
                          nutritionStrategy: item.nutritionStrategy || '',
                          repetitions: workoutDetails.repetitions,
                          rest: workoutDetails.rest,
                          exercises: Array.isArray(item.completedExerciseDetails) && item.completedExerciseDetails.length
                            ? item.completedExerciseDetails
                            : (item.exercises || []).map((entry) => ({
                                exercise: entry.exercise?.name || entry.exercise || 'Exercise',
                                performance: entry.sets && entry.reps
                                  ? `${entry.sets} sets × ${entry.reps} reps`
                                  : workoutDetails.repetitions,
                              })),
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
                Enter the sets and reps you actually completed. We’ll use those details to estimate your calories burned.
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
