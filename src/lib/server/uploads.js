import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { fileTypeFromBuffer } from 'file-type';
import { HttpError } from './http-error.js';

const ALLOWED_MIME_TO_EXT = new Map([
  ['video/mp4', '.mp4'],
  ['video/webm', '.webm'],
  ['video/ogg', '.ogv'],
  ['video/quicktime', '.mov'],
]);

const DEFAULT_MAX_BYTES = 100 * 1024 * 1024;

export const UPLOAD_DIR =
  process.env.UPLOAD_DIR || path.join('static', 'videos');

export function getMaxUploadBytes() {
  return Number(process.env.MAX_UPLOAD_BYTES ?? DEFAULT_MAX_BYTES);
}

export function allowedMimeTypes() {
  return Array.from(ALLOWED_MIME_TO_EXT.keys());
}

export async function validateAndPersistFile(file) {
  if (!file || typeof file.arrayBuffer !== 'function') {
    throw new HttpError(400, 'Видеофайл не был загружен.');
  }

  const maxSize = getMaxUploadBytes();
  if (file.size > maxSize) {
    throw new HttpError(413, 'Размер файла превышает допустимый лимит.');
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.isBuffer(arrayBuffer)
    ? arrayBuffer
    : Buffer.from(arrayBuffer);
  const detectedType = await fileTypeFromBuffer(new Uint8Array(buffer));
  const extension = resolveExtension(file.type, detectedType?.mime);

  if (!extension) {
    throw new HttpError(415, 'Неподдерживаемый тип медиа.');
  }

  const safeName = `${crypto.randomUUID()}${extension}`;
  const uploadRoot = path.resolve(process.cwd(), UPLOAD_DIR);
  await fs.mkdir(uploadRoot, { recursive: true });
  const targetPath = path.join(uploadRoot, safeName);
  const relative = path.relative(uploadRoot, targetPath);

  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new HttpError(400, 'Некорректное имя файла.');
  }

  await fs.writeFile(targetPath, buffer);

  return { filename: safeName, fullPath: targetPath };
}

function resolveExtension(declaredType, detectedType) {
  const declaredExt = declaredType
    ? ALLOWED_MIME_TO_EXT.get(declaredType)
    : undefined;
  const detectedExt = detectedType
    ? ALLOWED_MIME_TO_EXT.get(detectedType)
    : undefined;

  if (detectedType) {
    if (!detectedExt) {
      return null;
    }
    if (declaredExt && declaredExt !== detectedExt) {
      return null;
    }
    return detectedExt;
  }

  return declaredExt ?? null;
}
