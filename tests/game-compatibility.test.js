import test from 'node:test';
import assert from 'node:assert/strict';
import { act, initialState, LOCATIONS, SCENES, affordable } from '../dist/game.js';
import { normalizeSave } from '../dist/save-format.js';

test('all 512 story paths remain saveable in both normal and infinite-resource modes', () => {
  for (const infinite of [false, true]) for (let mask = 0; mask < 512; mask++) {
    const s = initialState(); s.infinite = infinite; let bit = 0;
    const step = (action, payload) => {
      const result = act(s, action, payload); assert.equal(result.ok, true, action);
      assert.ok(normalizeSave(s), `Save rejected on ${action}, path ${mask}`);
    };
    for (const loc of LOCATIONS) {
      if (s.location !== loc.id) {if (s.energy < 1) step('rest'); step('travel', loc.id);}
      for (const scene of SCENES[loc.id]) {
        const choice = (mask >> bit++) & 1;
        let attempts = 0;
        while (!affordable(s, scene.choices[choice].cost)) {
          assert.ok(++attempts < 100); if (s.energy < 1) step('rest'); step('explore'); step('continue');
        }
        step('choice', choice); step('continue');
      }
    }
    assert.equal(s.letters.length, 4); assert.equal(s.endings.length, 1);
    assert.deepEqual(normalizeSave(s), s);
  }
});


test('island commissions migrate, enforce prerequisites and settle only once',()=>{
 const s=initialState();delete s.commissions;assert.deepEqual(normalizeSave(s).commissions,[]);
 const before=JSON.stringify(s);assert.equal(act(s,'commission','seed').ok,false);assert.equal(JSON.stringify(s),before);
 s.completed.push('forest');s.location='forest';s.resources={shell:30,wood:20,star:0};
 assert.equal(act(s,'commission','seed').ok,true);assert.equal(s.resources.star,6);assert.equal(s.resources.wood,12);assert.ok(normalizeSave(s));
 const after=JSON.stringify(s);assert.equal(act(s,'commission','seed').ok,false);assert.equal(JSON.stringify(s),after);
 s.commissions=['unknown'];assert.equal(normalizeSave(s),null);
});
