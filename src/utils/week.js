const WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function getCurrentWeekDates(referenceDate = new Date()) {
  const date = new Date(referenceDate);
  date.setHours(0, 0, 0, 0);
  const mondayOffset = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - mondayOffset);

  return WEEKDAY_NAMES.map((day, index) => {
    const current = new Date(date);
    current.setDate(date.getDate() + index);
    return {
      day,
      dateKey: current.toISOString().slice(0, 10),
      date: current,
      shortDate: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(current),
    };
  });
}

export { WEEKDAY_NAMES };
