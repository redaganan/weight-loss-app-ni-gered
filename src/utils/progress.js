export function calculateWeightProgress(data = {}) {
  const startWeight = Number(data.startWeight ?? data.weight);
  const currentWeight = Number(data.weight);
  const goalWeight = Number(data.goalWeight);

  if (![startWeight, currentWeight, goalWeight].every((value) => Number.isFinite(value) && value > 0)) {
    return {
      percent: 0,
      change: 0,
      remaining: 0,
      direction: 'loss',
      label: 'Add valid weight goals',
    };
  }

  const totalChange = Math.abs(goalWeight - startWeight);
  const change = currentWeight - startWeight;
  const direction = goalWeight < startWeight ? 'loss' : goalWeight > startWeight ? 'gain' : 'maintain';

  if (direction === 'maintain' || totalChange === 0) {
    return {
      percent: Math.abs(change) <= 0.1 ? 100 : 0,
      change,
      remaining: Math.abs(goalWeight - currentWeight),
      direction,
      label: Math.abs(change) <= 0.1 ? 'Goal maintained' : 'Maintain goal weight',
    };
  }

  const progress = direction === 'loss'
    ? (startWeight - currentWeight) / totalChange
    : (currentWeight - startWeight) / totalChange;
  const percent = Number(Math.min(100, Math.max(0, progress * 100)).toFixed(1));
  const reached = Math.abs(goalWeight - currentWeight) <= 0.1;

  return {
    percent: reached ? 100 : percent,
    change,
    remaining: Math.abs(goalWeight - currentWeight),
    direction,
    label: reached ? 'Goal reached' : direction === 'loss' ? 'Weight loss progress' : 'Weight gain progress',
  };
}
