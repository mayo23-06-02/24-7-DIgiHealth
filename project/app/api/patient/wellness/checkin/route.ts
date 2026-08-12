import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getRequestUser } from '@/lib/auth/getRequestUser';
import mongoose from 'mongoose';

const wellnessCheckInSchema = new mongoose.Schema({
  patientId: { type: String, required: true, index: true },
  mood: { type: Number, required: true, min: 1, max: 5 },
  sleepHours: { type: Number, required: true, min: 0, max: 24 },
  steps: { type: Number, required: true, min: 0 },
  date: { type: Date, default: () => new Date() },
}, { timestamps: true });

const WellnessCheckIn = mongoose.models.WellnessCheckIn ||
  mongoose.model('WellnessCheckIn', wellnessCheckInSchema);

const wellnessScoreSchema = new mongoose.Schema({
  patientId: { type: String, required: true, index: true },
  date: { type: Date, required: true },
  score: { type: Number, required: true, min: 0, max: 100 },
}, { timestamps: true });

const WellnessScore = mongoose.models.WellnessScore ||
  mongoose.model('WellnessScore', wellnessScoreSchema);

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const user = await getRequestUser();

    if (!user || user.role !== 'patient') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { mood, sleepHours, steps } = body;

    // Each field is range-checked *and* type-checked. Comparing a non-numeric
    // value with < / > yields false (NaN comparisons always do), so a string
    // like "good" slipped past a range-only guard and then blew up as a
    // Mongoose CastError — surfacing a 500 where the caller deserves a 400.
    if (typeof mood !== 'number' || !Number.isFinite(mood) || mood < 1 || mood > 5) {
      return NextResponse.json({ error: 'Invalid mood' }, { status: 400 });
    }

    if (
      typeof sleepHours !== 'number' ||
      !Number.isFinite(sleepHours) ||
      sleepHours < 0 ||
      sleepHours > 24
    ) {
      return NextResponse.json({ error: 'Invalid sleep hours' }, { status: 400 });
    }

    if (typeof steps !== 'number' || !Number.isFinite(steps) || steps < 0) {
      return NextResponse.json({ error: 'Invalid steps' }, { status: 400 });
    }

    const checkIn = new WellnessCheckIn({
      patientId: user.userId,
      mood,
      sleepHours,
      steps,
    });

    await checkIn.save();

    const score = calculateWellnessScore(mood, sleepHours, steps);

    // UTC, not local, midnight. The score route reads these back with
    // `date.toISOString().split('T')[0]`, so a local-midnight bucket written
    // from a UTC+2 server lands at 22:00 the previous UTC day and the check-in
    // is reported one day early. Both ends must agree on UTC.
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    await WellnessScore.findOneAndUpdate(
      { patientId: user.userId, date: today },
      { score },
      { upsert: true }
    );

    const pastWeek = new Date();
    pastWeek.setDate(pastWeek.getDate() - 7);

    const scores = await WellnessScore.find({
      patientId: user.userId,
      date: { $gte: pastWeek },
    }).sort({ date: 1 });

    const streak = calculateStreak(scores);

    return NextResponse.json({
      success: true,
      message: 'Check-in recorded',
      score,
      streak,
    });
  } catch (error: unknown) {
    console.error('[POST /api/patient/wellness/checkin]', error);
    return NextResponse.json(
      { error: 'Failed to record check-in' },
      { status: 500 }
    );
  }
}

/**
 * Weighted 0-100 score: mood 40, sleep 30, steps 30.
 *
 * The previous formula started at a base of 50 and added components summing to
 * another 100 (max 150) before clamping, so nearly any plausible input hit a
 * flat 100 — mood 3 / 7h / 6000 steps scored the same as a perfect day, which
 * made the number carry no signal. Each component is now normalised against its
 * own target so the full range is actually reachable in both directions.
 *
 * Targets: mood 5/5, 8h sleep, 10 000 steps. Tune the weights here if the
 * clinical team wants a different emphasis.
 */
function calculateWellnessScore(mood: number, sleepHours: number, steps: number): number {
  const moodPoints = (Math.min(mood, 5) / 5) * 40;
  const sleepPoints = Math.min(sleepHours / 8, 1) * 30;
  const stepPoints = Math.min(steps / 10000, 1) * 30;

  return Math.round(
    Math.min(Math.max(moodPoints + sleepPoints + stepPoints, 0), 100),
  );
}

function calculateStreak(scores: any[]): number {
  if (scores.length === 0) return 0;

  let streak = 1;
  for (let i = scores.length - 1; i > 0; i--) {
    const current = new Date(scores[i].date);
    const previous = new Date(scores[i - 1].date);
    const daysDiff = Math.floor((current.getTime() - previous.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}
