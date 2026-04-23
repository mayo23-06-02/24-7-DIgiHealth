import mongoose from 'mongoose';

const ArticleSchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  excerpt: { type: String, required: true },
  content: { type: String, required: true },      // HTML or markdown
  coverImage: { type: String, required: true },   // Cloudinary / placeholder URL
  author: { type: String, required: true },
  publishedAt: { type: Date, default: Date.now },
  readTimeMinutes: { type: Number, default: 5 },
  tags: [{ type: String }],
  likes: { type: Number, default: 0 },
  saves: { type: Number, default: 0 },
  shares: { type: Number, default: 0 },
  isPublished: { type: Boolean, default: true }
}, { timestamps: true });

export const Article = mongoose.models.Article || mongoose.model('Article', ArticleSchema);
