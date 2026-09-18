require('dotenv').config();
const mongoose = require('mongoose');

const execute = process.argv.includes('--execute');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const legacyMeals = await db.collection('meals').countDocuments({});
  const legacyWorkoutHistory = await db.collection('recommendationhistories').countDocuments({
    type: 'workout_log',
  });

  console.log(JSON.stringify({
    mode: execute ? 'execute' : 'dry-run',
    legacyMeals,
    legacyWorkoutHistory,
  }, null, 2));

  if (execute) {
    const mealsResult = await db.collection('meals').deleteMany({});
    const workoutHistoryResult = await db.collection('recommendationhistories').deleteMany({
      type: 'workout_log',
    });

    console.log(JSON.stringify({
      deletedLegacyMeals: mealsResult.deletedCount,
      deletedLegacyWorkoutHistory: workoutHistoryResult.deletedCount,
    }, null, 2));
  } else {
    console.log('No records were changed. Re-run with --execute to delete these legacy records.');
  }
}

run()
  .catch((error) => {
    console.error('Legacy activity cleanup failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
