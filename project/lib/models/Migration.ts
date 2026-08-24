import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IMigration extends Document {
  /** Stable identifier for one migration. Never reuse or rename one. */
  key: string;
  status: 'running' | 'done' | 'failed';
  startedAt: Date;
  finishedAt?: Date;
  attempts: number;
  /** Whatever the migration chose to report, for reading back later. */
  result?: unknown;
  error?: string;
  /** Which deployment first ran it, when the platform tells us. */
  deploymentId?: string;
}

const MigrationSchema = new Schema<IMigration>({
  // Unique, and that uniqueness is the whole mechanism: several serverless
  // instances start at once after a deploy and all try to claim the same
  // migration. The one whose insert succeeds runs it; the rest get a duplicate
  // key error and move on. "Once" is a property of the database, not of
  // hoping only one instance wakes up.
  key: { type: String, required: true, unique: true },
  status: {
    type: String,
    enum: ['running', 'done', 'failed'],
    default: 'running',
  },
  startedAt: { type: Date, default: Date.now },
  finishedAt: { type: Date },
  attempts: { type: Number, default: 1 },
  result: { type: Schema.Types.Mixed },
  error: { type: String },
  deploymentId: { type: String },
});

export const Migration: Model<IMigration> =
  mongoose.models.Migration ||
  mongoose.model<IMigration>('Migration', MigrationSchema);

export default Migration;
