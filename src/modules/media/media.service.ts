import fs from 'fs';
import path from 'path';
import prisma from '../../lib/prisma';
import { getMediaType, IMAGE_SIZE_LIMIT, VIDEO_SIZE_LIMIT } from '../../middleware/upload';
import { env } from '../../config/env';

export const mediaService = {
  async saveMedia(file: Express.Multer.File) {
    const mediaType = getMediaType(file.mimetype);

    // Enforce per-type size limits
    if (mediaType === 'IMAGE' && file.size > IMAGE_SIZE_LIMIT) {
      // Delete the uploaded file
      fs.unlinkSync(file.path);
      throw new Error('Image files must be 10MB or smaller');
    }

    if (mediaType === 'VIDEO' && file.size > VIDEO_SIZE_LIMIT) {
      fs.unlinkSync(file.path);
      throw new Error('Video files must be 100MB or smaller');
    }

    const url = `${env.BASE_URL}/uploads/${file.filename}`;

    const media = await prisma.media.create({
      data: {
        filename: file.filename,
        originalName: file.originalname,
        url,
        type: mediaType,
        mimeType: file.mimetype,
        size: file.size,
      },
    });

    return media;
  },

  async listMedia() {
    return prisma.media.findMany({
      orderBy: { createdAt: 'desc' },
    });
  },

  async deleteMedia(id: string) {
    const media = await prisma.media.findUnique({ where: { id } });
    if (!media) throw new Error('Media not found');

    // Delete file from disk
    const filePath = path.join(process.cwd(), 'uploads', media.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await prisma.media.delete({ where: { id } });
  },
};
