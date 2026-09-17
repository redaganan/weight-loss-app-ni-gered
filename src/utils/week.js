const WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function toLocalDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

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
      dateKey: toLocalDateKey(current),
      date: current,
      shortDate: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(current),
    };
  });
}

export { WEEKDAY_NAMES };
