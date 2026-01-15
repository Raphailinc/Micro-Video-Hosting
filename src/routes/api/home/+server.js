import { fetchVideosWithTags } from '$lib/server/video-store.js';

export async function GET() {
  try {
    const videos = await fetchVideosWithTags({ limit: 6, offset: 0 });
    return new Response(JSON.stringify({ videos }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Ошибка при получении видео из базы данных:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
