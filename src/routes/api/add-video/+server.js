import { requireAuth } from '$lib/server/auth.js';
import { HttpError, errorResponse } from '$lib/server/http-error.js';
import {
  fetchTags,
  insertVideo,
  normalizeTags,
  replaceVideoTags,
} from '$lib/server/video-store.js';
import { validateAndPersistFile } from '$lib/server/uploads.js';

export async function POST(event) {
  try {
    await requireAuth(event.request);

    const formData = await event.request.formData();

    const title = formData.get('title')?.toString().trim();
    const description = formData.get('description')?.toString().trim() ?? '';
    const tags = normalizeTags(formData.getAll('tags[]'));
    const videoFile = formData.get('video_file');

    if (!title) {
      throw new HttpError(400, 'Пожалуйста, укажите название видео.');
    }

    if (!(videoFile instanceof File)) {
      throw new HttpError(400, 'Видеофайл не был загружен.');
    }

    const { filename } = await validateAndPersistFile(videoFile);

    const videoId = await insertVideo({
      title,
      description,
      video_file: filename,
    });

    /* c8 ignore next 3 */
    if (!videoId) {
      throw new Error('Не удалось получить videoId');
    }

    await replaceVideoTags(videoId, tags);

    return new Response(
      JSON.stringify({ success: true, id: videoId, video_file: filename }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Ошибка при обработке POST запроса:', error);
    return errorResponse(error);
  }
}

export async function GET() {
  try {
    const tags = await fetchTags();
    return new Response(JSON.stringify({ tags }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Ошибка при запросе тегов:', error);
    return errorResponse(error);
  }
}
