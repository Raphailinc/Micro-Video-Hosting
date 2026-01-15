import {
  fetchTagsForVideo,
  getVideoById,
} from '$lib/server/video-store.js';

export async function GET({ params }) {
  try {
    const { id } = params;
    const video = await getVideoById(id);

    if (!video) {
      return new Response(JSON.stringify({ error: 'Video not found' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    const videoTags = await fetchTagsForVideo(id);

    return new Response(JSON.stringify({ tags: videoTags }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Ошибка при запросе тегов для видео:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}
