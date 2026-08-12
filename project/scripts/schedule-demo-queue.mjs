/**
 * Populate the practitioner Queue page with live-looking work.
 *
 * The Queue shows `scheduled` / `in_progress` consultations from the start of
 * today onward. Every seeded consultation sits in the past, so the Active tab
 * renders empty for every practitioner even though the page itself works.
 * This shifts a slice of existing consultations into today's window instead of
 * inventing new records, so all their relationships stay intact.
 *
 *   node scripts/schedule-demo-queue.mjs            # move ~12 per practitioner
 *   node scripts/schedule-demo-queue.mjs --per 6    # how many each
 *   node scripts/schedule-demo-queue.mjs --dry      # preview, change nothing
 *   node scripts/schedule-demo-queue.mjs --revert   # undo a previous run
 *
 * Every consultation this touches is tagged `demoQueueSeed: true`, which is
 * what --revert keys on, so it never disturbs records it did not move.
 */
import mongoose from 'mongoose';
import fs from 'fs';

const args = process.argv.slice(2);
const DRY = args.includes('--dry');
const REVERT = args.includes('--revert');
const PER = Number(args[args.indexOf('--per') + 1]) || 12;

const env = fs.readFileSync('.env.local', 'utf8');
const uri = env.match(/^MONGODB_URI\s*=\s*(.+)$/m)?.[1].trim().replace(/^["']|["']$/g, '');
if (!uri) {
  console.error('MONGODB_URI not found in .env.local');
  process.exit(1);
}

await mongoose.connect(uri);
const Consultations = mongoose.connection.collection('consultations');

if (REVERT) {
  const tagged = await Consultations.find({ demoQueueSeed: true }).toArray();
  if (!tagged.length) {
    console.log('Nothing to revert — no consultations tagged demoQueueSeed.');
  } else if (DRY) {
    console.log(`[dry] would restore ${tagged.length} consultation(s).`);
  } else {
    let restored = 0;
    for (const c of tagged) {
      await Consultations.updateOne(
        { _id: c._id },
        {
          $set: {
            scheduledStartTime: c.demoQueueOriginalStart,
            scheduledEndTime: c.demoQueueOriginalEnd,
            status: c.demoQueueOriginalStatus,
          },
          $unset: {
            demoQueueSeed: '',
            demoQueueOriginalStart: '',
            demoQueueOriginalEnd: '',
            demoQueueOriginalStatus: '',
          },
        },
      );
      restored++;
    }
    console.log(`Reverted ${restored} consultation(s) to their original times.`);
  }
  await mongoose.disconnect();
  process.exit(0);
}

// Only ever move work that was never carried out: stale `scheduled` and
// `requested` rows sitting in the past. Completed and cancelled consultations
// are the Queue page's history tabs — consuming those to fill the Active tab
// just moves the empty tab somewhere else.
const byPractitioner = await Consultations.aggregate([
  {
    $match: {
      demoQueueSeed: { $ne: true },
      status: { $in: ['scheduled', 'requested'] },
    },
  },
  { $group: { _id: '$practitionerId', ids: { $push: '$_id' } } },
]).toArray();

const now = new Date();
let moved = 0;
const summary = [];

for (const group of byPractitioner) {
  const picked = group.ids.slice(0, PER);
  if (!picked.length) continue;

  let inProgress = 0;
  let upcoming = 0;

  for (const [i, id] of picked.entries()) {
    const start = new Date(now);

    if (i === 0) {
      // One consultation already under way, so the "in progress" state is
      // visible on the page rather than only theoretical.
      start.setMinutes(start.getMinutes() - 15);
      inProgress++;
    } else {
      // The rest spread across the next few hours, 20 minutes apart, starting
      // ~10 minutes out so the "in Xm" countdown badge renders.
      start.setMinutes(start.getMinutes() + 10 + (i - 1) * 20);
      upcoming++;
    }

    const end = new Date(start);
    end.setMinutes(end.getMinutes() + 20);
    const status = i === 0 ? 'in_progress' : 'scheduled';

    if (!DRY) {
      const original = await Consultations.findOne(
        { _id: id },
        { projection: { scheduledStartTime: 1, scheduledEndTime: 1, status: 1 } },
      );
      await Consultations.updateOne(
        { _id: id },
        {
          $set: {
            scheduledStartTime: start,
            scheduledEndTime: end,
            status,
            demoQueueSeed: true,
            demoQueueOriginalStart: original?.scheduledStartTime ?? null,
            demoQueueOriginalEnd: original?.scheduledEndTime ?? null,
            demoQueueOriginalStatus: original?.status ?? null,
          },
        },
      );
    }
    moved++;
  }

  summary.push({ practitionerId: String(group._id), inProgress, upcoming });
}

console.log(
  JSON.stringify(
    {
      mode: DRY ? 'dry-run (nothing written)' : 'applied',
      practitionersAffected: summary.length,
      consultationsMoved: moved,
      perPractitioner: PER,
      sample: summary.slice(0, 3),
      revertWith: 'node scripts/schedule-demo-queue.mjs --revert',
    },
    null,
    1,
  ),
);

await mongoose.disconnect();
