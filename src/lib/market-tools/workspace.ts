import {z} from 'zod';

export const toolTabSchema = z.enum(['dashboard', 'chart', 'calendar', 'intelligence', 'risk']);
export const heatmapSchema = z.enum(['forex', 'stocks', 'crypto']);
export const biasSchema = z.enum(['bullish', 'neutral', 'bearish']);
export const directionSchema = z.enum(['buy', 'sell']);

const shortText = (maximum: number) => z.string().trim().max(maximum);
const optionalPrice = z.union([z.number().finite().positive(), z.null()]);

export const workspacePreferencesSchema = z.object({
  activeTab: toolTabSchema.default('dashboard'),
  interval: z.enum(['5', '15', '60', '240', 'D', 'W']).default('15'),
  heatmap: heatmapSchema.default('forex'),
  timezone: shortText(80).default('Asia/Dubai'),
  calendarRange: z.enum(['today', 'tomorrow', 'week', 'up-next']).default('week'),
  calendarImpacts: z.array(z.enum(['High', 'Medium', 'Low', 'Holiday'])).max(4).default(['High', 'Medium']),
  calendarCurrencies: z.array(shortText(6)).max(20).default(['USD', 'EUR', 'GBP', 'CNY', 'JPY']),
  risk: z.object({
    direction: directionSchema.default('buy'),
    balance: shortText(20).default('10000'),
    riskPercent: shortText(12).default('1'),
    entry: shortText(20).default('4100'),
    stopLoss: shortText(20).default('4090'),
    takeProfit: shortText(20).default('4120'),
    contractSize: shortText(12).default('100'),
    minimumLot: shortText(12).default('0.01'),
    lotStep: shortText(12).default('0.01'),
  }).default({}),
}).strict();

export const analysisSchema = z.object({
  bias: biasSchema.default('neutral'),
  direction: directionSchema.default('buy'),
  strategy: shortText(100).default(''),
  setup: shortText(120).default(''),
  session: shortText(40).default(''),
  marketCondition: shortText(80).default(''),
  thesis: shortText(4000).default(''),
  invalidation: shortText(1500).default(''),
  entry: optionalPrice.default(null),
  stopLoss: optionalPrice.default(null),
  takeProfit1: optionalPrice.default(null),
  takeProfit2: optionalPrice.default(null),
  takeProfit3: optionalPrice.default(null),
  lotSize: optionalPrice.default(null),
  riskAmount: optionalPrice.default(null),
  supportLevels: z.array(z.number().finite().positive()).max(20).default([]),
  resistanceLevels: z.array(z.number().finite().positive()).max(20).default([]),
  checklist: z.record(z.string().max(80), z.boolean()).default({}),
  updatedAt: z.string().datetime({offset: true}).nullable().default(null),
}).strict();

export const eliteWorkspaceSchema = z.object({
  preferences: workspacePreferencesSchema.default({}),
  analysis: analysisSchema.default({}),
}).strict();

export type WorkspacePreferences = z.infer<typeof workspacePreferencesSchema>;
export type EliteAnalysis = z.infer<typeof analysisSchema>;
export type EliteWorkspace = z.infer<typeof eliteWorkspaceSchema>;

export const DEFAULT_ELITE_WORKSPACE: EliteWorkspace = eliteWorkspaceSchema.parse({});

export function parseEliteWorkspace(value: unknown) {
  return eliteWorkspaceSchema.parse(value);
}

export function workspaceValidationMessage(error: unknown) {
  if (error instanceof z.ZodError) {
    return error.issues.map(issue => `${issue.path.join('.') || 'workspace'}: ${issue.message}`).join('; ');
  }
  return error instanceof Error ? error.message : 'Invalid Elite Tools workspace';
}
