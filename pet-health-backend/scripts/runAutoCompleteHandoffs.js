/**
 * CLI entry for Render Cron / local ops.
 * Usage: node scripts/runAutoCompleteHandoffs.js
 */
import { runAutoCompleteHandoffsJob } from '../src/services/autoCompleteHandoffsJob.js';

const result = await runAutoCompleteHandoffsJob(null, {});
// eslint-disable-next-line no-console
console.log(JSON.stringify({
  scanned: result.scanned,
  due: result.due,
  completed_count: result.completed_count,
  errors: result.errors,
  notify_failures: result.notify_failures,
  now: result.now,
}, null, 2));

if (result.errors?.length) {
  process.exitCode = 1;
}
