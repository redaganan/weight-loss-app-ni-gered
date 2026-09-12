require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { connectDB } = require('./src/config/db');
const Exercise = require('./src/models/Exercise');
const userRoutes = require('./src/routes/userRoutes');

const gifPool = [
  'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif',
  'https://media.giphy.com/media/3o7TKVM8B6zoA0s0hW/giphy.gif',
  'https://media.giphy.com/media/26BRqC7b9LZUz7FgY/giphy.gif',
  'https://media.giphy.com/media/8kqlzJkfk0r1Ew4D4z/giphy.gif',
  'https://media.giphy.com/media/7rj2Zg7n5hWnK/giphy.gif',
  'https://media.giphy.com/media/xT0xeJpnrWC4XWblEk/giphy.gif',
];

const defaultExercises = [
  {
    name: 'Push-ups',
    category: 'chest',
    target: 'chest',
    equipment: 'bodyweight',
    description: 'Classic upper-body push movement for chest, shoulders, and triceps.',
    images: [gifPool[0], gifPool[1]],
  },
  {
    name: 'Squats',
    category: 'legs',
    target: 'legs',
    equipment: 'bodyweight',
    description: 'Lower-body strength move that targets the quads, glutes, and hamstrings.',
    images: [gifPool[2], gifPool[3]],
  },
  {
    name: 'Planks',
    category: 'core',
    target: 'core',
    equipment: 'bodyweight',
    description: 'Core stabilization and anti-extension hold for posture and endurance.',
    images: [gifPool[4], gifPool[5]],
  },
  {
    name: 'Lunges',
    category: 'legs',
    target: 'glutes',
    equipment: 'bodyweight',
    description: 'Single-leg stability and lower-body strength movement.',
    images: [gifPool[1], gifPool[2]],
  },
  {
    name: 'Jumping Jacks',
    category: 'cardio',
    target: 'cardio',
    equipment: 'bodyweight',
    description: 'Simple full-body cardio move to elevate your heart rate.',
    images: [gifPool[3], gifPool[4]],
  },
  {
    name: 'Bench Press',
    category: 'chest',
    target: 'chest',
    equipment: 'barbell',
    description: 'Barbell press for upper-body pushing power and chest strength.',
    images: [gifPool[5], gifPool[0]],
  },
  {
    name: 'Dumbbell Flyes',
    category: 'chest',
    target: 'chest',
    equipment: 'dumbbells',
    description: 'Chest isolation movement with a full stretch and controlled contraction.',
    images: [gifPool[1], gifPool[3]],
  },
  {
    name: 'Incline Press',
    category: 'chest',
    target: 'upper chest',
    equipment: 'barbell',
    description: 'Incline pattern that emphasizes upper chest and shoulders.',
    images: [gifPool[2], gifPool[4]],
  },
  {
    name: 'Romanian Deadlifts',
    category: 'legs',
    target: 'hamstrings',
    equipment: 'dumbbells',
    description: 'Hip-hinge movement to strengthen glutes and hamstrings.',
    images: [gifPool[5], gifPool[1]],
  },
  {
    name: 'Leg Extension',
    category: 'legs',
    target: 'quads',
    equipment: 'machine',
    description: 'Isolated quad movement for stronger knee extension control.',
    images: [gifPool[0], gifPool[2]],
  },
  {
    name: 'Calf Raises',
    category: 'legs',
    target: 'calves',
    equipment: 'bodyweight',
    description: 'Lower-leg strength and balance builder for calves and ankles.',
    images: [gifPool[4], gifPool[3]],
  },
  {
    name: 'Russian Twists',
    category: 'core',
    target: 'obliques',
    equipment: 'medicine ball',
    description: 'Rotational core drill for trunk stability and obliques.',
    images: [gifPool[1], gifPool[5]],
  },
  {
    name: 'Leg Raises',
    category: 'core',
    target: 'lower abs',
    equipment: 'bodyweight',
    description: 'Lower-ab isolation with strict control and pelvic stability.',
    images: [gifPool[2], gifPool[0]],
  },
  {
    name: 'Bicycle Crunches',
    category: 'core',
    target: 'abs',
    equipment: 'bodyweight',
    description: 'Alternating crunch and rotation pattern for total abdominal engagement.',
    images: [gifPool[3], gifPool[1]],
  },
  {
    name: 'Mountain Climbers',
    category: 'core',
    target: 'core',
    equipment: 'bodyweight',
    description: 'Dynamic cardio-core move that spikes heart rate while bracing the abs.',
    images: [gifPool[5], gifPool[4]],
  },
  {
    name: 'Pull-ups',
    category: 'back',
    target: 'back',
    equipment: 'pull-up bar',
    description: 'Vertical pull for lats, upper back, and forearm grip strength.',
    images: [gifPool[0], gifPool[4]],
  },
  {
    name: 'Lat Pulldowns',
    category: 'back',
    target: 'lats',
    equipment: 'machine',
    description: 'Machine-driven vertical pull for a strong, wide back.',
    images: [gifPool[1], gifPool[2]],
  },
  {
    name: 'Bicep Curls',
    category: 'arms',
    target: 'biceps',
    equipment: 'dumbbells',
    description: 'Classic elbow flexion drill for stronger arms and biceps peaks.',
    images: [gifPool[3], gifPool[5]],
  },
  {
    name: 'Tricep Dips',
    category: 'arms',
    target: 'triceps',
    equipment: 'bench',
    description: 'Bodyweight triceps movement focused on pressing power and arm lockout.',
    images: [gifPool[2], gifPool[1]],
  },
  {
    name: 'Hammer Curls',
    category: 'arms',
    target: 'forearms',
    equipment: 'dumbbells',
    description: 'Neutral-grip curl for biceps, brachialis, and forearm endurance.',
    images: [gifPool[4], gifPool[0]],
  },
  {
    name: 'Burpees',
    category: 'cardio',
    target: 'full body',
    equipment: 'bodyweight',
    description: 'Explosive conditioning move combining squat thrust and jump.',
    images: [gifPool[5], gifPool[1]],
  },
  {
    name: 'High Knees',
    category: 'cardio',
    target: 'cardio',
    equipment: 'bodyweight',
    description: 'Fast lower-body conditioning drill that raises heart rate quickly.',
    images: [gifPool[0], gifPool[3]],
  },
  {
    name: 'Rope Jumping',
    category: 'cardio',
    target: 'cardio',
    equipment: 'jump rope',
    description: 'Rhythmic cardio movement for conditioning and coordination.',
    images: [gifPool[2], gifPool[5]],
  },
];

const app = express();
const DEFAULT_PORT = Number(process.env.PORT) || 5000;
const FALLBACK_PORT = Number(process.env.PORT) ? Number(process.env.PORT) + 1 : 5001;

async function seedDefaultExercises() {
  try {
    const operations = defaultExercises.map((exercise) => ({
      updateOne: {
        filter: { name: exercise.name },
        update: {
          $set: {
            ...exercise,
            images: Array.isArray(exercise.images) ? exercise.images : [exercise.images],
          },
        },
        upsert: true,
      },
    }));

    const result = await Exercise.bulkWrite(operations, { ordered: false });
    console.log(`Exercise library sync complete: ${result.upsertedCount + result.modifiedCount} records ensured.`);
  } catch (error) {
    console.error('Exercise seed failed:', error.message);
  }
}

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.json({ message: 'Weightloss backend is running' });
});

app.use('/api', userRoutes);

function listenOnPort(port) {
  const server = app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      const nextPort = port === DEFAULT_PORT ? FALLBACK_PORT : port + 1;
      console.warn(`Port ${port} is busy. Retrying on ${nextPort}`);
      listenOnPort(nextPort);
      return;
    }

    console.error('Failed to start server:', error.message);
    process.exit(1);
  });
}

async function startServer() {
  try {
    await connectDB();
    await seedDefaultExercises();
    listenOnPort(DEFAULT_PORT);
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();
