export const toNumber = (value: unknown, fallback = 0): number => {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
};

export const round2 = (value: number): number => Math.round(value * 100) / 100;

const ONES = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];

const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

const toWordsBelowThousand = (num: number): string => {
  let n = num;
  let text = '';

  if (n >= 100) {
    text += `${ONES[Math.floor(n / 100)]} Hundred `;
    n %= 100;
  }

  if (n >= 20) {
    text += `${TENS[Math.floor(n / 10)]} `;
    n %= 10;
  }

  if (n > 0) {
    text += `${ONES[n]} `;
  }

  return text.trim();
};

export const amountToWords = (value: number, currency = 'INR'): string => {
  if (value === 0) {
    return `Zero ${currency} Only`;
  }

  const integerPart = Math.floor(Math.abs(value));
  const decimalPart = Math.round((Math.abs(value) - integerPart) * 100);

  const units = [
    { divisor: 1_000_000_000, label: 'Billion' },
    { divisor: 1_000_000, label: 'Million' },
    { divisor: 1_000, label: 'Thousand' },
    { divisor: 1, label: '' },
  ];

  let remaining = integerPart;
  const parts: string[] = [];

  for (const unit of units) {
    if (remaining >= unit.divisor) {
      const chunk = Math.floor(remaining / unit.divisor);
      remaining %= unit.divisor;
      if (chunk > 0) {
        const chunkWords = toWordsBelowThousand(chunk);
        parts.push(unit.label ? `${chunkWords} ${unit.label}` : chunkWords);
      }
    }
  }

  const main = parts.join(' ').replace(/\s+/g, ' ').trim();
  const paisa = decimalPart > 0 ? ` and ${toWordsBelowThousand(decimalPart)} Cents` : '';

  return `${main} ${currency}${paisa} Only`.trim();
};
