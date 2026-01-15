import { dbAll, dbGet } from '../../../../../../database.js';

export async function GET({ params }) {
  const { tag, page, limit } = params;
  const offset = (Number(page) - 1) * Number(limit);

  try {
    const videos = await dbAll(
      `SELECT videos.*, GROUP_CONCAT(tags.name) AS tags
       FROM videos
       LEFT JOIN video_tags ON videos.id = video_tags.video_id
       LEFT JOIN tags ON video_tags.tag_id = tags.id
       WHERE tags.name = ?
       GROUP BY videos.id
       LIMIT ? OFFSET ?`,
      [tag, Number(limit), offset]
    );

    const totalRow = await dbGet(
      `SELECT COUNT(DISTINCT videos.id) as total
       FROM videos
       LEFT JOIN video_tags ON videos.id = video_tags.video_id
       LEFT JOIN tags ON video_tags.tag_id = tags.id
       WHERE tags.name = ?`,
      [tag]
    );

    return new Response(
      JSON.stringify({ videos, totalVideos: totalRow?.total ?? 0 }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Ошибка при получении видео по тегу:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
