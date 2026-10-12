// Element data. Colours are Jmol's CPK palette; covalent radii from Cordero et al. (2008); van der Waals
// radii from Bondi (1964) and Alvarez (2013); A is the mass number of the most abundant isotope.
// Rows: symbol, Z, name, standard atomic mass, colour, covalent radius (Å), van der Waals radius (Å), A, family
const ROWS = [
  ['H', 1, 'Hydrogen', 1.008, 0xffffff, 0.31, 1.20, 1, 'Nonmetal'],
  ['He', 2, 'Helium', 4.0026, 0xd9ffff, 0.28, 1.40, 4, 'Noble gas'],
  ['Li', 3, 'Lithium', 6.94, 0xcc80ff, 1.28, 1.82, 7, 'Alkali metal'],
  ['Be', 4, 'Beryllium', 9.0122, 0xc2ff00, 0.96, 1.53, 9, 'Alkaline earth metal'],
  ['B', 5, 'Boron', 10.81, 0xffb5b5, 0.84, 1.92, 11, 'Metalloid'],
  ['C', 6, 'Carbon', 12.011, 0x909090, 0.76, 1.70, 12, 'Nonmetal'],
  ['N', 7, 'Nitrogen', 14.007, 0x3050f8, 0.71, 1.55, 14, 'Nonmetal'],
  ['O', 8, 'Oxygen', 15.999, 0xff0d0d, 0.66, 1.52, 16, 'Nonmetal'],
  ['F', 9, 'Fluorine', 18.998, 0x90e050, 0.57, 1.47, 19, 'Halogen'],
  ['Ne', 10, 'Neon', 20.180, 0xb3e3f5, 0.58, 1.54, 20, 'Noble gas'],
  ['Na', 11, 'Sodium', 22.990, 0xab5cf2, 1.66, 2.27, 23, 'Alkali metal'],
  ['Mg', 12, 'Magnesium', 24.305, 0x8aff00, 1.41, 1.73, 24, 'Alkaline earth metal'],
  ['Al', 13, 'Aluminium', 26.982, 0xbfa6a6, 1.21, 1.84, 27, 'Post-transition metal'],
  ['Si', 14, 'Silicon', 28.085, 0xf0c8a0, 1.11, 2.10, 28, 'Metalloid'],
  ['P', 15, 'Phosphorus', 30.974, 0xff8000, 1.07, 1.80, 31, 'Nonmetal'],
  ['S', 16, 'Sulfur', 32.06, 0xffff30, 1.05, 1.80, 32, 'Nonmetal'],
  ['Cl', 17, 'Chlorine', 35.45, 0x1ff01f, 1.02, 1.75, 35, 'Halogen'],
  ['Ar', 18, 'Argon', 39.948, 0x80d1e3, 1.06, 1.88, 40, 'Noble gas'],
  ['K', 19, 'Potassium', 39.098, 0x8f40d4, 2.03, 2.75, 39, 'Alkali metal'],
  ['Ca', 20, 'Calcium', 40.078, 0x3dff00, 1.76, 2.31, 40, 'Alkaline earth metal'],
  ['Sc', 21, 'Scandium', 44.956, 0xe6e6e6, 1.70, 2.15, 45, 'Transition metal'],
  ['Ti', 22, 'Titanium', 47.867, 0xbfc2c7, 1.60, 2.11, 48, 'Transition metal'],
  ['V', 23, 'Vanadium', 50.942, 0xa6a6ab, 1.53, 2.07, 51, 'Transition metal'],
  ['Cr', 24, 'Chromium', 51.996, 0x8a99c7, 1.39, 2.06, 52, 'Transition metal'],
  ['Mn', 25, 'Manganese', 54.938, 0x9c7ac7, 1.39, 2.05, 55, 'Transition metal'],
  ['Fe', 26, 'Iron', 55.845, 0xe06633, 1.32, 2.04, 56, 'Transition metal'],
  ['Co', 27, 'Cobalt', 58.933, 0xf090a0, 1.26, 2.00, 59, 'Transition metal'],
  ['Ni', 28, 'Nickel', 58.693, 0x50d050, 1.24, 1.63, 58, 'Transition metal'],
  ['Cu', 29, 'Copper', 63.546, 0xc88033, 1.32, 1.40, 63, 'Transition metal'],
  ['Zn', 30, 'Zinc', 65.38, 0x7d80b0, 1.22, 1.39, 64, 'Transition metal'],
  ['Ga', 31, 'Gallium', 69.723, 0xc28f8f, 1.22, 1.87, 69, 'Post-transition metal'],
  ['Ge', 32, 'Germanium', 72.630, 0x668f8f, 1.20, 2.11, 74, 'Metalloid'],
  ['As', 33, 'Arsenic', 74.922, 0xbd80e3, 1.19, 1.85, 75, 'Metalloid'],
  ['Se', 34, 'Selenium', 78.971, 0xffa100, 1.20, 1.90, 80, 'Nonmetal'],
  ['Br', 35, 'Bromine', 79.904, 0xa62929, 1.20, 1.85, 79, 'Halogen'],
  ['Kr', 36, 'Krypton', 83.798, 0x5cb8d1, 1.16, 2.02, 84, 'Noble gas'],
  ['Rb', 37, 'Rubidium', 85.468, 0x702eb0, 2.20, 3.03, 85, 'Alkali metal'],
  ['Sr', 38, 'Strontium', 87.62, 0x00ff00, 1.95, 2.49, 88, 'Alkaline earth metal'],
  ['Y', 39, 'Yttrium', 88.906, 0x94ffff, 1.90, 2.32, 89, 'Transition metal'],
  ['Zr', 40, 'Zirconium', 91.224, 0x94e0e0, 1.75, 2.23, 90, 'Transition metal'],
  ['Nb', 41, 'Niobium', 92.906, 0x73c2c9, 1.64, 2.18, 93, 'Transition metal'],
  ['Mo', 42, 'Molybdenum', 95.95, 0x54b5b5, 1.54, 2.17, 98, 'Transition metal'],
  ['Tc', 43, 'Technetium', 98, 0x3b9e9e, 1.47, 2.16, 98, 'Transition metal'],
  ['Ru', 44, 'Ruthenium', 101.07, 0x248f8f, 1.46, 2.13, 102, 'Transition metal'],
  ['Rh', 45, 'Rhodium', 102.91, 0x0a7d8c, 1.42, 2.10, 103, 'Transition metal'],
  ['Pd', 46, 'Palladium', 106.42, 0x006985, 1.39, 1.63, 106, 'Transition metal'],
  ['Ag', 47, 'Silver', 107.87, 0xc0c0c0, 1.45, 1.72, 107, 'Transition metal'],
  ['Cd', 48, 'Cadmium', 112.41, 0xffd98f, 1.44, 1.58, 114, 'Transition metal'],
  ['In', 49, 'Indium', 114.82, 0xa67573, 1.42, 1.93, 115, 'Post-transition metal'],
  ['Sn', 50, 'Tin', 118.71, 0x668080, 1.39, 2.17, 120, 'Post-transition metal'],
  ['Sb', 51, 'Antimony', 121.76, 0x9e63b5, 1.39, 2.06, 121, 'Metalloid'],
  ['Te', 52, 'Tellurium', 127.60, 0xd47a00, 1.38, 2.06, 130, 'Metalloid'],
  ['I', 53, 'Iodine', 126.90, 0x940094, 1.39, 1.98, 127, 'Halogen'],
  ['Xe', 54, 'Xenon', 131.29, 0x429eb0, 1.40, 2.16, 132, 'Noble gas'],
  ['Cs', 55, 'Caesium', 132.91, 0x57178f, 2.44, 3.43, 133, 'Alkali metal'],
  ['Ba', 56, 'Barium', 137.33, 0x00c900, 2.15, 2.68, 138, 'Alkaline earth metal'],
  ['Pt', 78, 'Platinum', 195.08, 0xd0d0e0, 1.36, 1.75, 195, 'Transition metal'],
  ['Au', 79, 'Gold', 196.97, 0xffd123, 1.36, 1.66, 197, 'Transition metal'],
  ['Hg', 80, 'Mercury', 200.59, 0xb8b8d0, 1.32, 1.55, 202, 'Transition metal'],
  ['Pb', 82, 'Lead', 207.2, 0x575961, 1.46, 2.02, 208, 'Post-transition metal'],
  ['Bi', 83, 'Bismuth', 208.98, 0x9e4fb5, 1.48, 2.07, 209, 'Post-transition metal'],
  ['U', 92, 'Uranium', 238.03, 0x008fff, 1.96, 1.86, 238, 'Actinide'],
];

// Every element, for the periodic table: symbol, name, standard atomic mass (the longest-lived isotope's
// mass number for elements with no stable isotope) and family. Superheavy families from 113 on are predicted.
const ALL = `H Hydrogen 1.008 nm|He Helium 4.0026 ng|Li Lithium 6.94 am|Be Beryllium 9.0122 ae|B Boron 10.81 ml|C Carbon 12.011 nm|N Nitrogen 14.007 nm|O Oxygen 15.999 nm|F Fluorine 18.998 ha|Ne Neon 20.180 ng|Na Sodium 22.990 am|Mg Magnesium 24.305 ae|Al Aluminium 26.982 pt|Si Silicon 28.085 ml|P Phosphorus 30.974 nm|S Sulfur 32.06 nm|Cl Chlorine 35.45 ha|Ar Argon 39.948 ng|K Potassium 39.098 am|Ca Calcium 40.078 ae|Sc Scandium 44.956 tm|Ti Titanium 47.867 tm|V Vanadium 50.942 tm|Cr Chromium 51.996 tm|Mn Manganese 54.938 tm|Fe Iron 55.845 tm|Co Cobalt 58.933 tm|Ni Nickel 58.693 tm|Cu Copper 63.546 tm|Zn Zinc 65.38 tm|Ga Gallium 69.723 pt|Ge Germanium 72.630 ml|As Arsenic 74.922 ml|Se Selenium 78.971 nm|Br Bromine 79.904 ha|Kr Krypton 83.798 ng|Rb Rubidium 85.468 am|Sr Strontium 87.62 ae|Y Yttrium 88.906 tm|Zr Zirconium 91.224 tm|Nb Niobium 92.906 tm|Mo Molybdenum 95.95 tm|Tc Technetium 98 tm|Ru Ruthenium 101.07 tm|Rh Rhodium 102.91 tm|Pd Palladium 106.42 tm|Ag Silver 107.87 tm|Cd Cadmium 112.41 tm|In Indium 114.82 pt|Sn Tin 118.71 pt|Sb Antimony 121.76 ml|Te Tellurium 127.60 ml|I Iodine 126.90 ha|Xe Xenon 131.29 ng|Cs Caesium 132.91 am|Ba Barium 137.33 ae|La Lanthanum 138.91 la|Ce Cerium 140.12 la|Pr Praseodymium 140.91 la|Nd Neodymium 144.24 la|Pm Promethium 145 la|Sm Samarium 150.36 la|Eu Europium 151.96 la|Gd Gadolinium 157.25 la|Tb Terbium 158.93 la|Dy Dysprosium 162.50 la|Ho Holmium 164.93 la|Er Erbium 167.26 la|Tm Thulium 168.93 la|Yb Ytterbium 173.05 la|Lu Lutetium 174.97 la|Hf Hafnium 178.49 tm|Ta Tantalum 180.95 tm|W Tungsten 183.84 tm|Re Rhenium 186.21 tm|Os Osmium 190.23 tm|Ir Iridium 192.22 tm|Pt Platinum 195.08 tm|Au Gold 196.97 tm|Hg Mercury 200.59 tm|Tl Thallium 204.38 pt|Pb Lead 207.2 pt|Bi Bismuth 208.98 pt|Po Polonium 209 pt|At Astatine 210 ha|Rn Radon 222 ng|Fr Francium 223 am|Ra Radium 226 ae|Ac Actinium 227 ac|Th Thorium 232.04 ac|Pa Protactinium 231.04 ac|U Uranium 238.03 ac|Np Neptunium 237 ac|Pu Plutonium 244 ac|Am Americium 243 ac|Cm Curium 247 ac|Bk Berkelium 247 ac|Cf Californium 251 ac|Es Einsteinium 252 ac|Fm Fermium 257 ac|Md Mendelevium 258 ac|No Nobelium 259 ac|Lr Lawrencium 266 ac|Rf Rutherfordium 267 tm|Db Dubnium 268 tm|Sg Seaborgium 269 tm|Bh Bohrium 270 tm|Hs Hassium 269 tm|Mt Meitnerium 278 tm|Ds Darmstadtium 281 tm|Rg Roentgenium 282 tm|Cn Copernicium 285 tm|Nh Nihonium 286 pt|Fl Flerovium 289 pt|Mc Moscovium 290 pt|Lv Livermorium 293 pt|Ts Tennessine 294 ha|Og Oganesson 294 ng`;
const FAMILY = { nm: 'Nonmetal', ng: 'Noble gas', am: 'Alkali metal', ae: 'Alkaline earth metal', ml: 'Metalloid',
  ha: 'Halogen', tm: 'Transition metal', pt: 'Post-transition metal', la: 'Lanthanide', ac: 'Actinide' };
export const FAMILY_COLORS = { 'Nonmetal': 0x7cc4ff, 'Noble gas': 0xb48cff, 'Alkali metal': 0xff7a59, 'Alkaline earth metal': 0xffb04d,
  'Metalloid': 0x5fd6b4, 'Halogen': 0x9be36b, 'Transition metal': 0x8fa6d8, 'Post-transition metal': 0x6fb0c8,
  'Lanthanide': 0xf28ab2, 'Actinide': 0xe06a8a };
// most abundant isotope where rounding the standard mass would name a rarer (or unstable) one
const ABUNDANT = { Nd: 142, Sm: 152, Eu: 153, Gd: 158, Dy: 164, Er: 166, Yb: 174, Hf: 180, Re: 187, Os: 192, Ir: 193, Tl: 205 };

// Cordero et al. (2008) covalent radii, Å, for elements outside the detailed rows above (to curium)
const COVALENT = { La: 2.07, Ce: 2.04, Pr: 2.03, Nd: 2.01, Pm: 1.99, Sm: 1.98, Eu: 1.98, Gd: 1.96, Tb: 1.94, Dy: 1.92, Ho: 1.92,
  Er: 1.89, Tm: 1.90, Yb: 1.87, Lu: 1.87, Hf: 1.75, Ta: 1.70, W: 1.62, Re: 1.51, Os: 1.44, Ir: 1.41, Tl: 1.45, Po: 1.40,
  At: 1.50, Rn: 1.50, Fr: 2.60, Ra: 2.21, Ac: 2.15, Th: 2.06, Pa: 2.00, Np: 1.90, Pu: 1.87, Am: 1.80, Cm: 1.69 };

const DETAILED = Object.fromEntries(ROWS.map(([symbol, Z, name, mass, color, covalent, vdw, A, family]) =>
  [symbol, { symbol, Z, name, mass, color, covalent, vdw, A, family }]));

export const ELEMENTS = Object.fromEntries(ALL.split('|').map((row, i) => {
  const [symbol, name, mass, fam] = row.split(' ');
  const Z = i + 1, family = FAMILY[fam];
  const known = DETAILED[symbol];
  return [symbol, known ? { ...known, family } : {
    symbol, Z, name, mass: +mass, family, color: FAMILY_COLORS[family], covalent: COVALENT[symbol] ?? 1.6, vdw: 2.1,
    measuredRadius: symbol in COVALENT,
    A: ABUNDANT[symbol] ?? Math.round(+mass), predicted: Z >= 113,
  }];
}));
export const BY_Z = Object.values(ELEMENTS).sort((a, b) => a.Z - b.Z);

// Where each element sits in the standard 18-column table; lanthanides and actinides in two rows below.
export function tablePosition(Z) {
  const starts = [1, 3, 11, 19, 37, 55, 87, 119];
  const period = starts.findIndex((s, i) => Z >= s && Z < starts[i + 1]) + 1;
  const k = Z - starts[period - 1];
  if (period === 1) return { row: 0, col: Z === 1 ? 0 : 17, period };
  if (period <= 3) return { row: period - 1, col: k < 2 ? k : k + 10, period };
  if (period <= 5) return { row: period - 1, col: k, period };
  if (k < 2) return { row: period - 1, col: k, period };
  if (k < 17) return { row: period + 2.3, col: k + 1, period, f: true };     // 57-71, 89-103
  return { row: period - 1, col: k - 14, period };                          // 72-86, 104-118 from group 4
}

const UNKNOWN = { Z: 0, name: 'Unknown element', mass: 0, color: 0xff1493, covalent: 1.2, vdw: 2.0, A: 0, family: 'Unknown' };

export function element(symbol) {
  return ELEMENTS[symbol] || { ...UNKNOWN, symbol };
}

// Colours for the electron-cloud view: CPK, except carbon's grey and hydrogen's white, which read as
// dull smoke when glowing; they become a cool steel and a pale blue-white.
const CLOUD = { C: 0x9fb6d8, H: 0x8796b8, N: 0x5d7bff, O: 0xff4a3d, S: 0xffe14a };
export function cloudColor(symbol) {
  return CLOUD[symbol] ?? element(symbol).color;
}

// Ground-state electron configuration as [n, l, electrons] subshells, filled in Madelung order,
// with the common exceptions where a half-full or full d shell wins.
const ORDER = [[1, 0], [2, 0], [2, 1], [3, 0], [3, 1], [4, 0], [3, 2], [4, 1], [5, 0], [4, 2], [5, 1], [6, 0],
  [4, 3], [5, 2], [6, 1], [7, 0], [5, 3], [6, 2], [7, 1]];
const EXCEPTIONS = {
  Cr: [[3, 2, 5], [4, 0, 1]], Cu: [[3, 2, 10], [4, 0, 1]], Nb: [[4, 2, 4], [5, 0, 1]], Mo: [[4, 2, 5], [5, 0, 1]],
  Ru: [[4, 2, 7], [5, 0, 1]], Rh: [[4, 2, 8], [5, 0, 1]], Pd: [[4, 2, 10], [5, 0, 0]], Ag: [[4, 2, 10], [5, 0, 1]],
  Pt: [[5, 2, 9], [6, 0, 1]], Au: [[5, 2, 10], [6, 0, 1]], U: [[5, 3, 3], [6, 2, 1], [7, 0, 2]],
  La: [[4, 3, 0], [5, 2, 1]], Ce: [[4, 3, 1], [5, 2, 1]], Gd: [[4, 3, 7], [5, 2, 1]], Ac: [[5, 3, 0], [6, 2, 1]],
  Th: [[5, 3, 0], [6, 2, 2]], Pa: [[5, 3, 2], [6, 2, 1]], Np: [[5, 3, 4], [6, 2, 1]], Cm: [[5, 3, 7], [6, 2, 1]],
};

export function configuration(symbol) {
  const { Z } = element(symbol);
  const shells = [];
  let left = Z;
  for (const [n, l] of ORDER) {
    if (left <= 0) break;
    const k = Math.min(left, 2 * (2 * l + 1));
    shells.push([n, l, k]);
    left -= k;
  }
  for (const [n, l, k] of EXCEPTIONS[symbol] || []) {
    const s = shells.find(x => x[0] === n && x[1] === l);
    if (s) s[2] = k; else shells.push([n, l, k]);
  }
  // keep the total at Z: the exceptions move electrons between the listed subshells
  return shells.filter(s => s[2] > 0).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}

export const L_LETTER = 'spdf';

// Slater's rules: the effective nuclear charge an electron in subshell (n, l) feels.
export function slaterZeff(Z, shells, n, l) {
  let shield = 0;
  const sp = l <= 1;
  for (const [m, k, e] of shells) {
    const same = m === n && (sp ? k <= 1 : k === l);
    const count = same ? e - 1 : e;
    if (count <= 0) continue;
    if (same) shield += count * (n === 1 ? 0.30 : 0.35);
    else if (sp) {
      if (m === n - 1) shield += count * 0.85;
      else if (m < n - 1) shield += count * 1.0;
      else if (m === n && k > 1) continue; // d/f of the same n lie outside s,p
    } else if (m < n || (m === n && k < l)) shield += count * 1.0;
  }
  return Math.max(1, Z - shield);
}
