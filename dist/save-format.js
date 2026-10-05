import { LOCATIONS, LETTERS, RELICS, UPGRADES, SCENES, maxEnergy } from './game.js';

export const MAX_SAVE_BYTES = 256_000;
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const integer = (v, min = 0, max = Number.MAX_SAFE_INTEGER) => Number.isSafeInteger(v) && v >= min && v <= max;
const text = (v, max) => typeof v === 'string' && v.length <= max;
const locationIds = LOCATIONS.map(l => l.id);
const letterIds = LETTERS.map(l => l.id);
const endingIds = ['home', 'sail'];
const collection = (v, ids) => Array.isArray(v) && v.length <= ids.length && new Set(v).size === v.length && v.every(x => ids.includes(x));
const resources = v => object(v) && Object.keys(v).every(k => ['shell', 'wood', 'star'].includes(k)) && Object.values(v).every(x => integer(x));

// Canonical, whitelisted shape shared by old-cache migration and the API.
// Reject malformed states rather than partially loading them into the game.
export function normalizeSave(s) {
  if (!object(s) || s.version !== 1 || !locationIds.includes(s.location) ||
      !integer(s.day, 1) || !integer(s.turn) || !integer(s.explorations) || !integer(s.kindness) ||
      typeof s.infinite !== 'boolean' || !object(s.upgrades) || !object(s.progress) ||
      !UPGRADES.every(u => integer(s.upgrades[u.id], 0, 3)) ||
      !LOCATIONS.every(l => integer(s.progress[l.id], 0, SCENES[l.id].length)) ||
      !integer(s.energy, 0, maxEnergy(s)) || !resources(s.resources) ||
      !['shell', 'wood', 'star'].every(k => integer(s.resources[k])) ||
      !collection(s.completed, locationIds) || !collection(s.letters, letterIds) ||
      !collection(s.relics, Object.keys(RELICS)) || !collection(s.endings, endingIds) ||
      !(s.ending === null || endingIds.includes(s.ending) && s.endings.includes(s.ending)) ||
      !Array.isArray(s.log) || s.log.length > 100 ||
      !s.log.every(l => object(l) && integer(l.day, 1) && text(l.title, 200) && text(l.text, 2000))) return null;
  let result = null;
  if (s.result !== null) {
    const r = s.result;
    if (!object(r) || !text(r.title, 200) || !text(r.text, 2000) || !resources(r.give) ||
        r.relic !== undefined && !Object.hasOwn(RELICS, r.relic) ||
        r.letter !== undefined && !letterIds.includes(r.letter) ||
        r.ending !== undefined && !endingIds.includes(r.ending)) return null;
    result = {title: r.title, text: r.text, give: {...r.give}};
    for (const k of ['relic', 'letter', 'ending']) if (r[k] !== undefined) result[k] = r[k];
  }
  const save = {
    version: 1, location: s.location, day: s.day, turn: s.turn, energy: s.energy,
    resources: Object.fromEntries(['shell', 'wood', 'star'].map(k => [k, s.resources[k]])),
    progress: Object.fromEntries(locationIds.map(k => [k, s.progress[k]])),
    completed: [...s.completed], letters: [...s.letters], relics: [...s.relics],
    upgrades: Object.fromEntries(UPGRADES.map(u => [u.id, s.upgrades[u.id]])),
    kindness: s.kindness, ending: s.ending, endings: [...s.endings], infinite: s.infinite,
    explorations: s.explorations, log: s.log.map(l => ({day: l.day, title: l.title, text: l.text})), result,
  };
  return new TextEncoder().encode(JSON.stringify(save)).length <= MAX_SAVE_BYTES ? save : null;
}

export const equalSave = (a, b) => JSON.stringify(a) === JSON.stringify(b);
