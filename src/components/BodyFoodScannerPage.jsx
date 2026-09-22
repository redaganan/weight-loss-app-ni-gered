import React, { useEffect, useState } from 'react';
import { Camera, UploadCloud, Sparkles, Save, CheckCircle2, Utensils, AlertCircle, Pencil, X } from 'lucide-react';
import { api, getStoredUserId } from '../services/api';

export default function BodyFoodScannerPage() {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [originalResult, setOriginalResult] = useState(null);
  const [editingResult, setEditingResult] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);
  const [mealHistory, setMealHistory] = useState([]);
  const [manualMeal, setManualMeal] = useState({ foodName: '', calories: '', protein: '', carbs: '', fat: '', portionSize: '1 serving' });
  const [savingManualMeal, setSavingManualMeal] = useState(false);

  const loadMeals = async () => {
    const userId = getStoredUserId();

    if (!userId) {
      const history = JSON.parse(localStorage.getItem('foodHistory') || '[]');
      setMealHistory(history.slice(0, 5));
      return;
    }

    try {
      const { data } = await api.get(`/meals/${userId}`);
      setMealHistory(Array.isArray(data) ? data.slice(0, 5) : []);
    } catch (err) {
      const history = JSON.parse(localStorage.getItem('foodHistory') || '[]');
      setMealHistory(history.slice(0, 5));
    }
  };

  useEffect(() => {
    loadMeals();
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        setError('Please select a JPG, PNG, or WEBP image.');
        return;
      }
      if (file.size > 6 * 1024 * 1024) {
        setError('Please select an image smaller than 6 MB.');
        return;
      }
      setImage(file);
      setPreview(URL.createObjectURL(file));
      setResult(null);
      setOriginalResult(null);
      setEditingResult(false);
      setSaved(false);
      setError(null);
    }
  };

  const handleScan = async () => {
    if (!image) return;

    setLoading(true);
    setError(null);

    try {
      const userId = getStoredUserId();
      if (!userId) {
        throw new Error('Sign in to scan and analyze food images.');
      }

      const imageData = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Unable to read the selected image.'));
        reader.readAsDataURL(image);
      });
      const { data } = await api.post('/meals/scan', {
        userAccount: userId,
        imageData,
        mimeType: image.type,
      });
      setResult(data.meal);
      setOriginalResult(data.meal);
      setEditingResult(false);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to scan this meal. Please try another image.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToHistory = async () => {
    if (!result) return;

    const nutrition = ['calories', 'protein', 'carbs', 'fat'].reduce((values, field) => {
      values[field] = Number(result[field]);
      return values;
    }, {});
    if (!result.foodName.trim() || !result.portionSize.trim() || nutrition.calories <= 0
      || !['protein', 'carbs', 'fat'].every((field) => Number.isFinite(nutrition[field]) && nutrition[field] >= 0)) {
      setError('Enter a meal name, portion, and valid nutrition values before saving.');
      return;
    }

    const userId = getStoredUserId();
    const savedResult = { ...result, ...nutrition };
    const record = { ...savedResult, date: new Date().toISOString() };

    if (userId) {
      try {
        await api.post('/meals', {
          userAccount: userId,
          foodName: savedResult.foodName.trim(),
          calories: savedResult.calories,
          protein: savedResult.protein,
          carbs: savedResult.carbs,
          fat: savedResult.fat,
          portionSize: savedResult.portionSize.trim(),
        });
      } catch (err) {
        console.error('Unable to save meal via API:', err);
        setError(err.response?.data?.message || 'Unable to save this scanned meal.');
        return;
      }
    }

    const history = JSON.parse(localStorage.getItem('foodHistory') || '[]');
    history.unshift(record);
    localStorage.setItem('foodHistory', JSON.stringify(history.slice(0, 10)));
    setSaved(true);
    window.dispatchEvent(new CustomEvent('meal-logged'));
    await loadMeals();
  };

  const handleManualMealSave = async (event) => {
    event.preventDefault();
    const userId = getStoredUserId();
    const calories = Number(manualMeal.calories);

    if (!manualMeal.foodName.trim() || !Number.isFinite(calories) || calories <= 0) {
      setError('Add a meal name and a valid calorie amount.');
      return;
    }

    setSavingManualMeal(true);
    setError(null);
    const record = {
      ...manualMeal,
      foodName: manualMeal.foodName.trim(),
      calories,
      protein: Number(manualMeal.protein) || 0,
      carbs: Number(manualMeal.carbs) || 0,
      fat: Number(manualMeal.fat) || 0,
      date: new Date().toISOString(),
    };

    try {
      if (userId) {
        await api.post('/meals', { userAccount: userId, ...record });
      }
      const history = JSON.parse(localStorage.getItem('foodHistory') || '[]');
      localStorage.setItem('foodHistory', JSON.stringify([record, ...history].slice(0, 10)));
      setManualMeal({ foodName: '', calories: '', protein: '', carbs: '', fat: '', portionSize: '1 serving' });
      window.dispatchEvent(new CustomEvent('meal-logged'));
      await loadMeals();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to save this meal.');
    } finally {
      setSavingManualMeal(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 py-4">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-extrabold text-slate-100 flex items-center justify-center gap-2">
          <Camera className="w-8 h-8 text-amber-400" />
          <span>AI Food & Nutrition Scanner</span>
        </h1>
        <p className="text-slate-400">Upload a food photo to estimate calories and save the meal to your tracker.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="border-2 border-dashed border-slate-700 hover:border-amber-500/50 rounded-2xl p-6 transition-all flex flex-col items-center justify-center text-center cursor-pointer bg-slate-950/40 relative group">
            <input type="file" accept="image/*" onChange={handleImageChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" />

            {preview ? (
              <div className="w-full space-y-4">
                <img src={preview} alt="Food Preview" className="w-full h-64 object-cover rounded-xl border border-slate-700 shadow-md" />
                <p className="text-xs text-slate-400">Click here to replace the photo</p>
              </div>
            ) : (
              <div className="py-8 space-y-3">
                <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-amber-400 group-hover:scale-110 transition-transform">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-200">Upload a food photo</p>
                  <p className="text-xs text-slate-400 mt-1">PNG, JPG, or WEBP</p>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleScan}
            disabled={!image || loading}
            className={`w-full flex items-center justify-center gap-2 font-semibold rounded-xl py-3.5 transition-all shadow-lg text-white ${
              !image || loading
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                : 'bg-linear-to-r from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 shadow-amber-500/20'
            }`}
          >
            <Sparkles className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Analyzing Food Image...' : 'Scan Calories'}</span>
          </button>

          {error && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Utensils className="w-5 h-5 text-yellow-300" />
              <span>Nutrition Breakdown</span>
            </h2>
            {result && (
              <span className="text-xs bg-yellow-500/10 text-yellow-300 border border-yellow-500/20 px-2.5 py-1 rounded-full font-medium">
                {result.portionSize || '1 Portion'}
              </span>
            )}
          </div>

          {result ? (
            <div className="space-y-6">
              <div>
                <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Detected Food</span>
                {editingResult ? (
                  <div className="mt-2 grid gap-3 sm:grid-cols-2">
                    {[
                      ['foodName', 'Meal name', 'text'],
                      ['portionSize', 'Portion', 'text'],
                    ].map(([field, label, type]) => (
                      <label key={field} className="text-xs font-semibold text-slate-400">
                        {label}
                        <input
                          type={type}
                          value={result[field] || ''}
                          onChange={(event) => setResult((current) => ({ ...current, [field]: event.target.value }))}
                          className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </label>
                    ))}
                  </div>
                ) : (
                  <h3 className="text-2xl font-bold text-slate-100 capitalize">{result.foodName}</h3>
                )}
              </div>

              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-6 text-center space-y-1">
                <span className="text-xs text-slate-400 uppercase tracking-widest font-bold">Estimated Calories</span>
                {editingResult ? (
                  <input
                    type="number"
                    min="1"
                    value={result.calories || ''}
                    onChange={(event) => setResult((current) => ({ ...current, calories: event.target.value }))}
                    className="mx-auto w-40 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-center text-3xl font-black text-amber-300 outline-none focus:ring-2 focus:ring-amber-500"
                  />
                ) : (
                  <p className="text-5xl font-black text-transparent bg-clip-text bg-linear-to-r from-amber-400 to-yellow-300">{result.calories}</p>
                )}
                <span className="text-xs text-slate-400">kcal</span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {['protein', 'carbs', 'fat'].map((field) => (
                  <label key={field} className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 text-center text-xs text-slate-400">
                    <span className="block mb-1 capitalize">{field}</span>
                    {editingResult ? (
                      <input
                        type="number"
                        min="0"
                        value={result[field] ?? ''}
                        onChange={(event) => setResult((current) => ({ ...current, [field]: event.target.value }))}
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-center text-lg font-bold text-slate-100 outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    ) : (
                      <span className="text-lg font-bold text-slate-100">{result[field]}g</span>
                    )}
                  </label>
                ))}
              </div>

              <div className="flex gap-3">
                {!saved && (
                  <button
                    type="button"
                    onClick={() => {
                      if (editingResult && originalResult) setResult(originalResult);
                      setEditingResult((value) => !value);
                      setError(null);
                    }}
                    className="flex-1 rounded-xl border border-slate-700 bg-slate-800 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-700"
                  >
                    {editingResult ? <X className="mx-auto h-5 w-5" /> : <Pencil className="mx-auto h-5 w-5" />}
                    <span>{editingResult ? 'Cancel edits' : 'Edit nutrition'}</span>
                  </button>
                )}
                <button
                  onClick={handleSaveToHistory}
                  disabled={saved}
                  className={`flex-1 flex items-center justify-center gap-2 font-semibold rounded-xl py-3 transition-all ${
                    saved
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  }`}
                >
                  {saved ? <CheckCircle2 className="w-5 h-5" /> : <Save className="w-5 h-5" />}
                  <span>{saved ? 'Saved to Food History!' : 'Save to Daily History'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
                <Utensils className="w-6 h-6" />
              </div>
              <p className="text-sm text-slate-400">Upload a photo to the left and click “Scan Calories” to view the result.</p>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleManualMealSave} className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl">
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-400">Manual entry</p>
          <h2 className="mt-2 text-2xl font-bold text-slate-100">Log a meal without scanning</h2>
          <p className="mt-1 text-sm text-slate-400">Add known nutrition values and keep your daily totals complete.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[
            ['foodName', 'Meal name', 'e.g. Chicken rice bowl', 'text'],
            ['calories', 'Calories', 'kcal', 'number'],
            ['protein', 'Protein', 'grams', 'number'],
            ['carbs', 'Carbs', 'grams', 'number'],
            ['fat', 'Fat', 'grams', 'number'],
            ['portionSize', 'Portion', 'e.g. 1 bowl', 'text'],
          ].map(([name, label, placeholder, type]) => (
            <label key={name} className="text-sm font-semibold text-slate-300">
              {label}
              <input
                type={type}
                min={type === 'number' ? '0' : undefined}
                value={manualMeal[name]}
                onChange={(event) => setManualMeal((prev) => ({ ...prev, [name]: event.target.value }))}
                placeholder={placeholder}
                required={name === 'foodName' || name === 'calories'}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-amber-500"
              />
            </label>
          ))}
        </div>
        <button type="submit" disabled={savingManualMeal} className="mt-5 rounded-xl bg-linear-to-r from-amber-500 to-yellow-300 px-5 py-2.5 text-sm font-bold text-slate-950 disabled:opacity-60">
          {savingManualMeal ? 'Saving meal...' : 'Save manual meal'}
        </button>
      </form>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-400">Meal tracker</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-100">Recent meals</h2>
          </div>
        </div>

        {mealHistory.length > 0 ? (
          <div className="space-y-3">
            {mealHistory.map((item, index) => (
              <div key={`${item.foodName}-${item.date || index}`} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                <div>
                  <p className="font-semibold text-slate-100 capitalize">{item.foodName}</p>
                  <p className="text-xs text-slate-400">{item.date ? new Date(item.date).toLocaleDateString() : 'Saved recently'}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-amber-400">{item.calories} kcal</p>
                  <p className="text-xs text-slate-400">{item.protein ?? 0}P / {item.carbs ?? 0}C / {item.fat ?? 0}F</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/40 p-6 text-center text-slate-400">
            No meal history yet. Scan a meal to populate your tracker.
          </div>
        )}
      </div>
    </div>
  );
}