import type { CatalogueItem, Unit } from './types';
import { matchCatalogue, normalise } from './catalogue';

export interface BulkRow {
  raw: string;
  name: string;
  quantity: number;
  unit: Unit;
  /** Present when matched to the catalogue. */
  match?: CatalogueItem;
  /** 0–1. 0 means a custom item. */
  confidence: number;
  error?: string;
}

const WORD_NUMBERS: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  dozen: 12,
  half: 0.5,
};

const UNIT_WORDS: [RegExp, Unit][] = [
  [/^(kg|kgs|kilo|kilos|kilograms?)$/, 'kg'],
  [/^(g|gm|gms|grams?)$/, 'g'],
  [/^(ml|millilitres?|milliliters?)$/, 'ml'],
  [/^(l|ltr|ltrs|litres?|liters?)$/, 'l'],
  [/^(pcs|pc|pieces?|nos?)$/, 'pcs'],
  [
    /^(pack|packs|packet|packets|pkt|pkts|bunch|bunches|box|boxes|bag|bags|tin|tins|can|cans|bottle|bottles|jar|jars)$/,
    'pack',
  ],
];

function unitFrom(word: string): Unit | undefined {
  const w = word.toLowerCase().replace(/\.$/, '');
  return UNIT_WORDS.find(([re]) => re.test(w))?.[1];
}

/** Split "2 milk, spinach\n6 eggs" into tokens. */
export function splitBulk(text: string): string[] {
  return text
    .split(/[,\n;]+|\s+&\s+|\s+and\s+/i)
    .map((s) => s.replace(/^[\s\-*•·]+/, '').trim())
    .filter(Boolean);
}

/** Read a leading quantity and unit: "2 milk", "500g paneer", "1.5 kg rice", "a dozen eggs", "2x bread". */
export function readQuantity(token: string): { quantity?: number; unit?: Unit; rest: string } {
  let rest = token.trim();
  let quantity: number | undefined;
  let unit: Unit | undefined;

  const num = rest.match(/^(\d+(?:[.,]\d+)?|\d+\/\d+)\s*(x\b)?\s*/i);
  if (num) {
    const n = num[1].includes('/')
      ? Number(num[1].split('/')[0]) / Number(num[1].split('/')[1])
      : Number(num[1].replace(',', '.'));
    quantity = n;
    rest = rest.slice(num[0].length);
    // unit glued or spaced: "500g paneer", "500 g paneer"
    const u = rest.match(/^([a-zA-Z]+\.?)\s+/);
    if (u && unitFrom(u[1])) {
      unit = unitFrom(u[1]);
      rest = rest.slice(u[0].length);
    }
  } else {
    const words = rest.split(/\s+/);
    let i = 0;
    let q: number | undefined;
    while (i < words.length - 1 && WORD_NUMBERS[words[i].toLowerCase()] !== undefined) {
      const v = WORD_NUMBERS[words[i].toLowerCase()];
      q = q === undefined ? v : words[i].toLowerCase() === 'dozen' ? q * 12 : v;
      i++;
    }
    if (q !== undefined) {
      quantity = q;
      if (i < words.length - 1 && unitFrom(words[i])) {
        unit = unitFrom(words[i]);
        i++;
      }
      if (words[i]?.toLowerCase() === 'of') i++;
      rest = words.slice(i).join(' ');
    }
  }
  if (rest.toLowerCase().startsWith('of ')) rest = rest.slice(3);
  return { quantity, unit, rest: rest.trim() };
}

export const MATCH_THRESHOLD = 0.7;

export function parseBulk(text: string): BulkRow[] {
  return splitBulk(text).map((raw) => {
    const { quantity, unit, rest } = readQuantity(raw);
    const cleaned = normalise(rest);
    if (!cleaned) {
      return {
        raw,
        name: raw,
        quantity: quantity ?? 1,
        unit: unit ?? 'pcs',
        confidence: 0,
        error: "Couldn't find an item name",
      };
    }
    const m = matchCatalogue(cleaned);
    if (m && m.confidence >= MATCH_THRESHOLD) {
      return {
        raw,
        name: m.item.name,
        quantity: quantity ?? 1,
        unit: unit ?? m.item.defaultUnit,
        match: m.item,
        confidence: Math.round(m.confidence * 100) / 100,
      };
    }
    const name = rest.charAt(0).toUpperCase() + rest.slice(1);
    return { raw, name, quantity: quantity ?? 1, unit: unit ?? 'pcs', confidence: 0 };
  });
}
