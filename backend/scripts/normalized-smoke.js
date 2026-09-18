require('dotenv').config();

const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const MealLog = require('../src/models/MealLog');
const WorkoutLog = require('../src/models/WorkoutLog');
const PlanDay = require('../src/models/PlanDay');
const FitnessPlan = require('../src/models/FitnessPlan');
const PlanMeal = require('../src/models/PlanMeal');
const PlanExercise = require('../src/models/PlanExercise');
const UserProfile = require('../src/models/UserProfile');
const UserAccount = require('../src/models/UserAccount');

const baseUrl = process.env.SMOKE_BASE_URL || 'http://localhost:5000/api';

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const body = await response.json().catch(() => null);
  assert.equal(response.ok, true, `${options.method || 'GET'} ${path} returned ${response.status}: ${JSON.stringify(body)}`);
  return body;
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/weightloss');
  const user = await mongoose.connection.db.collection('useraccounts').findOne({}, { projection: { _id: 1 } });
  assert.ok(user, 'A test user is required in the connected database.');

  const userId = String(user._id);
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '5m' });
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const beforeMeals = await MealLog.countDocuments({ userAccount: user._id });
  const beforeWorkouts = await WorkoutLog.countDocuments({ userAccount: user._id });
  const testStartedAt = new Date();
  const originalProfile = await UserProfile.findOne({ userAccount: user._id }).lean();
  const originalActivePlan = await FitnessPlan.findOne({
    userProfile: originalProfile._id,
    status: 'active',
  }).lean();
  const setupEmail = `normalized-smoke-${Date.now()}@example.com`;
  const setupOtpToken = jwt.sign(
    { email: setupEmail, purpose: 'register', verified: true },
    process.env.JWT_SECRET,
    { expiresIn: '5m' },
  );
  const setup = await request('/user/setup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      account: {
        name: 'Normalized Smoke User',
        email: setupEmail,
        password: 'SmokeTestPassword123',
        otpToken: setupOtpToken,
      },
      profile: {
        name: 'Normalized Smoke User',
        age: 30,
        gender: 'male',
        height: 175,
        weight: 80,
        goalWeight: 72,
        timelineWeeks: 12,
        activityLevel: 'moderate',
        dietPreference: 'balanced',
      },
    }),
  });
  const setupUserId = setup.userAccount?._id;
  const setupProfileId = setup.userProfile?._id;
  assert.ok(setup.normalizedPlanId, 'Initial setup did not return a normalized plan ID.');
  const setupPlan = await FitnessPlan.findById(setup.normalizedPlanId).lean();
  assert.ok(setupPlan, 'Initial setup did not create FitnessPlan.');
  assert.equal(await PlanDay.countDocuments({ fitnessPlan: setupPlan._id }), 7);
  assert.ok(await PlanMeal.countDocuments({ fitnessPlan: setupPlan._id }) > 0);
  assert.ok(await PlanExercise.countDocuments({
    planDay: { $in: await PlanDay.find({ fitnessPlan: setupPlan._id }).distinct('_id') },
  }) > 0);
  const setupToken = setup.token;
  const setupPlanResponse = await request(`/plan/${setupUserId}`, {
    headers: { Authorization: `Bearer ${setupToken}` },
  });
  assert.equal(setupPlanResponse.weeklyRhythm.length, 7);
  await PlanExercise.deleteMany({ planDay: { $in: await PlanDay.find({ fitnessPlan: setupPlan._id }).distinct('_id') } });
  await PlanMeal.deleteMany({ fitnessPlan: setupPlan._id });
  await PlanDay.deleteMany({ fitnessPlan: setupPlan._id });
  await FitnessPlan.deleteOne({ _id: setupPlan._id });
  await UserProfile.deleteOne({ _id: setupProfileId });
  await UserAccount.deleteOne({ _id: setupUserId });
  const originalWorkoutLinks = await WorkoutLog.find({
    userAccount: user._id,
    planDay: { $ne: null },
    exercise: { $ne: null },
  }).select('_id planDay exercise').lean();
  const beforeWorkoutIds = await WorkoutLog.find({ userAccount: user._id }).distinct('_id');
  const plan = await request(`/plan/${userId}`, { headers });
  const originalRhythm = Array.isArray(plan.weeklyRhythm) ? plan.weeklyRhythm : [];
  assert.ok(originalRhythm.length, 'An active weekly plan is required for planner testing.');
  const plannerRhythm = originalRhythm.map((item) => ({ ...item }));
  plannerRhythm[0] = {
    ...plannerRhythm[0],
    completed: true,
    missed: false,
    status: 'Completed',
  };
  const plannerSave = await request('/user/planner/save', {
    method: 'POST',
    headers,
    body: JSON.stringify({ userId, weeklyRhythm: plannerRhythm }),
  });
  assert.equal(plannerSave.weeklyRhythm[0].completed, true);
  const activePlanDay = await PlanDay.findOne({ day: plannerRhythm[0].day }).sort({ createdAt: -1 }).lean();
  const plannerWorkout = await WorkoutLog.findOne({
    userAccount: user._id,
    source: 'planner',
    scheduledDate: { $gte: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) },
  }).sort({ createdAt: -1 }).lean();
  assert.ok(plannerWorkout, 'Planner save did not create a normalized workout log.');
  assert.ok(plannerWorkout.planDay, 'Planner workout is missing its PlanDay reference.');
  assert.ok(plannerWorkout.exercise, 'Planner workout is missing its Exercise reference.');
  assert.ok(activePlanDay?.completed, 'PlanDay completion state was not synchronized.');
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const previousDay = dayNames[(new Date().getDay() + 6) % 7];
  const pastDayRhythm = originalRhythm.map((item) => (
    item.day === previousDay
      ? { ...item, completed: false, missed: false, status: 'Planned' }
      : item
  ));
  const pastDaySave = await request('/user/planner/save', {
    method: 'POST',
    headers,
    body: JSON.stringify({ userId, weeklyRhythm: pastDayRhythm }),
  });
  const pastDayResult = pastDaySave.weeklyRhythm.find((item) => item.day === previousDay);
  assert.equal(pastDayResult?.status, 'Missed', 'Past incomplete planner day was not marked missed.');
  const firstCalories = plannerSave.weeklyRhythm[0].caloriesBurned;
  const editedPlannerRhythm = plannerRhythm.map((item, index) => (
    index === 0
      ? {
          ...item,
          completedRepetitions: '10 rounds',
          completedExerciseDetails: [],
        }
      : item
  ));
  const editedPlannerSave = await request('/user/planner/save', {
    method: 'POST',
    headers,
    body: JSON.stringify({ userId, weeklyRhythm: editedPlannerRhythm }),
  });
  assert.notEqual(
    editedPlannerSave.weeklyRhythm[0].caloriesBurned,
    firstCalories,
    'Planner calorie estimate did not respond to edited time and rounds.',
  );
  const reloadedPlan = await request(`/plan/${userId}`, { headers });
  assert.equal(
    reloadedPlan.weeklyRhythm[0].completedRepetitions,
    '10 rounds',
    'Edited completed repetitions were not preserved after reloading the plan.',
  );

  await UserProfile.updateOne(
    { userAccount: user._id },
    {
      $set: {
        weeklyRhythm: originalRhythm,
        'currentPlan.weeklyRhythm': originalRhythm,
      },
    },
  );
  await WorkoutLog.deleteMany({
    userAccount: user._id,
    source: 'planner',
    _id: { $nin: beforeWorkoutIds },
  });
  const remainingWorkoutIds = await WorkoutLog.find({ userAccount: user._id }).distinct('_id');
  assert.ok(
    beforeWorkoutIds.every((workoutId) => remainingWorkoutIds.some((remainingId) => String(remainingId) === String(workoutId))),
    'Existing workout logs were not preserved during planner cleanup.',
  );

  const regenerated = await request('/plan/regenerate', {
    method: 'POST',
    headers,
    body: JSON.stringify({ userId }),
  });
  assert.ok(regenerated.normalizedPlanId, 'Regeneration did not return a normalized plan ID.');
  const regeneratedPlan = await FitnessPlan.findById(regenerated.normalizedPlanId).lean();
  assert.ok(regeneratedPlan, 'Regeneration did not create a FitnessPlan record.');
  assert.ok(regeneratedPlan.version > originalActivePlan.version, 'Plan version did not increment.');
  assert.equal(
    await PlanDay.countDocuments({ fitnessPlan: regeneratedPlan._id }),
    7,
  );
  assert.ok(await PlanMeal.countDocuments({ fitnessPlan: regeneratedPlan._id }) > 0);
  assert.ok(await PlanExercise.countDocuments({
    planDay: { $in: await PlanDay.find({ fitnessPlan: regeneratedPlan._id }).distinct('_id') },
  }) > 0);
  const preservedWorkoutLinks = await WorkoutLog.find({
    _id: { $in: originalWorkoutLinks.map((workout) => workout._id) },
  }).select('_id planDay exercise').lean();
  assert.equal(preservedWorkoutLinks.length, originalWorkoutLinks.length);
  for (const originalWorkout of originalWorkoutLinks) {
    const preservedWorkout = preservedWorkoutLinks.find(
      (workout) => String(workout._id) === String(originalWorkout._id),
    );
    assert.equal(String(preservedWorkout.planDay), String(originalWorkout.planDay));
    assert.equal(String(preservedWorkout.exercise), String(originalWorkout.exercise));
  }
  await PlanExercise.deleteMany({ planDay: { $in: await PlanDay.find({ fitnessPlan: regeneratedPlan._id }).distinct('_id') } });
  await PlanMeal.deleteMany({ fitnessPlan: regeneratedPlan._id });
  await PlanDay.deleteMany({ fitnessPlan: regeneratedPlan._id });
  await FitnessPlan.deleteOne({ _id: regeneratedPlan._id });
  await FitnessPlan.updateOne({ _id: originalActivePlan._id }, { $set: { status: 'active' } });
  await UserProfile.replaceOne({ _id: originalProfile._id }, originalProfile);

  const meal = await request('/meals', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      userAccount: userId,
      foodName: 'Normalized smoke-test meal',
      calories: 123,
      protein: 10,
      carbs: 12,
      fat: 4,
      portionSize: '1 test portion',
    }),
  });
  const workout = await request('/workouts', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      userAccount: userId,
      exerciseName: 'Squats',
      durationMinutes: 5,
      intensity: 'light',
    }),
  });

  const mealId = meal.meal?._id || meal._id;
  const workoutId = workout.workout?.normalizedId || workout.workout?._id;
  assert.ok(mealId, 'Meal endpoint did not return a normalized meal ID.');
  assert.ok(workoutId, 'Workout endpoint did not return a normalized workout ID.');

  const [meals, history, analytics] = await Promise.all([
    request(`/meals/${userId}`, { headers }),
    request(`/history/${userId}`, { headers }),
    request(`/analytics/${userId}?range=week`, { headers }),
  ]);
  assert.ok(meals.some((entry) => String(entry._id) === String(mealId)));
  assert.ok(history.history.some((entry) => String(entry._id).includes(String(workoutId))));
  assert.ok(Number(analytics.summary.workouts) >= 1);

  const deleteResponse = await fetch(`${baseUrl}/workouts/workout-${workoutId}`, {
    method: 'DELETE',
    headers,
  });
  assert.equal(deleteResponse.ok, true, `Workout deletion returned ${deleteResponse.status}.`);

  await MealLog.deleteOne({ _id: mealId, userAccount: user._id });
  assert.equal(await MealLog.countDocuments({ userAccount: user._id }), beforeMeals);
  assert.equal(await WorkoutLog.countDocuments({ userAccount: user._id }), beforeWorkouts);

  console.log(JSON.stringify({
    passed: true,
    checks: ['initial-setup-normalization', 'planner-completion-links', 'plan-regeneration-versioning', 'activity-links-preserved', 'meal-create', 'workout-create', 'normalized-read', 'analytics-read', 'history-read', 'workout-delete', 'cleanup'],
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState) await mongoose.disconnect();
  });
