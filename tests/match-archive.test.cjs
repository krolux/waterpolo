const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const moduleUnderTest = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync(require('node:path').join(__dirname, '../src/lib/matchArchive.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: moduleUnderTest.exports, Intl, Date });
const { splitMatchSchedule, competitionToday } = moduleUnderTest.exports;
const matches = [
  { id: 'past-null', date: '2026-10-03', result: null },
  { id: 'past-empty', date: '2026-10-03', result: '  ' },
  { id: 'past-score', date: '2026-10-03', result: '10:8' },
  { id: 'today', date: '2026-10-06', result: '' },
  { id: 'future', date: '2026-10-17', result: null },
  { id: 'future-score', date: '2026-10-17', result: '5:4' },
];
const { upcoming, archived } = splitMatchSchedule(matches, '2026-10-06');
assert.equal(upcoming.map(m => m.id).join(','), 'today,future');
assert.equal(archived.map(m => m.id).join(','), 'future-score,past-null,past-empty,past-score');
assert.equal(new Set([...upcoming, ...archived].map(m => m.id)).size, matches.length);
assert.equal(competitionToday(new Date('2026-10-05T22:30:00Z')), '2026-10-06');
assert.equal(competitionToday(new Date('2026-12-31T23:30:00Z')), '2027-01-01');
assert.equal(matches[0].result, null);
console.log('Match archive: past fixtures without results, complete partition, ordering and Polish midnight passed.');
