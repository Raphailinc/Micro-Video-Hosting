import { dbGet } from '../../../../database.js';

export async function GET(request) {
  const { id } = request.params;

  try {
    const video = await getVideoWithTags(id);
    if (!video) {
      return new Response(JSON.stringify({ error: 'Video not found' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    return new Response(JSON.stringify(video), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error fetching video from database:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}

async function getVideoWithTags(id) {
  return dbGet(
    `SELECT videos.*, GROUP_CONCAT(tags.name) AS tags
       FROM videos
       LEFT JOIN video_tags ON videos.id = video_tags.video_id
       LEFT JOIN tags ON video_tags.tag_id = tags.id
       WHERE videos.id = ?`,
    [id]
  );
}
