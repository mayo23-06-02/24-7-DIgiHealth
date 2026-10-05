import { defineModel, type Document, type ModelClass } from '@/lib/db';
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

export const HealthTip: ModelClass<IHealthTip> = defineModel<IHealthTip>({
  name: 'HealthTip', table: 'health_tips',
  columns: { date: 'published_date' },
});
