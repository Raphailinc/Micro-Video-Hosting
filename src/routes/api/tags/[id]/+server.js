import db from '../../../../database.js';

export async function GET(request) {
  try {
    const { id } = request.params;

    const videoTags = await getVideoTags(id);

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

async function getVideoTags(videoId) {
  const rows = await dbAll(
    'SELECT tags.name FROM tags INNER JOIN video_tags ON tags.id = video_tags.tag_id WHERE video_tags.video_id = ?',
    [videoId]
  );
  return rows.map((row) => row.name.trim());
}

function dbAll(query, params) {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}
