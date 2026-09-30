import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createLimit } from '../../src/shared/async-limit';

test('request limiter never exceeds configured concurrency', async () => {
  const limit = createLimit(2);
  let active = 0, peak = 0;
  const tasks = Array.from({ length: 8 }, (_, index) => limit(async () => {
    active += 1;
    peak = Math.max(peak, active);
    await new Promise(resolve => setTimeout(resolve, 5));
    active -= 1;
    return index;
  }));
  assert.deepEqual(await Promise.all(tasks), [0, 1, 2, 3, 4, 5, 6, 7]);
  assert.equal(peak, 2);
  assert.equal(active, 0);
});
