import { z } from 'zod';
import prisma from '../../lib/prisma';

export const createPageSchema = z.object({
  slug: z
    .string()
    .min(1, 'Slug is required')
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  metaTitle: z.string().optional(),
  metaDesc: z.string().optional(),
  isPublished: z.boolean().optional().default(false),
});

export const updatePageSchema = createPageSchema.partial();

export const createBlockSchema = z.object({
  type: z.enum([
    'HEADING',
    'TEXT',
    'IMAGE',
    'VIDEO',
    'BUTTON',
    'DIVIDER',
    'EMBED',
    'SPACER',
    'COLUMNS',
  ]),
  order: z.number().int().min(0),
  content: z.record(z.any()).default({}),
  styles: z.record(z.any()).default({}),
  isVisible: z.boolean().optional().default(true),
});

export const updateBlockSchema = createBlockSchema.partial();

export const reorderBlocksSchema = z.array(
  z.object({
    id: z.string(),
    order: z.number().int().min(0),
  })
);

export const pagesService = {
  async listPages() {
    return prisma.page.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { blocks: true } },
      },
    });
  },

  async createPage(data: z.infer<typeof createPageSchema>) {
    const existing = await prisma.page.findUnique({
      where: { slug: data.slug },
    });
    if (existing) {
      throw new Error('A page with this slug already exists');
    }

    return prisma.page.create({ data });
  },

  async getPageById(id: string) {
    const page = await prisma.page.findUnique({
      where: { id },
      include: {
        blocks: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!page) throw new Error('Page not found');
    return page;
  },

  async getPageBySlug(slug: string) {
    const page = await prisma.page.findUnique({
      where: { slug },
      include: {
        blocks: {
          where: { isVisible: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!page) throw new Error('Page not found');
    if (!page.isPublished) throw new Error('Page not found');
    return page;
  },

  async updatePage(id: string, data: z.infer<typeof updatePageSchema>) {
    const page = await prisma.page.findUnique({ where: { id } });
    if (!page) throw new Error('Page not found');

    if (data.slug && data.slug !== page.slug) {
      const existing = await prisma.page.findUnique({
        where: { slug: data.slug },
      });
      if (existing) throw new Error('A page with this slug already exists');
    }

    return prisma.page.update({ where: { id }, data });
  },

  async deletePage(id: string) {
    const page = await prisma.page.findUnique({ where: { id } });
    if (!page) throw new Error('Page not found');
    await prisma.page.delete({ where: { id } });
  },

  // Block operations
  async addBlock(pageId: string, data: z.infer<typeof createBlockSchema>) {
    const page = await prisma.page.findUnique({ where: { id: pageId } });
    if (!page) throw new Error('Page not found');

    return prisma.pageBlock.create({
      data: {
        pageId,
        type: data.type,
        order: data.order,
        content: data.content,
        styles: data.styles,
        isVisible: data.isVisible ?? true,
      },
    });
  },

  async updateBlock(
    pageId: string,
    blockId: string,
    data: z.infer<typeof updateBlockSchema>
  ) {
    const block = await prisma.pageBlock.findFirst({
      where: { id: blockId, pageId },
    });
    if (!block) throw new Error('Block not found');

    return prisma.pageBlock.update({
      where: { id: blockId },
      data,
    });
  },

  async deleteBlock(pageId: string, blockId: string) {
    const block = await prisma.pageBlock.findFirst({
      where: { id: blockId, pageId },
    });
    if (!block) throw new Error('Block not found');
    await prisma.pageBlock.delete({ where: { id: blockId } });
  },

  async reorderBlocks(
    pageId: string,
    items: z.infer<typeof reorderBlocksSchema>
  ) {
    const page = await prisma.page.findUnique({ where: { id: pageId } });
    if (!page) throw new Error('Page not found');

    await prisma.$transaction(
      items.map(({ id, order }) =>
        prisma.pageBlock.update({
          where: { id },
          data: { order },
        })
      )
    );

    return prisma.page.findUnique({
      where: { id: pageId },
      include: {
        blocks: { orderBy: { order: 'asc' } },
      },
    });
  },
};
