import fs from 'fs/promises';
import path from 'path';
import { requireAuth } from '$lib/server/auth.js';
import { HttpError, errorResponse } from '$lib/server/http-error.js';
import {
  getVideoById,
  normalizeTags,
  replaceVideoTags,
  updateVideo,
} from '$lib/server/video-store.js';
import {
  UPLOAD_DIR,
  validateAndPersistFile,
} from '$lib/server/uploads.js';

export async function PUT(event) {
  const { id } = event.params;

  try {
    await requireAuth(event.request);

    const contentType = event.request.headers.get('content-type') || '';
    let title;
    let description;
    let tags;
    let shouldUpdateTags = false;
    let videoFile;

    if (contentType.includes('application/json')) {
      const body = await event.request.json();
      if ('title' in body) {
        title = body.title?.toString().trim();
        if (!title) {
          throw new HttpError(400, 'Название не может быть пустым.');
        }
      }
      if ('description' in body) {
        description = body.description?.toString().trim() ?? '';
      }
      if ('tags' in body) {
        if (!Array.isArray(body.tags)) {
          throw new HttpError(400, 'Поле tags должно быть массивом строк.');
        }
        shouldUpdateTags = true;
        tags = normalizeTags(body.tags);
      }
    } else {
      const formData = await event.request.formData();
      const rawTitle = formData.get('title');
      const rawDescription = formData.get('description');
      title =
        rawTitle !== null && typeof rawTitle !== 'undefined'
          ? rawTitle.toString().trim()
          : undefined;
      description =
        rawDescription !== null && typeof rawDescription !== 'undefined'
          ? rawDescription.toString().trim()
          : undefined;
      videoFile = formData.get('video_file');
      shouldUpdateTags = true;
      tags = normalizeTags(formData.getAll('tags[]'));
    }

    if (
      typeof title === 'undefined' &&
      typeof description === 'undefined' &&
      !shouldUpdateTags &&
      !videoFile
    ) {
      throw new HttpError(400, 'Не указаны поля для обновления.');
    }

    const existingVideo = await getVideoById(id);
    if (!existingVideo) {
      throw new HttpError(404, 'Видео не найдено');
    }

    let newFileName;
    if (videoFile instanceof File && videoFile.size) {
      const saved = await validateAndPersistFile(videoFile);
      newFileName = saved.filename;
      await deleteOldFile(existingVideo.video_file);
    }

    const updateFields = {};
    if (typeof title !== 'undefined') {
      updateFields.title = title;
    }
    if (typeof description !== 'undefined') {
      updateFields.description = description;
    }
    if (typeof newFileName !== 'undefined') {
      updateFields.video_file = newFileName;
    }

    if (Object.keys(updateFields).length) {
      await updateVideo({ id, ...updateFields });
    }

    if (shouldUpdateTags) {
      await replaceVideoTags(id, tags ?? []);
    }

    const updatedVideo = await getVideoById(id);

    return new Response(
      JSON.stringify({ success: true, video: updatedVideo }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Ошибка при обработке PUT запроса:', error);
    return errorResponse(error);
  }
}

async function deleteOldFile(filename) {
  if (!filename) {
    return;
  }

  const oldPath = path.resolve(process.cwd(), UPLOAD_DIR, filename);
  try {
    await fs.unlink(oldPath);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.warn('Не удалось удалить старый файл видео:', err);
    }
  }
}
