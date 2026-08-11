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

    if (!mood || mood < 1 || mood > 5) {
      return NextResponse.json({ error: 'Invalid mood' }, { status: 400 });
    }

    if (sleepHours === undefined || sleepHours < 0 || sleepHours > 24) {
      return NextResponse.json({ error: 'Invalid sleep hours' }, { status: 400 });
    }

    if (steps === undefined || steps < 0) {
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

    const today = new Date();
    today.setHours(0, 0, 0, 0);

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

function calculateWellnessScore(mood: number, sleepHours: number, steps: number): number {
  let score = 50;

  score += mood * 8;
  score += Math.min(sleepHours * 5, 40);
  score += Math.min((steps / 10000) * 20, 20);

  return Math.min(Math.max(score, 0), 100);
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
