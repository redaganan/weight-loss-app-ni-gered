import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Target, Activity, Utensils, ArrowRight } from 'lucide-react';
import { api, getStoredUserId, storeUserSession } from '../services/api';

export default function SetupPage({ onViewDashboard, onViewSetup, isProfileEdit = false }) {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [hasSavedPlan, setHasSavedPlan] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    age: 25,
    gender: 'male',
    height: 170,
    weight: 70,
    goalWeight: 65,
    timelineWeeks: 8,
    activityLevel: 'moderate',
    dietPreference: 'balanced',
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedProfile = localStorage.getItem('userPlanData');
      const savedUserId = getStoredUserId();
      setHasSavedPlan(Boolean(savedProfile || savedUserId));

      if (savedProfile) {
        try {
          const parsed = JSON.parse(savedProfile);
          setFormData((prev) => ({ ...prev, ...parsed }));
        } catch (error) {
          console.error('Unable to parse saved plan:', error);
        }
      }
    }
  }, []);

  const activityOptions = [
    { id: 'sedentary', label: 'Sedentary' },
    { id: 'light', label: 'Light' },
    { id: 'moderate', label: 'Moderate' },
    { id: 'active', label: 'Active' },
    { id: 'very_active', label: 'Very Active' },
  ];

  const dietOptions = [
    { id: 'balanced', label: 'Balanced' },
    { id: 'high_protein', label: 'High Protein' },
    { id: 'low_carb', label: 'Low Carb' },
    { id: 'keto', label: 'Keto' },
    { id: 'vegetarian', label: 'Vegetarian' },
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setIsSubmitting(true);

    try {
      const editableProfile = [
        'name',
        'age',
        'gender',
        'height',
        'weight',
        'goalWeight',
        'timelineWeeks',
        'activityLevel',
        'dietPreference',
      ].reduce((profile, field) => {
        profile[field] = formData[field];
        return profile;
      }, {});
      const payload = {
        account: {
          name: formData.name,
        email: (formData.email || `${formData.name.toLowerCase().replace(/\s+/g, '') || 'user'}@example.com`).trim(),
        },
        profile: editableProfile,
      };

      const userIdForEdit = getStoredUserId();
      let { data } = isProfileEdit && userIdForEdit
        ? await api.put('/user/profile', { userId: userIdForEdit, ...payload })
        : await api.post('/user/setup', payload);
      if (isProfileEdit && userIdForEdit) {
        const regenerated = await api.post('/plan/regenerate', { userId: userIdForEdit });
        data = { ...data, ...regenerated.data };
      }
      const userId = data?.userAccount?._id || data?.userProfile?.userAccount;
      const profile = {
        ...editableProfile,
        email: payload.account.email,
        userId,
        ...(data?.userProfile || {}),
        ...(data?.profile || {}),
      };
      storeUserSession(userId, profile);
      localStorage.setItem('user', JSON.stringify({
        ...(JSON.parse(localStorage.getItem('user') || '{}')),
        _id: userId,
        userId,
        name: formData.name,
        email: payload.account.email,
      }));
      if (data?.token) {
        localStorage.setItem('token', data.token);
      }
      if (onViewDashboard) {
        onViewDashboard();
      } else {
        navigate('/plan');
      }
    } catch (error) {
      console.error('Failed to save setup:', error);
      setSubmitError(error.response?.data?.message || 'Unable to save your plan. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 py-4">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-extrabold text-slate-100">
          {isProfileEdit ? 'Edit Your Profile & Plan' : 'Build Your Fitness Plan'}
        </h1>
        <p className="text-slate-400">
          {isProfileEdit
            ? 'Update your details or goals and refresh your personalized recommendations.'
            : 'Add your details and goals to generate a custom plan.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
            <div className="flex items-center gap-3 text-amber-400 font-bold text-lg border-b border-slate-800 pb-3">
              <User className="w-5 h-5" />
              <span>Personal Information</span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Juan Dela Cruz"
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Age</label>
                  <input
                    type="number"
                    name="age"
                    value={formData.age}
                    onChange={handleChange}
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Gender</label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Height (cm)</label>
                  <input
                    type="number"
                    name="height"
                    value={formData.height}
                    onChange={handleChange}
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Current Weight (kg)</label>
                  <input
                    type="number"
                    name="weight"
                    value={formData.weight}
                    onChange={handleChange}
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
            <div className="flex items-center gap-3 text-yellow-300 font-bold text-lg border-b border-slate-800 pb-3">
              <Target className="w-5 h-5" />
              <span>Goals & Activity</span>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Goal Weight (kg)</label>
                  <input
                    type="number"
                    name="goalWeight"
                    value={formData.goalWeight}
                    onChange={handleChange}
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Target Weeks: {formData.timelineWeeks}</label>
                  <input
                    type="range"
                    name="timelineWeeks"
                    min="2"
                    max="24"
                    value={formData.timelineWeeks}
                    onChange={handleChange}
                    className="w-full accent-amber-500 mt-3"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-1 text-xs font-semibold text-slate-400 mb-2">
                  <Activity className="w-3.5 h-3.5" /> Activity Level
                </label>
                <div className="flex flex-wrap gap-2">
                  {activityOptions.map((act) => (
                    <button
                      type="button"
                      key={act.id}
                      onClick={() => setFormData((p) => ({ ...p, activityLevel: act.id }))}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${
                        formData.activityLevel === act.id
                          ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {act.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="flex items-center gap-1 text-xs font-semibold text-slate-400 mb-2">
                  <Utensils className="w-3.5 h-3.5" /> Diet Preference
                </label>
                <div className="flex flex-wrap gap-2">
                  {dietOptions.map((diet) => (
                    <button
                      type="button"
                      key={diet.id}
                      onClick={() => setFormData((p) => ({ ...p, dietPreference: diet.id }))}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${
                        formData.dietPreference === diet.id
                          ? 'bg-yellow-500/20 border-yellow-500 text-yellow-300'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {diet.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {submitError && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{submitError}</div>
        )}

        <div className="flex flex-col items-center justify-center gap-3 pt-2 sm:flex-row">
          {hasSavedPlan && (
            <button
              type="button"
              onClick={() => {
                if (onViewDashboard) {
                  onViewDashboard();
                  return;
                }
                navigate('/plan');
              }}
              className="flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-6 py-3.5 text-sm font-semibold text-amber-300 transition-all hover:bg-amber-500/20"
            >
              <span>View Dashboard</span>
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 bg-linear-to-r from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 text-slate-950 font-semibold rounded-xl px-8 py-3.5 transition-all shadow-lg shadow-amber-500/20 text-base disabled:cursor-not-allowed disabled:opacity-70"
          >
            <span>
              {isSubmitting
                ? 'Saving...'
                : isProfileEdit
                  ? 'Save Profile & Refresh Plan'
                  : hasSavedPlan
                    ? 'Save & Update Plan'
                    : 'Generate Plan'}
            </span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}