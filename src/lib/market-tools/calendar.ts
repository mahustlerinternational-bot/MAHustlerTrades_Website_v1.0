import {z} from 'zod';

export const calendarImpactSchema = z.enum(['High', 'Medium', 'Low', 'Holiday']);

const calendarEventSchema = z.object({
  title: z.string().trim().min(1).max(240),
  country: z.string().trim().min(2).max(6),
  date: z.string().datetime({offset: true}),
  impact: calendarImpactSchema,
  forecast: z.union([z.string(), z.number(), z.null()]).optional(),
  previous: z.union([z.string(), z.number(), z.null()]).optional(),
  actual: z.union([z.string(), z.number(), z.null()]).optional(),
});

export type CalendarImpact = z.infer<typeof calendarImpactSchema>;
export type MarketCalendarEvent = {
  id: string;
  title: string;
  country: string;
  date: string;
  impact: CalendarImpact;
  forecast: string;
  previous: string;
  actual: string;
  goldRelevance: 'high' | 'medium' | 'context';
};

function cleanValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return '—';
  return String(value).slice(0, 40);
}

export function isGoldRelevant(title: string, country: string) {
  const normalized = title.toLowerCase();
  const directKeywords = [
    'fomc', 'federal funds', 'non-farm', 'nonfarm', 'cpi', 'pce', 'powell',
    'interest rate', 'unemployment claims', 'employment change', 'gdp',
    'retail sales', 'ism', 'consumer confidence', 'treasury',
  ];
  if (country === 'USD' && directKeywords.some(keyword => normalized.includes(keyword))) return 'high' as const;
  if (country === 'USD') return 'medium' as const;
  return 'context' as const;
}

export function parseCalendarFeed(value: unknown): MarketCalendarEvent[] {
  return z.array(calendarEventSchema).max(1000).parse(value).map((event, index) => ({
    id: `${event.date}-${event.country}-${event.title}-${index}`,
    title: event.title,
    country: event.country.toUpperCase(),
    date: new Date(event.date).toISOString(),
    impact: event.impact,
    forecast: cleanValue(event.forecast),
    previous: cleanValue(event.previous),
    actual: cleanValue(event.actual),
    goldRelevance: isGoldRelevant(event.title, event.country.toUpperCase()),
  })).sort((left, right) => Date.parse(left.date) - Date.parse(right.date));
}
