const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const bcrypt = require('bcryptjs');
const router = express.Router();
const UserAccount = require('../models/UserAccount');
const UserProfile = require('../models/UserProfile');
const Exercise = require('../models/Exercise');
const Meal = require('../models/Meal');
const RecommendationHistory = require('../models/RecommendationHistory');
const WeightLog = require('../models/WeightLog');
const { createToken, requireAuth, requireUserMatch } = require('../middleware/auth');

function calculateMacros(profile) {
  const weight = Number(profile.weight) || 70;
  const height = Number(profile.height) || 170;
  const age = Number(profile.age) || 25;
  const isMale = profile.gender === 'male';

  let bmr = 10 * weight + 6.25 * height - 5 * age + (isMale ? 5 : -161);
  const multipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };

  let tdee = bmr * (multipliers[profile.activityLevel] || 1.55);

  if (Number(profile.goalWeight) < weight) {
    tdee -= 450;
  }

  const calories = Math.round(tdee);
  const protein = Math.round((calories * 0.3) / 4);
  const carbs = Math.round((calories * 0.4) / 4);
  const fat = Math.round((calories * 0.3) / 9);

  return { calories, protein, carbs, fat };
}

function calculateProgress(profile) {
  const startWeight = Number(profile.startWeight || profile.weight || 0);
  const currentWeight = Number(profile.weight || startWeight || 0);
  const goalWeight = Number(profile.goalWeight || currentWeight || 0);

  if (![startWeight, currentWeight, goalWeight].every((value) => Number.isFinite(value) && value > 0)) {
    return 0;
  }

  const totalChange = Math.abs(goalWeight - startWeight);
  if (totalChange === 0) return Math.abs(currentWeight - goalWeight) <= 0.1 ? 100 : 0;

  const ratio = goalWeight < startWeight
    ? (startWeight - currentWeight) / totalChange
    : (currentWeight - startWeight) / totalChange;
  return Number(Math.min(100, Math.max(0, ratio * 100)).toFixed(1));
}

function buildWeeklyRhythm(profile, mealPlan = []) {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const workoutTemplates = [
    { focus: 'Strength power', workout: 'Upper-body power circuit', duration: '35 mins' },
    { focus: 'Cardio burn', workout: 'HIIT intervals + sprint blocks', duration: '25 mins' },
    { focus: 'Core stability', workout: 'Plank + anti-rotation sequence', duration: '20 mins' },
    { focus: 'Lower-body strength', workout: 'Leg drive + squat progression', duration: '35 mins' },
    { focus: 'Conditioning', workout: 'Rowing or brisk incline walk', duration: '30 mins' },
    { focus: 'Recovery', workout: 'Mobility flow + light cardio', duration: '20 mins' },
    { focus: 'Reset', workout: 'Rest + walk + stretch routine', duration: 'Optional' },
  ];

  return days.map((day, index) => {
    const meal = mealPlan[index % mealPlan.length] || {
      name: 'Lean protein bowl',
      instructions: 'Balance protein, greens, and smart carbs around your training block.',
    };

    return {
      day,
      workoutFocus: workoutTemplates[index].focus,
      workout: workoutTemplates[index].workout,
      duration: workoutTemplates[index].duration,
      meal: meal.name,
      nutritionStrategy: `${profile?.dietPreference || 'balanced'} nutrition focus with ${meal.name} and steady hydration for recovery.`,
      status: index === 6 ? 'Recovery' : index >= 4 ? 'Planned' : 'On track',
    };
  });
}

function buildMealPlan(profile) {
  const macros = calculateMacros(profile);

  return [
    {
      type: 'Breakfast',
      name: 'High Protein Oat Bowl',
      calories: Math.round(macros.calories * 0.25),
      protein: Math.round(macros.protein * 0.25),
      carbs: Math.round(macros.carbs * 0.35),
      fat: Math.round(macros.fat * 0.2),
      instructions: 'Oats with Greek yogurt, berries, chia seeds, and almond milk.',
    },
    {
      type: 'Lunch',
      name: 'Lean Protein Rice Bowl',
      calories: Math.round(macros.calories * 0.35),
      protein: Math.round(macros.protein * 0.4),
      carbs: Math.round(macros.carbs * 0.35),
      fat: Math.round(macros.fat * 0.3),
      instructions: 'Grilled chicken or tofu served with rice, greens, and roasted vegetables.',
    },
    {
      type: 'Snack',
      name: 'Protein Shake + Nuts',
      calories: Math.round(macros.calories * 0.15),
      protein: Math.round(macros.protein * 0.2),
      carbs: Math.round(macros.carbs * 0.1),
      fat: Math.round(macros.fat * 0.3),
      instructions: 'Blend whey protein with water and pair with a small handful of nuts.',
    },
    {
      type: 'Dinner',
      name: 'Salmon Quinoa Plate',
      calories: Math.round(macros.calories * 0.25),
      protein: Math.round(macros.protein * 0.15),
      carbs: Math.round(macros.carbs * 0.2),
      fat: Math.round(macros.fat * 0.2),
      instructions: 'Baked salmon with quinoa, asparagus, and a lemon-herb drizzle.',
    },
  ];
}

function buildFallbackWorkoutPlan(profile, mealPlan = buildMealPlan(profile)) {
  const focus = profile?.goalWeight && profile?.weight ? (Number(profile.goalWeight) < Number(profile.weight) ? 'fat loss' : 'muscle retention') : 'overall fitness';
  const weeklyRhythm = buildWeeklyRhythm(profile, mealPlan);

  return {
workoutPlan: weeklyRhythm.map((item) => ({
  day: item.day,
  focus: item.workoutFocus,
  workout: item.workout,
  duration: item.duration,
})),
weeklyRhythm,
focus,
summary: `A balanced weekly plan for ${profile?.name || 'your'} goals with emphasis on ${focus}.`,
  };
}

function parseGeminiJson(rawText) {
  if (!rawText) return null;

  try {
    const cleaned = String(rawText).replace(/```json|```/gi, '').trim();
    return JSON.parse(cleaned);
  } catch (error) {
    const match = String(rawText).match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (parseError) {
        return null;
      }
    }
    return null;
  }
}

function normalizeScannedMeal(meal) {
  const calories = Number(meal?.calories);
  if (!meal?.foodName || !Number.isFinite(calories) || calories <= 0) return null;

  return {
    foodName: String(meal.foodName).trim(),
    portionSize: String(meal.portionSize || '1 serving').trim(),
    calories: Math.round(calories),
    protein: Math.max(0, Math.round(Number(meal.protein) || 0)),
    carbs: Math.max(0, Math.round(Number(meal.carbs) || 0)),
    fat: Math.max(0, Math.round(Number(meal.fat) || 0)),
    confidence: Number.isFinite(Number(meal.confidence))
      ? Math.min(1, Math.max(0, Number(meal.confidence)))
      : null,
  };
}

async function generateAiPlan(profile) {
  const apiKey = process.env.GEMINI_API_KEY;
  const fallbackMealPlan = buildMealPlan(profile);
  const fallbackPlan = buildFallbackWorkoutPlan(profile, fallbackMealPlan);

  if (!apiKey) {
return {
  mealPlan: fallbackMealPlan,
  workoutPlan: fallbackPlan.workoutPlan,
  weeklyRhythm: fallbackPlan.weeklyRhythm,
  summary: fallbackPlan.summary,
  source: 'fallback',
};
  }

  try {
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });
const prompt = `You are a health and fitness coach. Return ONLY valid JSON with this exact structure:
{
  "summary": "string",
  "mealPlan": [{"type":"Breakfast|Lunch|Snack|Dinner","name":"string","description":"string","calories":number,"protein":number,"carbs":number,"fat":number,"instructions":"string"}],
  "workoutPlan": [{"day":"string","focus":"string","workout":"string","duration":"string"}],
  "weeklyRhythm": [{"day":"string","workoutFocus":"string","workout":"string","duration":"string","meal":"string","nutritionStrategy":"string","status":"string"}]
}
Profile details:
name=${profile?.name || 'Athlete'}
age=${profile?.age || 30}
gender=${profile?.gender || 'male'}
height=${profile?.height || 170}
weight=${profile?.weight || 70}
goalWeight=${profile?.goalWeight || 65}
startWeight=${profile?.startWeight || profile?.weight || 70}
activityLevel=${profile?.activityLevel || 'moderate'}
dietPreference=${profile?.dietPreference || 'balanced'}
timelineWeeks=${profile?.timelineWeeks || 8}
Requirements:
- Tailor the plan to the person's goal, activity level, and diet preference.
- Use realistic daily calories and macros.
- Include a 7-day weekly rhythm with workout focus, meal suggestions, and nutrition strategy.
- Keep each meal title specific and personalized.
`;

const result = await model.generateContent(prompt);
const responseText = result?.response ? await result.response.text() : '';
const parsed = parseGeminiJson(responseText);

if (parsed && Array.isArray(parsed.mealPlan) && Array.isArray(parsed.workoutPlan)) {
  const normalizedWeeklyRhythm = Array.isArray(parsed.weeklyRhythm) && parsed.weeklyRhythm.length
    ? parsed.weeklyRhythm
    : buildWeeklyRhythm(profile, parsed.mealPlan);

  return {
    mealPlan: parsed.mealPlan,
    workoutPlan: parsed.workoutPlan,
    weeklyRhythm: normalizedWeeklyRhythm,
    summary: parsed.summary || 'AI-generated custom plan.',
    source: 'gemini',
  };
}
  } catch (error) {
console.error('Gemini generation failed, using fallback plan:', error.message);
  }

  return {
mealPlan: fallbackMealPlan,
workoutPlan: fallbackPlan.workoutPlan,
weeklyRhythm: fallbackPlan.weeklyRhythm,
summary: fallbackPlan.summary,
source: 'fallback',
  };
}

router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'weightloss-backend' });
});

const exerciseGifPool = [
  'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif',
  'https://media.giphy.com/media/3o7TKVM8B6zoA0s0hW/giphy.gif',
  'https://media.giphy.com/media/26BRqC7b9LZUz7FgY/giphy.gif',
  'https://media.giphy.com/media/8kqlzJkfk0r1Ew4D4z/giphy.gif',
  'https://media.giphy.com/media/7rj2Zg7n5hWnK/giphy.gif',
  'https://media.giphy.com/media/xT0xeJpnrWC4XWblEk/giphy.gif',
];

const exerciseFallbackLibrary = [
  { name: 'Push-ups', category: 'chest', target: 'chest', equipment: 'bodyweight', description: 'Classic upper-body push movement for chest, shoulders, and triceps.', images: [exerciseGifPool[0], exerciseGifPool[1]] },
  { name: 'Squats', category: 'legs', target: 'legs', equipment: 'bodyweight', description: 'Lower-body strength move that targets the quads, glutes, and hamstrings.', images: [exerciseGifPool[2], exerciseGifPool[3]] },
  { name: 'Planks', category: 'core', target: 'core', equipment: 'bodyweight', description: 'Core stabilization and anti-extension hold for posture and endurance.', images: [exerciseGifPool[4], exerciseGifPool[5]] },
  { name: 'Jumping Jacks', category: 'cardio', target: 'cardio', equipment: 'bodyweight', description: 'Simple full-body cardio move to elevate your heart rate.', images: [exerciseGifPool[3], exerciseGifPool[4]] },
  { name: 'Lunges', category: 'legs', target: 'glutes', equipment: 'bodyweight', description: 'Single-leg stability and lower-body strength movement.', images: [exerciseGifPool[1], exerciseGifPool[2]] },
  { name: 'Bench Press', category: 'chest', target: 'chest', equipment: 'barbell', description: 'Barbell press for upper-body pushing power and chest strength.', images: [exerciseGifPool[5], exerciseGifPool[0]] },
  { name: 'Dumbbell Flyes', category: 'chest', target: 'chest', equipment: 'dumbbells', description: 'Chest isolation movement with a full stretch and controlled contraction.', images: [exerciseGifPool[1], exerciseGifPool[3]] },
  { name: 'Incline Press', category: 'chest', target: 'upper chest', equipment: 'barbell', description: 'Incline pattern that emphasizes upper chest and shoulders.', images: [exerciseGifPool[2], exerciseGifPool[4]] },
  { name: 'Romanian Deadlifts', category: 'legs', target: 'hamstrings', equipment: 'dumbbells', description: 'Hip-hinge movement to strengthen glutes and hamstrings.', images: [exerciseGifPool[5], exerciseGifPool[1]] },
  { name: 'Leg Extension', category: 'legs', target: 'quads', equipment: 'machine', description: 'Isolated quad movement for stronger knee extension control.', images: [exerciseGifPool[0], exerciseGifPool[2]] },
  { name: 'Calf Raises', category: 'legs', target: 'calves', equipment: 'bodyweight', description: 'Lower-leg strength and balance builder for calves and ankles.', images: [exerciseGifPool[4], exerciseGifPool[3]] },
  { name: 'Russian Twists', category: 'core', target: 'obliques', equipment: 'medicine ball', description: 'Rotational core drill for trunk stability and obliques.', images: [exerciseGifPool[1], exerciseGifPool[5]] },
  { name: 'Leg Raises', category: 'core', target: 'lower abs', equipment: 'bodyweight', description: 'Lower-ab isolation with strict control and pelvic stability.', images: [exerciseGifPool[2], exerciseGifPool[0]] },
  { name: 'Bicycle Crunches', category: 'core', target: 'abs', equipment: 'bodyweight', description: 'Alternating crunch and rotation pattern for total abdominal engagement.', images: [exerciseGifPool[3], exerciseGifPool[1]] },
  { name: 'Mountain Climbers', category: 'core', target: 'core', equipment: 'bodyweight', description: 'Dynamic cardio-core move that spikes heart rate while bracing the abs.', images: [exerciseGifPool[5], exerciseGifPool[4]] },
  { name: 'Pull-ups', category: 'back', target: 'back', equipment: 'pull-up bar', description: 'Vertical pull for lats, upper back, and forearm grip strength.', images: [exerciseGifPool[0], exerciseGifPool[4]] },
  { name: 'Lat Pulldowns', category: 'back', target: 'lats', equipment: 'machine', description: 'Machine-driven vertical pull for a strong, wide back.', images: [exerciseGifPool[1], exerciseGifPool[2]] },
  { name: 'Bicep Curls', category: 'arms', target: 'biceps', equipment: 'dumbbells', description: 'Classic elbow flexion drill for stronger arms and biceps peaks.', images: [exerciseGifPool[3], exerciseGifPool[5]] },
  { name: 'Tricep Dips', category: 'arms', target: 'triceps', equipment: 'bench', description: 'Bodyweight triceps movement focused on pressing power and arm lockout.', images: [exerciseGifPool[2], exerciseGifPool[1]] },
  { name: 'Hammer Curls', category: 'arms', target: 'forearms', equipment: 'dumbbells', description: 'Neutral-grip curl for biceps, brachialis, and forearm endurance.', images: [exerciseGifPool[4], exerciseGifPool[0]] },
  { name: 'Burpees', category: 'cardio', target: 'full body', equipment: 'bodyweight', description: 'Explosive conditioning move combining squat thrust and jump.', images: [exerciseGifPool[5], exerciseGifPool[1]] },
  { name: 'High Knees', category: 'cardio', target: 'cardio', equipment: 'bodyweight', description: 'Fast lower-body conditioning drill that raises heart rate quickly.', images: [exerciseGifPool[0], exerciseGifPool[3]] },
  { name: 'Rope Jumping', category: 'cardio', target: 'cardio', equipment: 'jump rope', description: 'Rhythmic cardio movement for conditioning and coordination.', images: [exerciseGifPool[2], exerciseGifPool[5]] },
];

router.get('/exercises', async (req, res) => {
  try {
    let exercises = await Exercise.find().limit(24).lean();

    if (exercises.length === 0) {
      const operations = exerciseFallbackLibrary.map((exercise) => ({
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

      await Exercise.bulkWrite(operations, { ordered: false });
      exercises = await Exercise.find().limit(24).lean();
    }

    return res.json(exercises);
  } catch (error) {
    console.error('exercise fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch exercises', error: error.message });
  }
});

router.post('/user/setup', async (req, res) => {
  try {
    const { account, profile } = req.body;

    if (!account || !profile) {
      return res.status(400).json({ message: 'Account and profile payloads are required.' });
    }

    const existingUser = await UserAccount.findOne({ email: account.email.toLowerCase() });

    let userAccount = existingUser;
    if (!userAccount) {
      const password = account.password || account.passwordHash;
      if (!password || String(password).length < 8) {
        return res.status(400).json({ message: 'A password with at least 8 characters is required.' });
      }

      userAccount = await UserAccount.create({
        email: account.email,
        passwordHash: await bcrypt.hash(password, 12),
        name: account.name,
      });
    }

    const userProfile = await UserProfile.findOneAndUpdate(
      { userAccount: userAccount._id },
      {
        userAccount: userAccount._id,
        name: profile.name || account.name,
        age: profile.age,
        gender: profile.gender,
        height: profile.height,
        weight: profile.weight,
        startWeight: profile.startWeight || profile.weight,
        goalWeight: profile.goalWeight,
        timelineWeeks: profile.timelineWeeks,
        activityLevel: profile.activityLevel,
        dietPreference: profile.dietPreference,
        ...calculateMacros(profile),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    const token = createToken(userAccount._id);
    res.status(201).json({
      message: 'User setup saved successfully',
      token,
      userAccount: {
        _id: userAccount._id,
        email: userAccount.email,
        name: userAccount.name,
      },
      userProfile,
    });
  } catch (error) {
    console.error('setup error:', error);
    res.status(500).json({ message: 'Failed to save user setup data', error: error.message });
  }
});

router.use((req, res, next) => {
  if (req.path === '/auth/login' || req.path === '/user/setup') {
    return next();
  }
  return requireAuth(req, res, next);
});

router.put('/user/profile', requireUserMatch, async (req, res) => {
  try {
    const { userId, account = {}, profile = {} } = req.body || {};
    const existingProfile = await UserProfile.findOne({ userAccount: userId });
    if (!existingProfile) {
      return res.status(404).json({ message: 'User profile not found.' });
    }

    const editableFields = [
      'name',
      'age',
      'gender',
      'height',
      'weight',
      'goalWeight',
      'timelineWeeks',
      'activityLevel',
      'dietPreference',
    ];
    const profileUpdates = editableFields.reduce((updates, field) => {
      if (profile[field] !== undefined) updates[field] = profile[field];
      return updates;
    }, {});
    const nextProfile = { ...existingProfile.toObject(), ...profileUpdates };

    const userAccount = await UserAccount.findByIdAndUpdate(
      userId,
      {
        ...(account.name ? { name: account.name.trim() } : {}),
        ...(account.email ? { email: account.email.trim().toLowerCase() } : {}),
      },
      { new: true, runValidators: true },
    );

    if (!userAccount) {
      return res.status(404).json({ message: 'User account not found.' });
    }

    const userProfile = await UserProfile.findOneAndUpdate(
      { userAccount: userId },
      {
        userAccount: userId,
        ...profileUpdates,
        name: profileUpdates.name || userAccount.name,
        startWeight: existingProfile.startWeight || existingProfile.weight,
        ...calculateMacros(nextProfile),
      },
      { new: true, runValidators: true },
    );

    return res.json({
      message: 'Profile updated successfully',
      userAccount: { _id: userAccount._id, name: userAccount.name, email: userAccount.email },
      userProfile,
    });
  } catch (error) {
    console.error('profile update error:', error);
    return res.status(500).json({ message: 'Failed to update profile', error: error.message });
  }
});

router.get('/plan/:userId', requireUserMatch, async (req, res) => {
  try {
    const profileDoc = await UserProfile.findOne({ userAccount: req.params.userId }).populate('userAccount');

    if (!profileDoc) {
      return res.status(404).json({ message: 'No profile found for this user.' });
    }

    const profile = profileDoc.toObject();
    const storedPlan = profile.currentPlan && typeof profile.currentPlan === 'object'
      ? profile.currentPlan
      : {};
    const mealPlan = Array.isArray(storedPlan.mealPlan) && storedPlan.mealPlan.length
      ? storedPlan.mealPlan
      : buildMealPlan(profile);
    const fallbackPlan = buildFallbackWorkoutPlan(profile, mealPlan);
    const weeklyRhythm = Array.isArray(profile.weeklyRhythm) && profile.weeklyRhythm.length
      ? profile.weeklyRhythm
      : Array.isArray(storedPlan.weeklyRhythm) && storedPlan.weeklyRhythm.length
        ? storedPlan.weeklyRhythm
        : fallbackPlan.weeklyRhythm;
    const planPayload = {
      summary: storedPlan.summary || profile.planSummary || fallbackPlan.summary,
      mealPlan,
      workoutPlan: fallbackPlan.workoutPlan,
      weeklyRhythm,
      progress: calculateProgress(profile),
      generatedAt: storedPlan.generatedAt || new Date().toISOString(),
    };

    const updatedProfile = await UserProfile.findOneAndUpdate(
      { userAccount: req.params.userId },
      {
        ...profile,
        startWeight: profile.startWeight || profile.weight,
        currentPlan: planPayload,
        weeklyRhythm,
        planSummary: planPayload.summary,
      },
      { new: true },
    ).populate('userAccount');

    res.json({
      user: updatedProfile.userAccount,
      profile: updatedProfile,
      macros: calculateMacros(profile),
      mealPlan,
      workoutPlan: fallbackPlan.workoutPlan,
      weeklyRhythm,
      summary: planPayload.summary,
      progress: calculateProgress(profile),
      recommendationId: null,
    });
  } catch (error) {
    console.error('plan fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch dynamic plan', error: error.message });
  }
});

router.get('/user/:userId/profile', requireUserMatch, async (req, res) => {
  try {
    const profile = await UserProfile.findOne({ userAccount: req.params.userId }).populate('userAccount');

    if (!profile) {
      return res.status(404).json({ message: 'Profile not found.' });
    }

    res.json(profile);
  } catch (error) {
    console.error('profile fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch profile', error: error.message });
  }
});

router.post('/user/planner/save', requireUserMatch, async (req, res) => {
  try {
    const { userId, weeklyRhythm, currentWeight, weight, profileUpdates = {} } = req.body || {};

    if (!userId) {
      return res.status(400).json({ message: 'userId is required.' });
    }

    const profileDoc = await UserProfile.findOne({ userAccount: userId });
    if (!profileDoc) {
      return res.status(404).json({ message: 'Profile not found for this user.' });
    }

    const normalizedRhythm = Array.isArray(weeklyRhythm) && weeklyRhythm.length
      ? weeklyRhythm.map((item, index) => ({
          ...item,
          day: item.day || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][index],
          completed: Boolean(item.completed),
          missed: Boolean(item.missed),
          status: item.completed ? 'Completed' : item.missed ? 'Missed' : (item.status || 'Planned'),
        }))
      : profileDoc.weeklyRhythm || [];

    const nextWeightValue = Number(currentWeight ?? weight ?? profileDoc.weight ?? 0);

    const updatedProfile = await UserProfile.findOneAndUpdate(
      { userAccount: userId },
      {
        ...profileDoc.toObject(),
        ...profileUpdates,
        weight: Number.isFinite(nextWeightValue) && nextWeightValue > 0 ? nextWeightValue : profileDoc.weight,
        lastWeightUpdate: new Date(),
        weeklyRhythm: normalizedRhythm,
        currentPlan: {
          ...(profileDoc.currentPlan || {}),
          weeklyRhythm: normalizedRhythm,
          updatedAt: new Date().toISOString(),
        },
      },
      { new: true },
    );

    await RecommendationHistory.create({
      userAccount: userId,
      type: 'workout_log',
      payload: {
        weeklyRhythm: normalizedRhythm,
        currentWeight: updatedProfile.weight,
        updatedAt: new Date().toISOString(),
      },
    });

    res.json({
      message: 'Planner and weight updates saved successfully',
      profile: updatedProfile,
      weeklyRhythm: updatedProfile.weeklyRhythm,
      progress: calculateProgress(updatedProfile.toObject()),
    });
  } catch (error) {
    console.error('planner save error:', error);
    res.status(500).json({ message: 'Failed to save planner updates', error: error.message });
  }
});

router.post('/weight-logs', requireUserMatch, async (req, res) => {
  try {
    const { userAccount, weight } = req.body || {};
    const numericWeight = Number(weight);

    if (!userAccount || !Number.isFinite(numericWeight) || numericWeight < 20 || numericWeight > 500) {
      return res.status(400).json({ message: 'A valid weight between 20 and 500 kg is required.' });
    }

    const profile = await UserProfile.findOne({ userAccount });
    if (!profile) {
      return res.status(404).json({ message: 'Profile not found for this user.' });
    }

    const weightLog = await WeightLog.create({
      userAccount,
      weight: numericWeight,
    });

    profile.weight = numericWeight;
    profile.lastWeightUpdate = weightLog.loggedAt;
    await profile.save();

    await RecommendationHistory.create({
      userAccount,
      type: 'weight_log',
      payload: {
        weight: numericWeight,
        currentWeight: numericWeight,
        loggedAt: weightLog.loggedAt.toISOString(),
      },
    });

    return res.status(201).json({
      message: 'Weight logged successfully.',
      weightLog,
      profile,
      progress: calculateProgress(profile.toObject()),
    });
  } catch (error) {
    console.error('weight log error:', error);
    return res.status(500).json({ message: 'Failed to save weight log', error: error.message });
  }
});

router.get('/weight-logs/:userId', requireUserMatch, async (req, res) => {
  try {
    const logs = await WeightLog.find({ userAccount: req.params.userId })
      .sort({ loggedAt: -1 })
      .limit(90)
      .lean();
    return res.json(logs);
  } catch (error) {
    console.error('weight history error:', error);
    return res.status(500).json({ message: 'Failed to load weight history', error: error.message });
  }
});

router.get('/analytics/:userId', requireUserMatch, async (req, res) => {
  try {
    const allowedRanges = { '7d': 7, '30d': 30, '90d': 90 };
    const range = allowedRanges[req.query.range] ? req.query.range : '7d';
    const days = allowedRanges[range];
    const profile = await UserProfile.findOne({ userAccount: req.params.userId }).lean();
    if (!profile) return res.status(404).json({ message: 'Profile not found for this user.' });

    const startDate = new Date();
    startDate.setUTCHours(0, 0, 0, 0);
    startDate.setUTCDate(startDate.getUTCDate() - (days - 1));

    const [meals, workouts, weightLogs] = await Promise.all([
      Meal.find({ userAccount: req.params.userId, createdAt: { $gte: startDate } }).lean(),
      RecommendationHistory.find({
        userAccount: req.params.userId,
        type: 'workout_log',
        createdAt: { $gte: startDate },
      }).lean(),
      WeightLog.find({ userAccount: req.params.userId, loggedAt: { $gte: startDate } }).sort({ loggedAt: 1 }).lean(),
    ]);

    const points = Array.from({ length: days }, (_, index) => {
      const date = new Date(startDate);
      date.setUTCDate(startDate.getUTCDate() + index);
      const dateKey = date.toISOString().slice(0, 10);
      return {
        dateKey,
        label: date.toLocaleDateString('en-US', { weekday: 'short' }),
        calories: 0,
        burned: 0,
        workouts: 0,
        weight: null,
      };
    });
    const pointMap = new Map(points.map((point) => [point.dateKey, point]));
    const getPoint = (date) => pointMap.get(new Date(date).toISOString().slice(0, 10));

    meals.forEach((meal) => {
      const point = getPoint(meal.createdAt || meal.date);
      if (point) point.calories += Number(meal.calories) || 0;
    });
    workouts.forEach((entry) => {
      const point = getPoint(entry.createdAt || entry.generatedAt);
      if (point) {
        point.workouts += 1;
        point.burned += Number(entry.payload?.caloriesBurned) || 0;
      }
    });
    weightLogs.forEach((log) => {
      const point = getPoint(log.loggedAt || log.createdAt);
      if (point) point.weight = Number(log.weight) || null;
    });

    let latestWeight = Number(profile.startWeight || profile.weight) || null;
    points.forEach((point) => {
      if (point.weight === null) point.weight = latestWeight;
      else latestWeight = point.weight;
    });

    const caloriesConsumed = points.reduce((total, point) => total + point.calories, 0);
    const caloriesBurned = points.reduce((total, point) => total + point.burned, 0);
    return res.json({
      range,
      days: points,
      summary: {
        caloriesConsumed,
        caloriesBurned,
        netCalories: caloriesConsumed - caloriesBurned,
        workouts: points.reduce((total, point) => total + point.workouts, 0),
        weight: Number(profile.weight) || latestWeight,
      },
      profile,
    });
  } catch (error) {
    console.error('analytics error:', error);
    return res.status(500).json({ message: 'Failed to load analytics', error: error.message });
  }
});

router.post('/workouts', requireUserMatch, async (req, res) => {
  try {
    const { userAccount, exerciseName, durationMinutes, intensity = 'moderate' } = req.body || {};
    const duration = Number(durationMinutes);

    if (!userAccount || !exerciseName || !Number.isFinite(duration) || duration <= 0 || duration > 360) {
      return res.status(400).json({ message: 'userAccount, exerciseName, and a valid duration are required.' });
    }

    const intensityMultipliers = { light: 3.5, moderate: 6, vigorous: 8.5 };
    const met = intensityMultipliers[intensity] || intensityMultipliers.moderate;
    const profile = await UserProfile.findOne({ userAccount }).lean();
    const weight = Number(profile?.weight) || 70;
    const caloriesBurned = Math.round((met * 3.5 * weight * duration) / 200);

    const workout = await RecommendationHistory.create({
      userAccount,
      type: 'workout_log',
      payload: {
        exerciseName,
        durationMinutes: duration,
        intensity,
        caloriesBurned,
        loggedAt: new Date().toISOString(),
      },
    });

    return res.status(201).json({
      message: 'Workout logged successfully',
      workout: workout.toObject(),
      caloriesBurned,
    });
  } catch (error) {
    console.error('workout log error:', error);
    return res.status(500).json({ message: 'Failed to save workout', error: error.message });
  }
});

router.post('/meals', requireUserMatch, async (req, res) => {
  try {
    const { userAccount, foodName, calories, protein, carbs, fat, portionSize } = req.body;

    if (!userAccount || !foodName || !calories) {
      return res.status(400).json({ message: 'userAccount, foodName, and calories are required.' });
    }

    const meal = await Meal.create({
      userAccount,
      foodName,
      calories,
      protein,
      carbs,
      fat,
      portionSize,
    });

    res.status(201).json({ message: 'Meal saved successfully', meal });
  } catch (error) {
    console.error('meal save error:', error);
    res.status(500).json({ message: 'Failed to save meal', error: error.message });
  }
});

router.post('/meals/scan', requireUserMatch, async (req, res) => {
  try {
    const { userAccount, imageData, mimeType } = req.body || {};
    if (!userAccount || !imageData || !['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
      return res.status(400).json({ message: 'A JPEG, PNG, or WEBP food image is required.' });
    }

    const base64Image = String(imageData).replace(/^data:image\/[^;]+;base64,/, '');
    if (!base64Image || base64Image.length > 8_000_000) {
      return res.status(413).json({ message: 'Image is too large. Please upload an image smaller than 6 MB.' });
    }

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.startsWith('replace-with-')) {
      return res.status(503).json({ message: 'AI food scanning is not configured. Use manual meal entry for now.' });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });
    const result = await model.generateContent([
      {
        text: `Analyze this food photo and return ONLY valid JSON:
{
  "foodName": "specific food or meal name",
  "portionSize": "estimated portion",
  "calories": 0,
  "protein": 0,
  "carbs": 0,
  "fat": 0,
  "confidence": 0
}
Estimate calories and macros for the visible portion. Use numbers only for nutrition fields. Confidence must be between 0 and 1. Do not invent a brand.`,
      },
      { inlineData: { data: base64Image, mimeType } },
    ]);
    const parsed = parseGeminiJson(await result.response.text());
    const meal = normalizeScannedMeal(parsed);
    if (!meal) {
      return res.status(422).json({ message: 'The image could not be identified as a meal. Try a clearer food photo.' });
    }

    return res.json({ meal });
  } catch (error) {
    console.error('meal scan error:', error);
    return res.status(502).json({ message: 'Food scanning failed. Try another image or use manual entry.' });
  }
});

router.get('/meals/:userId', requireUserMatch, async (req, res) => {
  try {
    const meals = await Meal.find({ userAccount: req.params.userId }).sort({ createdAt: -1 }).limit(10);
    res.json(meals);
  } catch (error) {
    console.error('meal fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch meals', error: error.message });
  }
});

router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const account = await UserAccount.findOne({ email: String(email).trim().toLowerCase() });
    if (!account) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const storedPassword = String(account.passwordHash || '');
    const isBcryptHash = storedPassword.startsWith('$2a$') || storedPassword.startsWith('$2b$') || storedPassword.startsWith('$2y$');
    const isValid = isBcryptHash
      ? await bcrypt.compare(password, storedPassword)
      : storedPassword === String(password);
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    if (!isBcryptHash) {
      account.passwordHash = await bcrypt.hash(password, 12);
      await account.save();
    }

    const token = createToken(account._id);
    const safeUser = {
      _id: account._id,
      email: account.email,
      name: account.name,
      token,
    };

    return res.json({
      message: 'Login successful',
      token,
      user: safeUser,
    });
  } catch (error) {
    console.error('login error:', error);
    res.status(500).json({ message: 'Failed to login', error: error.message });
  }
});

router.post('/plan/regenerate', requireUserMatch, async (req, res) => {
  try {
    const { userId } = req.body || {};
    if (!userId) {
      return res.status(400).json({ message: 'userId is required.' });
    }

    const profileDoc = await UserProfile.findOne({ userAccount: userId }).populate('userAccount');
    if (!profileDoc) {
      return res.status(404).json({ message: 'No profile found for this user.' });
    }

    const profile = profileDoc.toObject();
    let aiPlan = await generateAiPlan(profile).catch((geminiError) => {
      console.error('Gemini generation failed, generating fallback plan:', geminiError.message);
      const fallbackMealPlan = buildMealPlan(profile);
      const fallback = buildFallbackWorkoutPlan(profile, fallbackMealPlan);
      return {
        summary: fallback.summary,
        mealPlan: fallbackMealPlan,
        workoutPlan: fallback.workoutPlan,
        weeklyRhythm: fallback.weeklyRhythm,
        source: 'fallback',
      };
    });

    const previousRhythm = Array.isArray(profile.weeklyRhythm) ? profile.weeklyRhythm : [];
    const generatedRhythm = Array.isArray(aiPlan.weeklyRhythm)
      ? aiPlan.weeklyRhythm
      : buildWeeklyRhythm(profile, aiPlan.mealPlan);
    const preservedRhythm = generatedRhythm.map((day) => {
      const previousDay = previousRhythm.find((item) => item.day === day.day);
      return previousDay
        ? { ...day, completed: Boolean(previousDay.completed), missed: Boolean(previousDay.missed), status: previousDay.status }
        : day;
    });
    const payload = {
      summary: aiPlan.summary,
      mealPlan: aiPlan.mealPlan,
      workoutPlan: aiPlan.workoutPlan,
      weeklyRhythm: preservedRhythm,
      progress: calculateProgress(profile),
      source: aiPlan.source || 'fallback',
      generatedAt: new Date().toISOString(),
    };

    const updatedProfile = await UserProfile.findOneAndUpdate(
      { userAccount: userId },
      {
        ...profile,
        startWeight: profile.startWeight || profile.weight,
        currentPlan: payload,
        weeklyRhythm: payload.weeklyRhythm,
        planSummary: payload.summary,
      },
      { new: true },
    ).populate('userAccount');

    const recommendation = await RecommendationHistory.create({
      userAccount: userId,
      type: 'ai_plan_regen',
      payload,
    });

    const macros = calculateMacros(profile);
    return res.json({
      message: 'AI plan regenerated successfully',
      profile: updatedProfile,
      user: updatedProfile.userAccount,
      macros,
      mealPlan: payload.mealPlan,
      workoutPlan: payload.workoutPlan,
      weeklyRhythm: payload.weeklyRhythm,
      summary: payload.summary,
      progress: payload.progress,
      recommendationId: recommendation._id,
    });
  } catch (error) {
    console.error('plan regenerate error:', error);

    const fallbackProfile = await UserProfile.findOne({ userAccount: req.body?.userId }).populate('userAccount').catch(() => null);
    if (fallbackProfile) {
      const fallbackMealPlan = buildMealPlan(fallbackProfile.toObject());
      const fallback = buildFallbackWorkoutPlan(fallbackProfile.toObject(), fallbackMealPlan);
      return res.json({
        message: 'AI plan regenerated successfully using fallback logic',
        profile: fallbackProfile,
        user: fallbackProfile.userAccount,
        macros: calculateMacros(fallbackProfile.toObject()),
        mealPlan: fallbackMealPlan,
        workoutPlan: fallback.workoutPlan,
        weeklyRhythm: fallback.weeklyRhythm,
        summary: fallback.summary,
        progress: calculateProgress(fallbackProfile.toObject()),
        recommendationId: null,
      });
    }

    res.status(500).json({ message: 'Failed to regenerate plan', error: error.message });
  }
});

router.post('/recommendations', requireUserMatch, async (req, res) => {
  try {
    const { userAccount, type, payload } = req.body;

    const record = await RecommendationHistory.create({ userAccount, type, payload });
    res.status(201).json({ message: 'Recommendation saved', record });
  } catch (error) {
    console.error('recommendation save error:', error);
    res.status(500).json({ message: 'Failed to save recommendation', error: error.message });
  }
});

router.get('/recommendations/:userId', requireUserMatch, async (req, res) => {
  try {
    const records = await RecommendationHistory.find({ userAccount: req.params.userId }).sort({ createdAt: -1 }).limit(25);
    res.json(records);
  } catch (error) {
    console.error('recommendation fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch recommendations', error: error.message });
  }
});

router.get('/history/:userId', requireUserMatch, async (req, res) => {
  try {
    const profile = await UserProfile.findOne({ userAccount: req.params.userId }).lean();
    const history = await RecommendationHistory.find({ userAccount: req.params.userId }).sort({ createdAt: -1 }).limit(25).lean();
    const meals = await Meal.find({ userAccount: req.params.userId }).sort({ createdAt: -1 }).limit(25).lean();
    const mealHistory = meals.map((meal) => ({
      _id: `meal-${meal._id}`,
      type: 'meal_log',
      payload: {
        foodName: meal.foodName,
        calories: meal.calories,
        protein: meal.protein,
      },
      createdAt: meal.createdAt || meal.date,
    }));
    const combinedHistory = [...history, ...mealHistory]
      .sort((a, b) => new Date(b.createdAt || b.generatedAt) - new Date(a.createdAt || a.generatedAt))
      .slice(0, 40);

    const workoutLogs = history.filter((entry) => (
      entry.type === 'workout_log'
      && (entry.payload?.exerciseName || Array.isArray(entry.payload?.weeklyRhythm))
    )).length;
    const progress = calculateProgress(profile || {});

    res.json({
      profile,
      progress,
      workoutStreak: workoutLogs || 0,
      history: combinedHistory,
    });
  } catch (error) {
    console.error('history fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch history', error: error.message });
  }
});

module.exports = router;
