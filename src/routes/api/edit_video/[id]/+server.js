import db from '../../../../database.js';
import fs from 'fs/promises';
import path from 'path';

export async function PUT(request) {
  const { id } = request.params;

  try {
    const formData = await request.request.formData();

    if (!formData) {
      throw new Error('Данные формы не были предоставлены.');
    }

    const title = formData.get('title');
    const description = formData.get('description');
    const tags = formData.getAll('tags[]');
    const videoFile = formData.get('video_file');

    let updateQuery = 'UPDATE videos SET';
    const updateParams = [];
    if (title) {
      updateQuery += ' title = ?,';
      updateParams.push(title);
    }
    if (description) {
      updateQuery += ' description = ?,';
      updateParams.push(description);
    }
    if (videoFile) {
      const uploadDir = path.relative(process.cwd(), 'static/videos');
      await fs.mkdir(uploadDir, { recursive: true });
      const newFileName = `${Date.now()}_${videoFile.name}`;
      const filePath = path.join(uploadDir, newFileName);

      const buffer = Buffer.from(await videoFile.arrayBuffer());

      await fs.writeFile(filePath, buffer);

      updateQuery += ' video_file = ?,';
      updateParams.push(newFileName);
    }

    if (updateParams.length === 0) {
      throw new Error('Не указаны поля для обновления.');
    }

    updateQuery = updateQuery.slice(0, -1);
    updateQuery += ' WHERE id = ?';
    updateParams.push(id);

    await db.run(updateQuery, updateParams);

    await clearVideoTags(id);
    for (const tag of tags) {
      const tagId = await getTagId(tag);
      await addVideoTag(id, tagId);
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error('Ошибка при обработке PUT запроса:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500 }
    );
  }
}

async function getTagId(tag) {
  const existingTag = await dbAll('SELECT id FROM tags WHERE name = ?', [tag]);
  if (existingTag.length > 0) {
    console.log(`Идентификатор для тега '${tag}': ${existingTag[0].id}`);
    return existingTag[0].id;
  } else {
    console.log(`Тег '${tag}' не найден`);
    return null;
  }
}

async function addVideoTag(videoId, tagId) {
  await new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO video_tags (video_id, tag_id) VALUES (?, ?)',
      [videoId, tagId],
      function (err) {
        if (err) {
          reject(err);
        } else {
          console.log(
            `Связь между видео ${videoId} и тегом ${tagId} успешно добавлена`
          );
          resolve();
        }
      }
    );
  });
}

async function clearVideoTags(videoId) {
  await db.run('DELETE FROM video_tags WHERE video_id = ?', [videoId]);
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
