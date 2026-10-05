import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classesForFaction, racesFor, isValidCombo, raceIdFromName, classIdFromName } from './gameData.js';
import { validateCharacter } from './validate.js';

const base = {
  id: 'abcdef12-3456', forename: 'Loki', surname: 'Calavera',
  faction: 'horde', race: 'undead', class: 'mage', gender: 'male', level: 1, professions: {},
};

test('new Forever combos are allowed', () => {
  assert.ok(isValidCombo('alliance', 'dwarf', 'shaman'));
  assert.ok(isValidCombo('alliance', 'gnome', 'priest'));
  assert.ok(isValidCombo('alliance', 'human', 'hunter'));
  assert.ok(isValidCombo('horde', 'orc', 'mage'));
  assert.ok(isValidCombo('horde', 'troll', 'warlock'));
  assert.ok(isValidCombo('horde', 'undead', 'paladin'));
});

test('skyborne mage is Alliance only, skyborne shaman Horde only', () => {
  assert.ok(isValidCombo('alliance', 'skyborne', 'mage'));
  assert.ok(!isValidCombo('horde', 'skyborne', 'mage'));
  assert.ok(isValidCombo('horde', 'skyborne', 'shaman'));
  assert.ok(!isValidCombo('alliance', 'skyborne', 'shaman'));
});

test('cross-faction races are rejected', () => {
  assert.ok(!isValidCombo('alliance', 'orc', 'warrior'));
  assert.ok(!isValidCombo('horde', 'tauren', 'paladin'));
});

test('paladins exist on both factions now', () => {
  assert.ok(classesForFaction('horde').some((c) => c.id === 'paladin'));
  assert.deepEqual(racesFor('horde', 'paladin').map((r) => r.id), ['undead']);
});

test('API names map to ids', () => {
  assert.equal(raceIdFromName('Undead'), 'undead');
  assert.equal(raceIdFromName('Night Elf'), 'nightelf');
  assert.equal(classIdFromName('Warlock'), 'warlock');
});

test('valid character passes', () => {
  const { errors } = validateCharacter({ ...base, professions: { tailoring: 300, enchanting: 0, cooking: 150 } });
  assert.deepEqual(errors, []);
});

test('third primary profession is rejected', () => {
  const { errors } = validateCharacter({ ...base, professions: { tailoring: 1, enchanting: 1, alchemy: 1 } });
  assert.ok(errors.some((e) => e.includes('at most 2 primary')));
});

test('secondaries do not count toward the primary limit', () => {
  const { errors } = validateCharacter({ ...base, professions: { tailoring: 1, enchanting: 1, cooking: 1, fishing: 1, firstaid: 1 } });
  assert.deepEqual(errors, []);
});

test('level and skill bounds', () => {
  assert.ok(validateCharacter({ ...base, level: 61 }).errors.length);
  assert.ok(validateCharacter({ ...base, professions: { mining: 301 } }).errors.length);
});
