import { Request, Response } from 'express';
import {
  pagesService,
  createPageSchema,
  updatePageSchema,
  createBlockSchema,
  updateBlockSchema,
  reorderBlocksSchema,
} from './pages.service';
import { sendSuccess, sendError } from '../../utils/response';

const param = (v: string | string[]): string =>
  Array.isArray(v) ? v[0] : v;

export const pagesController = {
  async listPages(_req: Request, res: Response): Promise<void> {
    try {
      const pages = await pagesService.listPages();
      sendSuccess(res, pages, 'Pages retrieved');
    } catch (err: any) {
      sendError(res, err.message || 'Failed to retrieve pages');
    }
  },

  async createPage(req: Request, res: Response): Promise<void> {
    try {
      const parsed = createPageSchema.safeParse(req.body);
      if (!parsed.success) {
        sendError(res, parsed.error.errors[0].message, 400);
        return;
      }

      const page = await pagesService.createPage(parsed.data);
      sendSuccess(res, page, 'Page created', 201);
    } catch (err: any) {
      sendError(
        res,
        err.message || 'Failed to create page',
        err.message?.includes('already exists') ? 409 : 500
      );
    }
  },

  async getPageById(req: Request, res: Response): Promise<void> {
    try {
      const page = await pagesService.getPageById(param(req.params.id));
      sendSuccess(res, page, 'Page retrieved');
    } catch (err: any) {
      sendError(
        res,
        err.message || 'Failed to retrieve page',
        err.message === 'Page not found' ? 404 : 500
      );
    }
  },

  async getPageBySlug(req: Request, res: Response): Promise<void> {
    try {
      const page = await pagesService.getPageBySlug(param(req.params.slug));
      sendSuccess(res, page, 'Page retrieved');
    } catch (err: any) {
      sendError(
        res,
        err.message || 'Failed to retrieve page',
        err.message === 'Page not found' ? 404 : 500
      );
    }
  },

  async updatePage(req: Request, res: Response): Promise<void> {
    try {
      const parsed = updatePageSchema.safeParse(req.body);
      if (!parsed.success) {
        sendError(res, parsed.error.errors[0].message, 400);
        return;
      }

      const page = await pagesService.updatePage(param(req.params.id), parsed.data);
      sendSuccess(res, page, 'Page updated');
    } catch (err: any) {
      sendError(
        res,
        err.message || 'Failed to update page',
        err.message === 'Page not found'
          ? 404
          : err.message?.includes('already exists')
          ? 409
          : 500
      );
    }
  },

  async deletePage(req: Request, res: Response): Promise<void> {
    try {
      await pagesService.deletePage(param(req.params.id));
      sendSuccess(res, null, 'Page deleted');
    } catch (err: any) {
      sendError(
        res,
        err.message || 'Failed to delete page',
        err.message === 'Page not found' ? 404 : 500
      );
    }
  },

  // Block controllers
  async addBlock(req: Request, res: Response): Promise<void> {
    try {
      const parsed = createBlockSchema.safeParse(req.body);
      if (!parsed.success) {
        sendError(res, parsed.error.errors[0].message, 400);
        return;
      }

      const block = await pagesService.addBlock(param(req.params.id), parsed.data);
      sendSuccess(res, block, 'Block added', 201);
    } catch (err: any) {
      sendError(
        res,
        err.message || 'Failed to add block',
        err.message === 'Page not found' ? 404 : 500
      );
    }
  },

  async updateBlock(req: Request, res: Response): Promise<void> {
    try {
      const parsed = updateBlockSchema.safeParse(req.body);
      if (!parsed.success) {
        sendError(res, parsed.error.errors[0].message, 400);
        return;
      }

      const block = await pagesService.updateBlock(
        param(req.params.id),
        param(req.params.blockId),
        parsed.data
      );
      sendSuccess(res, block, 'Block updated');
    } catch (err: any) {
      sendError(
        res,
        err.message || 'Failed to update block',
        err.message === 'Block not found' ? 404 : 500
      );
    }
  },

  async deleteBlock(req: Request, res: Response): Promise<void> {
    try {
      await pagesService.deleteBlock(param(req.params.id), param(req.params.blockId));
      sendSuccess(res, null, 'Block deleted');
    } catch (err: any) {
      sendError(
        res,
        err.message || 'Failed to delete block',
        err.message === 'Block not found' ? 404 : 500
      );
    }
  },

  async reorderBlocks(req: Request, res: Response): Promise<void> {
    try {
      const parsed = reorderBlocksSchema.safeParse(req.body);
      if (!parsed.success) {
        sendError(res, parsed.error.errors[0].message, 400);
        return;
      }

      const page = await pagesService.reorderBlocks(param(req.params.id), parsed.data);
      sendSuccess(res, page, 'Blocks reordered');
    } catch (err: any) {
      sendError(
        res,
        err.message || 'Failed to reorder blocks',
        err.message === 'Page not found' ? 404 : 500
      );
    }
  },
};
