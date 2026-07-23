import type {JournalTrade} from '@/types/journal';

export const JOURNAL_CSV_COLUMNS = [
  'external_ref',
  'opened_at',
  'closed_at',
  'symbol',
  'direction',
  'trade_status',
  'entry_price',
  'exit_price',
  'stop_loss',
  'take_profit',
  'lot_size',
  'net_pnl',
  'fees',
  'risk_amount',
  'result_r',
  'strategy',
  'setup',
  'timeframe',
  'session',
  'market_condition',
  'followed_plan',
  'mistakes',
  'tags',
  'rating',
  'notes',
] as const;

function escapeCsv(value: unknown) {
  const text = Array.isArray(value)
    ? value.join('|')
    : value === null || value === undefined
      ? ''
      : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function journalTradesToCsv(trades: JournalTrade[]) {
  const rows = trades.map(trade =>
    JOURNAL_CSV_COLUMNS.map(column => escapeCsv(trade[column as keyof JournalTrade])).join(','),
  );
  return [JOURNAL_CSV_COLUMNS.join(','), ...rows].join('\r\n');
}

export function parseCsvRows(input: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (quoted) {
      if (character === '"' && input[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === ',') {
      row.push(field);
      field = '';
    } else if (character === '\n') {
      row.push(field.replace(/\r$/, ''));
      if (row.some(value => value.trim())) rows.push(row);
      row = [];
      field = '';
    } else {
      field += character;
    }
  }
  if (quoted) throw new Error('CSV contains an unclosed quoted field');
  row.push(field.replace(/\r$/, ''));
  if (row.some(value => value.trim())) rows.push(row);
  return rows;
}

export function journalCsvToObjects(input: string) {
  const rows = parseCsvRows(input.replace(/^\uFEFF/, ''));
  if (rows.length < 2) throw new Error('CSV must include a header and at least one trade');
  const headers = rows[0].map(value => value.trim().toLowerCase());
  const unknown = headers.filter(header => !JOURNAL_CSV_COLUMNS.includes(header as (typeof JOURNAL_CSV_COLUMNS)[number]));
  if (unknown.length) throw new Error(`Unsupported CSV column${unknown.length === 1 ? '' : 's'}: ${unknown.join(', ')}`);
  for (const required of ['opened_at', 'symbol', 'direction', 'entry_price', 'lot_size']) {
    if (!headers.includes(required)) throw new Error(`CSV is missing required column: ${required}`);
  }
  return rows.slice(1).map((values, rowIndex) => {
    const record: Record<string, unknown> = {};
    headers.forEach((header, columnIndex) => {
      record[header] = values[columnIndex]?.trim() ?? '';
    });
    if (record.followed_plan !== '') {
      const normalized = String(record.followed_plan).toLowerCase();
      if (!['true', 'false', 'yes', 'no', '1', '0'].includes(normalized)) {
        throw new Error(`Row ${rowIndex + 2}: followed_plan must be true/false`);
      }
      record.followed_plan = ['true', 'yes', '1'].includes(normalized);
    }
    record.mistakes = String(record.mistakes ?? '').split('|');
    record.tags = String(record.tags ?? '').split('|');
    record.trade_status = record.trade_status || 'closed';
    record.fees = record.fees || '0';
    return record;
  });
}

