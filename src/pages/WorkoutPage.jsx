import React, { useState, useEffect, useMemo } from 'react';
import { Dumbbell, Search, Filter, ChevronLeft, ChevronRight, Activity, Flame, Play, Clock, CheckCircle2 } from 'lucide-react';
import { api, getStoredUserId } from '../services/api';

const gifPool = [
  'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 320 180%22%3E%3Crect width=%22320%22 height=%22180%22 fill=%22%230f172a%22/%3E%3Ctext x=%22160%22 y=%2295%22 text-anchor=%22middle%22 fill=%22%23f59e0b%22 font-family=%22sans-serif%22 font-size=%2216%22%3EExercise preview%3C/text%3E%3C/svg%3E',
  'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 320 180%22%3E%3Crect width=%22320%22 height=%22180%22 fill=%22%230f172a%22/%3E%3Ctext x=%22160%22 y=%2295%22 text-anchor=%22middle%22 fill=%22%23f59e0b%22 font-family=%22sans-serif%22 font-size=%2216%22%3EExercise preview%3C/text%3E%3C/svg%3E',
  'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 320 180%22%3E%3Crect width=%22320%22 height=%22180%22 fill=%22%230f172a%22/%3E%3Ctext x=%22160%22 y=%2295%22 text-anchor=%22middle%22 fill=%22%23f59e0b%22 font-family=%22sans-serif%22 font-size=%2216%22%3EExercise preview%3C/text%3E%3C/svg%3E',
  'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 320 180%22%3E%3Crect width=%22320%22 height=%22180%22 fill=%22%230f172a%22/%3E%3Ctext x=%22160%22 y=%2295%22 text-anchor=%22middle%22 fill=%22%23f59e0b%22 font-family=%22sans-serif%22 font-size=%2216%22%3EExercise preview%3C/text%3E%3C/svg%3E',
  'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 320 180%22%3E%3Crect width=%22320%22 height=%22180%22 fill=%22%230f172a%22/%3E%3Ctext x=%22160%22 y=%2295%22 text-anchor=%22middle%22 fill=%22%23f59e0b%22 font-family=%22sans-serif%22 font-size=%2216%22%3EExercise preview%3C/text%3E%3C/svg%3E',
  'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 320 180%22%3E%3Crect width=%22320%22 height=%22180%22 fill=%22%230f172a%22/%3E%3Ctext x=%22160%22 y=%2295%22 text-anchor=%22middle%22 fill=%22%23f59e0b%22 font-family=%22sans-serif%22 font-size=%2216%22%3EExercise preview%3C/text%3E%3C/svg%3E',
];

const defaultExerciseCatalog = [
  {
    _id: 'default-push-up',
    name: 'Push-ups',
    category: 'chest',
    target: 'chest',
    equipment: 'bodyweight',
    description: 'Push-ups train the chest, shoulders, and triceps with a full-body brace.',
    images: [gifPool[0], gifPool[1]],
  },
  {
    _id: 'default-bench-press',
    name: 'Bench Press',
    category: 'chest',
    target: 'chest',
    equipment: 'barbell',
    description: 'Heavy pressing pattern for chest size and upper-body strength.',
    images: [gifPool[2], gifPool[3]],
  },
  {
    _id: 'default-dumbbell-flyes',
    name: 'Dumbbell Flyes',
    category: 'chest',
    target: 'chest',
    equipment: 'dumbbells',
    description: 'Controlled chest stretch and squeeze for hypertrophy and stability.',
    images: [gifPool[4], gifPool[5]],
  },
  {
    _id: 'default-incline-press',
    name: 'Incline Press',
    category: 'chest',
    target: 'upper chest',
    equipment: 'barbell',
    description: 'Upper-chest emphasis with a steeper pressing angle and better range.',
    images: [gifPool[1], gifPool[2]],
  },
  {
    _id: 'default-squat',
    name: 'Squats',
    category: 'legs',
    target: 'legs',
    equipment: 'bodyweight',
    description: 'Compound lower-body lift for glutes, quads, and strength.',
    images: [gifPool[3], gifPool[0]],
  },
  {
    _id: 'default-lunge',
    name: 'Lunges',
    category: 'legs',
    target: 'glutes',
    equipment: 'bodyweight',
    description: 'Unilateral leg drive for balance, control, and lower-body endurance.',
    images: [gifPool[5], gifPool[2]],
  },
  {
    _id: 'default-rdl',
    name: 'Romanian Deadlifts',
    category: 'legs',
    target: 'hamstrings',
    equipment: 'dumbbells',
    description: 'Hip hinge movement that targets posterior chain strength and glutes.',
    images: [gifPool[4], gifPool[1]],
  },
  {
    _id: 'default-leg-extension',
    name: 'Leg Extension',
    category: 'legs',
    target: 'quads',
    equipment: 'machine',
    description: 'Machine-based quad isolation that builds knee extension strength.',
    images: [gifPool[0], gifPool[3]],
  },
  {
    _id: 'default-calf-raises',
    name: 'Calf Raises',
    category: 'legs',
    target: 'calves',
    equipment: 'bodyweight',
    description: 'Simple calf-building movement for lower-leg strength and posture.',
    images: [gifPool[2], gifPool[5]],
  },
  {
    _id: 'default-plank',
    name: 'Planks',
    category: 'core',
    target: 'core',
    equipment: 'bodyweight',
    description: 'Core stability hold to improve posture, bracing, and endurance.',
    images: [gifPool[1], gifPool[4]],
  },
  {
    _id: 'default-russian-twist',
    name: 'Russian Twists',
    category: 'core',
    target: 'obliques',
    equipment: 'medicine ball',
    description: 'Rotational core movement for obliques, balance, and trunk control.',
    images: [gifPool[3], gifPool[0]],
  },
  {
    _id: 'default-leg-raise',
    name: 'Leg Raises',
    category: 'core',
    target: 'lower abs',
    equipment: 'bodyweight',
    description: 'Lower-abs emphasis with controlled tempo and tight core bracing.',
    images: [gifPool[5], gifPool[4]],
  },
  {
    _id: 'default-bicycle-crunch',
    name: 'Bicycle Crunches',
    category: 'core',
    target: 'abs',
    equipment: 'bodyweight',
    description: 'Alternating rotation and knee drive for total abdominal engagement.',
    images: [gifPool[2], gifPool[1]],
  },
  {
    _id: 'default-mountain-climber',
    name: 'Mountain Climbers',
    category: 'core',
    target: 'core',
    equipment: 'bodyweight',
    description: 'Dynamic cardio-core movement combining core bracing with full-body pace.',
    images: [gifPool[0], gifPool[3]],
  },
  {
    _id: 'default-pull-up',
    name: 'Pull-ups',
    category: 'back',
    target: 'back',
    equipment: 'pull-up bar',
    description: 'Vertical pull for lats, upper back, and grip strength.',
    images: [gifPool[2], gifPool[5]],
  },
  {
    _id: 'default-lat-pulldown',
    name: 'Lat Pulldowns',
    category: 'back',
    target: 'lats',
    equipment: 'machine',
    description: 'Machine-assisted pull for strong back width and upper-body control.',
    images: [gifPool[4], gifPool[0]],
  },
  {
    _id: 'default-bicep-curl',
    name: 'Bicep Curls',
    category: 'arms',
    target: 'biceps',
    equipment: 'dumbbells',
    description: 'Classic arm builder focused on elbow flexion and arm isolation.',
    images: [gifPool[1], gifPool[3]],
  },
  {
    _id: 'default-tricep-dips',
    name: 'Tricep Dips',
    category: 'arms',
    target: 'triceps',
    equipment: 'bench',
    description: 'Pressing variation that emphasizes triceps and shoulder stability.',
    images: [gifPool[5], gifPool[2]],
  },
  {
    _id: 'default-hammer-curl',
    name: 'Hammer Curls',
    category: 'arms',
    target: 'forearms',
    equipment: 'dumbbells',
    description: 'Neutral-grip curl for biceps, brachialis, and forearm endurance.',
    images: [gifPool[3], gifPool[4]],
  },
  {
    _id: 'default-jumping-jacks',
    name: 'Jumping Jacks',
    category: 'cardio',
    target: 'cardio',
    equipment: 'bodyweight',
    description: 'Full-body warmup for heart rate, rhythm, and conditioning.',
    images: [gifPool[0], gifPool[2]],
  },
  {
    _id: 'default-burpees',
    name: 'Burpees',
    category: 'cardio',
    target: 'full body',
    equipment: 'bodyweight',
    description: 'High-intensity full body conditioner for power and endurance.',
    images: [gifPool[1], gifPool[5]],
  },
  {
    _id: 'default-high-knees',
    name: 'High Knees',
    category: 'cardio',
    target: 'cardio',
    equipment: 'bodyweight',
    description: 'Fast lower-body conditioning drill that elevates heart rate quickly.',
    images: [gifPool[3], gifPool[1]],
  },
  {
    _id: 'default-rope-jumping',
    name: 'Rope Jumping',
    category: 'cardio',
    target: 'cardio',
    equipment: 'jump rope',
    description: 'Rhythmic cardio move that supports conditioning and coordination.',
    images: [gifPool[4], gifPool[2]],
  },
];

// Sub-component para sa Auto-Looping Animation (Frame 0 <-> Frame 1)
function ExerciseAnimator({ images, name }) {
  const [currentFrame, setCurrentFrame] = useState(0);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
    if (!images || images.length <= 1) return;

    // Magpalit ng frame bawat 600ms para magmukhang totoong animated GIF
    const timer = setInterval(() => {
      setCurrentFrame((prev) => (prev + 1) % images.length);
    }, 600);

    return () => clearInterval(timer);
  }, [images]);

  if (!images || images.length === 0 || imageFailed) {
    return (
      <div className="text-slate-600 flex flex-col items-center gap-2">
        <Dumbbell className="w-10 h-10 opacity-40" />
        <span className="text-xs">No Animation Preview</span>
      </div>
    );
  }

  const currentImgUrl = images[currentFrame]?.startsWith('http') || images[currentFrame]?.startsWith('data:')
    ? images[currentFrame]
    : `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${images[currentFrame]}`;

  return (
    <div className="relative w-full h-full bg-slate-950 flex items-center justify-center overflow-hidden">
      <img
        src={currentImgUrl}
        alt={name}
        loading="lazy"
        onError={() => setImageFailed(true)}
        className="w-full h-full object-contain p-2 transition-all duration-200"
      />
      
      {/* Live Motion Badge */}
      <div className="absolute bottom-2 right-2 bg-amber-500/90 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 uppercase tracking-wider shadow-lg">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-ping" />
        <span>Loop Motion ({currentFrame + 1}/{images.length})</span>
      </div>
    </div>
  );
}

export default function WorkoutPage() {
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [durationMinutes, setDurationMinutes] = useState('30');
  const [intensity, setIntensity] = useState('moderate');
  const [loggingWorkout, setLoggingWorkout] = useState(false);
  const [workoutMessage, setWorkoutMessage] = useState('');
  const itemsPerPage = 12;

  useEffect(() => {
    const loadExercises = async () => {
      try {
        const { data } = await api.get('/exercises?limit=300');
        const nextExercises = Array.isArray(data) && data.length ? data : defaultExerciseCatalog;
        setExercises(nextExercises);
      } catch (error) {
        console.error('Error fetching exercise database:', error);
        setExercises(defaultExerciseCatalog);
      } finally {
        setLoading(false);
      }
    };

    loadExercises();
  }, []);

  const normalizeCategory = (value = '') => String(value).trim().toLowerCase().replace(/[^a-z]/g, '');
  const formatCategoryLabel = (value = '') => String(value).replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

  const categories = useMemo(() => {
    const set = new Set(exercises.map((item) => normalizeCategory(item.category)).filter(Boolean));
    return ['all', ...Array.from(set)];
  }, [exercises]);

  const filteredExercises = useMemo(() => {
    return exercises.filter((ex) => {
      const normalizedCategory = normalizeCategory(ex.category);
      const matchesSearch =
        ex.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (ex.target && ex.target.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = selectedCategory === 'all' || normalizedCategory === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [exercises, searchTerm, selectedCategory]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory]);

  const totalPages = Math.ceil(filteredExercises.length / itemsPerPage);
  const displayedExercises = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredExercises.slice(start, start + itemsPerPage);
  }, [filteredExercises, currentPage]);

  const handleLogWorkout = async (event) => {
    event.preventDefault();
    const userId = getStoredUserId();
    if (!userId || !selectedExercise) {
      setWorkoutMessage('Please sign in before logging a workout.');
      return;
    }

    setLoggingWorkout(true);
    setWorkoutMessage('');
    try {
      const { data } = await api.post('/workouts', {
        userAccount: userId,
        exerciseName: selectedExercise.name,
        durationMinutes: Number(durationMinutes),
        intensity,
      });
      setWorkoutMessage(`Logged successfully — ${data.caloriesBurned} kcal burned.`);
      window.dispatchEvent(new CustomEvent('workout-logged'));
    } catch (error) {
      setWorkoutMessage(error.response?.data?.message || 'Unable to log this workout.');
    } finally {
      setLoggingWorkout(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-4">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-extrabold text-slate-100 flex items-center justify-center gap-2">
          <Dumbbell className="w-8 h-8 text-yellow-300" />
          <span>Animated Workout Guide</span>
        </h1>
        <p className="text-slate-400">Gumagalaw na frame-by-frame exercise guides at target muscles.</p>
      </div>

      {/* Controls */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search exercise or muscle..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-11 pr-4 py-2.5 text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-amber-500 outline-none text-sm"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full md:w-56 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:ring-2 focus:ring-amber-500 outline-none capitalize"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'All Categories' : formatCategoryLabel(cat)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-center py-20 space-y-3">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-400 text-sm">Loading animated exercises...</p>
        </div>
      ) : displayedExercises.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedExercises.map((exercise, index) => (
            <div
              key={exercise._id || exercise.id || `${exercise.name}-${index}`}
              className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl overflow-hidden shadow-xl transition-all hover:-translate-y-1 flex flex-col justify-between"
            >
              {/* Moving Frame Container */}
              <div className="w-full h-56 border-b border-slate-800/80">
                <ExerciseAnimator images={exercise.images} name={exercise.name} />
              </div>

              {/* Details */}
              <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-100 capitalize line-clamp-1">{exercise.name}</h3>
                  <p className="text-xs text-slate-400 mt-1 capitalize">Equipment: {exercise.equipment || 'Bodyweight'}</p>
                  {exercise.description && (
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-400">{exercise.description}</p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800/80">
                  {exercise.category && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-lg capitalize">
                      <Flame className="w-3 h-3" />
                      {formatCategoryLabel(exercise.category)}
                    </span>
                  )}

                  {exercise.target && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-yellow-500/10 text-yellow-300 border border-yellow-500/20 px-2.5 py-1 rounded-lg capitalize">
                      <Activity className="w-3 h-3" />
                      {exercise.target}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedExercise(exercise);
                    setWorkoutMessage('');
                  }}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-300 px-4 py-2.5 text-xs font-bold text-slate-950 transition hover:from-amber-600 hover:to-yellow-400"
                >
                  <Clock className="h-4 w-4" />
                  Record workout
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-slate-900/50 border border-slate-800 rounded-2xl">
          <p className="text-slate-400">Walang nahanap na exercise sa iyong search key.</p>
        </div>
      )}

      {selectedExercise && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <form onSubmit={handleLogWorkout} className="w-full max-w-md space-y-5 rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-400">Workout tracker</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-100">{selectedExercise.name}</h2>
              <p className="mt-1 text-sm text-slate-400">Calories are calculated from your profile weight, sets, and reps.</p>
              {Array.isArray(selectedExercise.instructions) && selectedExercise.instructions.length > 0 && (
                <ol className="mt-4 list-decimal space-y-1 pl-5 text-xs leading-5 text-slate-400">
                  {selectedExercise.instructions.slice(0, 5).map((instruction) => (
                    <li key={instruction}>{instruction}</li>
                  ))}
                </ol>
              )}
            </div>
            <label className="block text-sm font-semibold text-slate-300">
              Duration (minutes)
              <input
                type="number"
                min="1"
                max="360"
                value={durationMinutes}
                onChange={(event) => setDurationMinutes(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 outline-none focus:ring-2 focus:ring-amber-500"
              />
            </label>
            <label className="block text-sm font-semibold text-slate-300">
              Intensity
              <select
                value={intensity}
                onChange={(event) => setIntensity(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="light">Light</option>
                <option value="moderate">Moderate</option>
                <option value="vigorous">Vigorous</option>
              </select>
            </label>
            {workoutMessage && <p className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-300"><CheckCircle2 className="h-4 w-4" />{workoutMessage}</p>}
            <div className="flex gap-3">
              <button type="submit" disabled={loggingWorkout} className="flex-1 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-300 px-4 py-2.5 text-sm font-bold text-slate-950 disabled:opacity-60">
                {loggingWorkout ? 'Saving...' : 'Save workout'}
              </button>
              <button type="button" onClick={() => setSelectedExercise(null)} className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-200">
                Close
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-4">
          <button
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 border border-slate-700 transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-xs font-semibold text-slate-300">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 border border-slate-700 transition-all"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}