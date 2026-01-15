import { dbAll, dbRun } from '../../../database.js';
import fs from 'fs/promises';
import path from 'path';

export async function POST(request) {
  try {
    const formData = await request.request.formData();

    if (!formData) {
      throw new Error('Данные формы не были предоставлены.');
    }

    const title = formData.get('title');
    const description = formData.get('description');
    const tags = formData.getAll('tags[]');
    const videoFile = formData.get('video_file');

    if (!videoFile) {
      throw new Error('Видеофайл не был загружен.');
    }

    const uploadDir = path.relative(process.cwd(), 'static/videos');
    await fs.mkdir(uploadDir, { recursive: true });
    const newFileName = `${Date.now()}_${videoFile.name}`;
    const filePath = path.join(uploadDir, newFileName);

    const buffer = Buffer.from(await videoFile.arrayBuffer());

    await fs.writeFile(filePath, buffer);

    const result = await dbRun(
      `INSERT INTO videos (title, description, video_file) VALUES (?, ?, ?)`,
      [title, description, newFileName]
    );

    if (result) {
      const videoId = result.lastID;

      for (const tag of tags) {
        const tagId = await ensureTag(tag);
        if (tagId) {
          await addVideoTag(videoId, tagId);
        }
      }
    } else {
      console.error('Не удалось получить videoId');
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Ошибка при обработке POST запроса:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500 }
    );
  }
}

async function ensureTag(tag) {
  const existing = await dbAll('SELECT id FROM tags WHERE name = ?', [tag]);
  if (existing.length > 0) {
    return existing[0].id;
  }
  const inserted = await dbRun('INSERT INTO tags (name) VALUES (?)', [tag]);
  return inserted?.lastID ?? null;
}

async function addVideoTag(videoId, tagId) {
  await dbRun('INSERT OR IGNORE INTO video_tags (video_id, tag_id) VALUES (?, ?)', [videoId, tagId]);
}

export async function GET() {
  try {
    const rows = await dbAll('SELECT name FROM tags');
    const tags = rows.map(row => row.name.trim());
    return new Response(JSON.stringify({ tags }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Ошибка при запросе тегов:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}
