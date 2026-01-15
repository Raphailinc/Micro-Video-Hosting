import {
  countVideosByTag,
  fetchVideosWithTags,
} from '$lib/server/video-store.js';
import { HttpError, errorResponse } from '$lib/server/http-error.js';

export async function GET({ params }) {
  const { tag, page, limit } = params;

  try {
    const numericLimit = Number(limit);
    const pageNumber = Number(page);

    if (!Number.isFinite(numericLimit) || numericLimit <= 0) {
      throw new HttpError(400, 'Некорректное значение limit.');
    }

    if (!Number.isFinite(pageNumber) || pageNumber <= 0) {
      throw new HttpError(400, 'Некорректный номер страницы.');
    }

    const offset = (pageNumber - 1) * numericLimit;

    const videos = await fetchVideosWithTags({
      tag,
      limit: numericLimit,
      offset,
    });

    const totalVideos = await countVideosByTag(tag);

    return new Response(
      JSON.stringify({ videos, totalVideos }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Ошибка при получении видео по тегу:', error);
    return errorResponse(error);
  }
}
