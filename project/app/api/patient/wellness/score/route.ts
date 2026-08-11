import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getRequestUser } from '@/lib/auth/getRequestUser';
import mongoose from 'mongoose';

interface WellnessScore {
  patientId: string;
  date: Date;
  score: number;
}

const wellnessScoreSchema = new mongoose.Schema({
  patientId: { type: String, required: true, index: true },
  date: { type: Date, required: true },
  score: { type: Number, required: true, min: 0, max: 100 },
}, { timestamps: true });

const WellnessScore = mongoose.models.WellnessScore ||
  mongoose.model('WellnessScore', wellnessScoreSchema);

export async function GET() {
  try {
    await connectToDatabase();
    const user = await getRequestUser();

    if (!user || user.role !== 'patient') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pastWeek = new Date();
    pastWeek.setDate(pastWeek.getDate() - 7);

    const scores = await WellnessScore.find({
      patientId: user.userId,
      date: { $gte: pastWeek },
    }).sort({ date: 1 });

    if (scores.length === 0) {
      return NextResponse.json({
        score: 75,
        streak: 0,
        history: [],
      });
    }

    const currentScore = scores[scores.length - 1].score;
    const history = scores.map(s => ({
      date: s.date.toISOString().split('T')[0],
      score: s.score,
    }));

    const streak = calculateStreak(scores);

    return NextResponse.json({
      score: currentScore,
      streak,
      history,
    });
  } catch (error: unknown) {
    console.error('[GET /api/patient/wellness/score]', error);
    return NextResponse.json(
      { error: 'Failed to fetch wellness score' },
      { status: 500 }
    );
  }
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
