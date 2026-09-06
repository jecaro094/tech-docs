import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const techDocs = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/tech-docs' }),
  schema: z.object({
    title: z.string(),
    tagline: z.string(),
    subtitle: z.string(),
    heroCta: z.object({
      primary: z.object({ label: z.string(), href: z.string() }),
      secondary: z.object({ label: z.string(), href: z.string() }),
    }),
    demo: z
      .object({
        youtubeId: z.string(),
        title: z.string(),
      })
      .optional(),
    code: z
      .object({
        filename: z.string().default(''),
        lang: z.string().default('python'),
        source: z.string(),
      })
      .optional(),
    features: z.array(
      z.object({
        icon: z.string(),
        title: z.string(),
        description: z.string(),
      }),
    ),
    technologies: z.array(
      z.object({
        heading: z.string(),
        items: z.array(z.string()),
      }),
    ),
    faqs: z.array(
      z.object({
        question: z.string(),
        answer: z.string(),
      }),
    ),
    cta: z.object({
      heading: z.string(),
      description: z.string(),
      url: z.string(),
      label: z.string(),
    }),
  }),
});

export const collections = { techDocs };
