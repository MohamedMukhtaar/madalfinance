import dayjs from 'dayjs';

export const today = () => dayjs().format('YYYY-MM-DD');
export const nowISO = () => dayjs().toISOString();

export const parseDate = (value, fallback = null) => {
  if (!value) return fallback;
  const d = dayjs(value);
  return d.isValid() ? d.format('YYYY-MM-DD') : fallback;
};

export const addDays = (date, days) => dayjs(date).add(days, 'day').format('YYYY-MM-DD');
export const addMonths = (date, months) => dayjs(date).add(months, 'month').format('YYYY-MM-DD');

export const isBefore = (a, b) => dayjs(a).isBefore(dayjs(b));
export const isSameOrBefore = (a, b) => dayjs(a).isSameOrBefore(dayjs(b), 'day');
export const isSameOrAfter = (a, b) => dayjs(a).isSameOrAfter(dayjs(b), 'day');

export const monthKey = (date) => dayjs(date).format('YYYY-MM');

export const currentMonth = () => dayjs().month() + 1;
export const currentYear = () => dayjs().year();

export default { today, nowISO, parseDate, addDays, addMonths, monthKey };
