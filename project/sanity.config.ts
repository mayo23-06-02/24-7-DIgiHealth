import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { visionTool } from '@sanity/vision'
import { schema } from './sanity/schemaTypes'
import { structure } from './sanity/structure'

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '03i3d4c0'
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'

export default defineConfig({
  basePath: '/studio',
  projectId,
  dataset,
  plugins: [
    structureTool({
      structure,
    }),
    visionTool(),
  ],
  schema,
})
