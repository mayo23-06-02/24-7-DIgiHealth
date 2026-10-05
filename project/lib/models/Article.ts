import { defineModel, type Document, type ModelClass } from '@/lib/db';

export const Article: ModelClass<any> = defineModel<any>({
  name: 'Article', table: 'articles',
});
