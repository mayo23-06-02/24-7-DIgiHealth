import mongoose, { Schema, Document } from 'mongoose';

export interface IHealthTip extends Document {
  title: string;
  excerpt: string;
  content: string;
  author: string;
  date: string;
  readTime: string;
  image: string;
  tag: string;
  category: 'tip' | 'news' | 'blog';
  createdAt: Date;
  updatedAt: Date;
}

const HealthTipSchema = new Schema<IHealthTip>(
  {
    title: { type: String, required: true },
    excerpt: { type: String, required: true },
    content: { type: String },
    author: { type: String, required: true },
    date: { type: String, required: true },
    readTime: { type: String },
    image: { type: String },
    tag: { type: String },
    category: { type: String, enum: ['tip', 'news', 'blog'], default: 'tip' },
  },
  { timestamps: true }
);

export const HealthTip = mongoose.models.HealthTip || mongoose.model<IHealthTip>('HealthTip', HealthTipSchema);
