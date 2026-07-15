import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import { Request } from 'express';
import { sendError } from '../utils/response';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

const IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
];

const VIDEO_MIME_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];

const ALLOWED_MIME_TYPES = [...IMAGE_MIME_TYPES, ...VIDEO_MIME_TYPES];

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const sanitized = file.originalname
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9.\-_]/g, '');
    const filename = `${Date.now()}-${sanitized}`;
    cb(null, filename);
  },
});

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${file.mimetype}`));
  }
};

// 100MB max (videos); we enforce per-type limits in the controller/service
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB absolute ceiling
  },
});

export const getMediaType = (
  mimeType: string
): 'IMAGE' | 'VIDEO' | 'DOCUMENT' => {
  if (IMAGE_MIME_TYPES.includes(mimeType)) return 'IMAGE';
  if (VIDEO_MIME_TYPES.includes(mimeType)) return 'VIDEO';
  return 'DOCUMENT';
};

export const IMAGE_SIZE_LIMIT = 10 * 1024 * 1024; // 10MB
export const VIDEO_SIZE_LIMIT = 100 * 1024 * 1024; // 100MB
