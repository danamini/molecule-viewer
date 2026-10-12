// Human scale: how magnified the view is, what the thing on screen would compare to if it were your
// height, and where it sits on the ladder from you down to the Planck length.
import { element } from './elements.js';

const SCREEN_METRES_PER_PX = 0.0254 / 96; // a CSS pixel is defined as 1/96 inch
const PERSON = 1.7;

const WORDS = [[1e33, 'decillion'], [1e30, 'nonillion'], [1e27, 'octillion'], [1e24, 'septillion'], [1e21, 'sextillion'],
  [1e18, 'quintillion'], [1e15, 'quadrillion'], [1e12, 'trillion'], [1e9, 'billion'], [1e6, 'million']];
const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
export const pow10 = n => `10${n < 0 ? '⁻' : ''}${String(Math.abs(n)).split('').map(d => SUP[d]).join('')}`;

export function magnification(metresPerPx) {
  const m = SCREEN_METRES_PER_PX / metresPerPx;
  if (m < 1) return { value: m, text: `${(1 / m).toPrecision(2)} times smaller` };
  for (const [v, w] of WORDS) if (m >= v) return { value: m, text: `${+(m / v).toPrecision(2)} ${w} times`, power: pow10(Math.floor(Math.log10(m))) };
  return { value: m, text: `${Math.round(m).toLocaleString('en-GB')} times` };
}

// Familiar sizes to compare against, smallest first
const LANDMARKS = [
  [1e-7, 'the size of a flu virus'], [2e-6, 'the size of a bacterium'], [8e-6, 'the size of a red blood cell'],
  [7e-5, 'the width of a human hair'], [5e-4, 'the size of a grain of sand'], [4e-3, 'the size of an ant'],
  [2.3e-2, 'the size of a coin'], [0.22, 'the size of a football'], [1.7, 'your height'], [11, 'the length of a bus'],
  [105, 'the length of a football pitch'], [330, 'the height of the Eiffel Tower'], [8849, 'the height of Mount Everest'],
  [5e4, 'the width of Greater London'], [2.7e5, 'the length of Wales'], [9.7e5, 'the length of Great Britain'],
  [3.47e6, 'the size of the Moon'], [1.27e7, 'the size of the Earth'], [3.84e8, 'the distance to the Moon'],
  [1.39e9, 'the size of the Sun'], [1.5e11, 'the distance to the Sun'], [9.46e15, 'a light-year'],
  [9.5e20, 'the width of the Milky Way'],
];

export function formatHuman(m) {
  if (m >= 9.46e14) return `${(m / 9.46e15).toLocaleString('en-GB', { maximumSignificantDigits: 2 })} light-years`;
  const units = [[1e3, 'km'], [1, 'm'], [1e-2, 'cm'], [1e-3, 'mm'], [1e-6, 'µm'], [1e-9, 'nm']];
  for (const [u, n] of units) if (m >= u) {
    const v = m / u;
    return `${(+v.toPrecision(2)).toLocaleString('en-GB')} ${n}`;
  }
  return `${+(m / 1e-12).toPrecision(2)} pm`;
}

export function compare(m) {
  let best = LANDMARKS[0];
  for (const l of LANDMARKS) if (Math.abs(Math.log(m / l[0])) < Math.abs(Math.log(m / best[0]))) best = l;
  const r = m / best[0];
  if (r > 0.7 && r < 1.45) return `about ${best[1]}`;
  if (r <= 0.7) {
    const parts = [[2, 'half'], [3, 'a third of'], [4, 'a quarter of'], [5, 'a fifth of'], [10, 'a tenth of'], [20, 'a twentieth of']];
    const [, word] = parts.reduce((a, b) => (Math.abs(Math.log(b[0] * r)) < Math.abs(Math.log(a[0] * r)) ? b : a));
    return `about ${word} ${best[1]}`;
  }
  return Math.round(r) === 2 ? `about twice ${best[1]}` : `about ${Math.round(r)} times ${best[1]}`;
}

// lower-case a name for mid-sentence use, but leave names like 'Z80' alone
const lowerName = n => (/^[A-Z][a-z]/.test(n) ? n[0].toLowerCase() + n.slice(1) : n);
const atomSize = sym => 2 * element(sym).vdw * 1e-10;

// "If this were as tall as you, that would be..." for each kind of level
export function analogy(level) {
  if (!level) return '';
  let subject, size, refName, ref;
  switch (level.kind) {
    case 'thing': subject = `this ${lowerName(level.thing.name)}`; size = level.sizeMetres; refName = 'each atom in it'; ref = 2.5e-10; break;
    case 'snowflake': subject = 'this snowflake'; size = 3e-3; refName = 'each water molecule in it'; ref = 2.8e-10; break;
    case 'molecule':
      subject = level.mol.crystal ? `this piece of ${level.mol.name.toLowerCase()}` : `this ${level.mol.name.toLowerCase()} molecule`;
      size = level.sizeMetres; refName = 'a human hair'; ref = 7e-5; break;
    case 'atom': subject = `this ${level.data.el.name.toLowerCase()} atom`; size = atomSize(level.data.el.symbol); refName = 'a grain of sand'; ref = 5e-4; break;
    case 'nucleus': subject = 'this nucleus'; size = 2.4e-15 * Math.cbrt(level.A); refName = 'the whole atom'; ref = atomSize(level.parentSymbol); break;
    case 'nucleon': subject = `this ${level.nucleon}`; size = 1.7e-15; refName = 'the whole atom'; ref = atomSize(level.parentSymbol); break;
    case 'particle': {
      const h = 1.06e-10 * PERSON / 1e-18;
      return `Its size, if it has one, is under 10⁻¹⁸ m. Blown up to your height, that limit would make a hydrogen atom ${formatHuman(h)} across: ${compare(h)}.`;
    }
    case 'planck': return `If the Planck length were a metre, a proton would be ${formatHuman(1.7e-15 / 1.616e-35)} across: ${compare(1.7e-15 / 1.616e-35)}.`;
    default: return '';
  }
  const k = PERSON / size;
  const scaled = ref * k;
  return `If ${subject} were as tall as you, ${refName} would be ${formatHuman(scaled)} across: ${compare(scaled)}.`;
}

// The ruler: powers of ten from 10 m down to 10^-36 m, with the stops on the way
export const RULER = { top: 1, bottom: -36 };
export const RULER_MARKS = [
  [1.7, 'You'], [3e-3, 'Snowflake'], [7e-5, 'Hair'], [1e-9, 'Molecule'],
  [3e-10, 'Atom'], [5e-15, 'Nucleus'], [1.7e-15, 'Proton'], [1.616e-35, 'Planck length'],
];
// below about 10^-19 m nothing has been measured: the LHC's reach
export const UNEXPLORED = [-19, Math.log10(1.616e-35)];
