// Live data: PubChem for any molecule's structure, Wikipedia for its summary.
const PUG = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug';

export async function suggest(query, signal) {
  const url = `https://pubchem.ncbi.nlm.nih.gov/rest/autocomplete/compound/${encodeURIComponent(query)}/json?limit=8`;
  const r = await fetch(url, { signal });
  if (!r.ok) return [];
  const data = await r.json();
  return data?.dictionary_terms?.compound ?? [];
}

export function parseSdf(text) {
  const lines = text.split(/\r?\n/);
  const counts = lines[3];
  const na = parseInt(counts.slice(0, 3), 10), nb = parseInt(counts.slice(3, 6), 10);
  const atoms = [], bonds = [];
  for (let i = 0; i < na; i++) {
    const l = lines[4 + i];
    atoms.push([l.slice(31, 34).trim(), +l.slice(0, 10), +l.slice(10, 20), +l.slice(20, 30)]);
  }
  for (let i = 0; i < nb; i++) {
    const l = lines[4 + na + i];
    bonds.push([parseInt(l.slice(0, 3), 10) - 1, parseInt(l.slice(3, 6), 10) - 1, parseInt(l.slice(6, 9), 10)]);
  }
  const cid = parseInt(lines[0], 10);
  return { cid: Number.isFinite(cid) ? cid : null, atoms, bonds };
}

// Fetch a compound by name or CID: the 3D conformer if PubChem has one, otherwise its flat 2D layout.
export async function fetchCompound({ name, cid }, signal) {
  const ref = cid ? `cid/${cid}` : `name/${encodeURIComponent(name)}`;
  let flat = false;
  let r = await fetch(`${PUG}/compound/${ref}/SDF?record_type=3d`, { signal });
  if (!r.ok) {
    r = await fetch(`${PUG}/compound/${ref}/SDF?record_type=2d`, { signal });
    flat = true;
  }
  if (!r.ok) throw new Error(r.status === 404 ? 'not-found' : 'unavailable');
  const sdf = parseSdf(await r.text());
  if (!sdf.atoms.length) throw new Error('not-found');
  let props = {};
  try {
    const p = await fetch(`${PUG}/compound/cid/${sdf.cid}/property/Title,MolecularFormula,MolecularWeight,IUPACName/JSON`, { signal });
    props = (await p.json()).PropertyTable.Properties[0];
  } catch { /* the structure is enough to show */ }
  const title = props.Title || name || `CID ${sdf.cid}`;
  return {
    key: `cid-${sdf.cid}`, name: title.charAt(0).toUpperCase() + title.slice(1), group: 'Search', wiki: title,
    blurb: '', cid: sdf.cid, iupac: props.IUPACName || '', formula: props.MolecularFormula || '',
    weight: props.MolecularWeight ? +(+props.MolecularWeight).toFixed(2) : null,
    source: flat ? 'PubChem 2D layout (no 3D conformer exists, so it is drawn flat)' : 'PubChem 3D conformer',
    flat, atoms: sdf.atoms, bonds: sdf.bonds,
  };
}

const wikiCache = new Map();
export async function wikipedia(title, signal) {
  if (wikiCache.has(title)) return wikiCache.get(title);
  const r = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}?redirect=true`, { signal });
  if (!r.ok) throw new Error('wiki');
  const d = await r.json();
  const out = {
    extract: d.extract || '', url: d.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`,
    thumb: d.thumbnail?.source || null, title: d.title,
  };
  wikiCache.set(title, out);
  return out;
}
