import { Request, Response } from 'express';
import { mediaService } from './media.service';
import { sendSuccess, sendError } from '../../utils/response';

const param = (v: string | string[]): string =>
  Array.isArray(v) ? v[0] : v;

export const mediaController = {
  async upload(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        sendError(res, 'No file uploaded', 400);
        return;
      }

      const media = await mediaService.saveMedia(req.file);
      sendSuccess(res, media, 'File uploaded successfully', 201);
    } catch (err: any) {
      sendError(res, err.message || 'Upload failed', 500);
    }
  },

  async listMedia(_req: Request, res: Response): Promise<void> {
    try {
      const media = await mediaService.listMedia();
      sendSuccess(res, media, 'Media retrieved');
    } catch (err: any) {
      sendError(res, err.message || 'Failed to retrieve media');
    }
  },

  async deleteMedia(req: Request, res: Response): Promise<void> {
    try {
      await mediaService.deleteMedia(param(req.params.id));
      sendSuccess(res, null, 'Media deleted');
    } catch (err: any) {
      sendError(
        res,
        err.message || 'Failed to delete media',
        err.message === 'Media not found' ? 404 : 500
      );
    }
  },
};
