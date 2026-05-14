const assert = require('node:assert/strict');
const { addWorkingMinutes, scheduleOrder } = require('../scheduler');

const settings = {
  openHour: '09:00',
  closeHour: '19:00',
  washingMinutes: 30,
  dryingMinutes: 50,
  smallWashers: 1,
  dryers: 1,
};

const valet = { name: 'Valet', wash: true, dry: true };

function iso(local) {
  return new Date(local).toISOString();
}

{
  const result = addWorkingMinutes(new Date('2026-05-08T18:45:00Z'), 30, settings);
  assert.equal(result.toISOString(), iso('2026-05-11T09:15:00Z'));
}

{
  const first = scheduleOrder([], valet, settings, '2026-05-08T09:00:00Z');
  assert.equal(first.cycles.length, 2);
  assert.equal(first.cycles[0].machine, 'Lavarropas chico 1');
  assert.equal(first.cycles[1].machine, 'Secadora 1');
  assert.equal(first.estimate, iso('2026-05-08T10:20:00Z'));
}

{
  const first = scheduleOrder([], valet, settings, '2026-05-08T09:00:00Z');
  const second = scheduleOrder([{ cycles: first.cycles }], valet, settings, '2026-05-08T09:00:00Z');
  assert.equal(second.cycles[0].start, first.cycles[0].end, 'second wash waits for the washer');
  assert.ok(new Date(second.estimate) > new Date(first.estimate), 'second order finishes later when capacity is full');
}

console.log('Scheduler tests passed');
