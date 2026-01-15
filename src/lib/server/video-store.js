import { dbAll, dbGet, dbRun } from '../../database.js';

const BASE_COLUMNS =
  'v.id, v.title, v.description, v.video_file, v.created_at';

export function normalizeTags(tags = []) {
  if (!Array.isArray(tags)) {
    return [];
  }
  const normalized = tags
    .map((tag) => (typeof tag === 'string' ? tag : `${tag ?? ''}`))
    .map((tag) => tag.trim())
    .filter(Boolean);

  return Array.from(new Set(normalized));
}

export async function fetchTags() {
  const rows = await dbAll('SELECT name FROM tags ORDER BY name');
  return rows.map((row) => row.name.trim());
}

export async function fetchTagsForVideo(videoId) {
  const rows = await dbAll(
    'SELECT t.name FROM tags t INNER JOIN video_tags vt ON vt.tag_id = t.id WHERE vt.video_id = ? ORDER BY t.name',
    [videoId]
  );
  return rows.map((row) => row.name.trim());
}

export async function fetchVideosWithTags({ tag, limit, offset, id } = {}) {
  const filters = [];
  const params = [];

  if (typeof id !== 'undefined') {
    filters.push('v.id = ?');
    params.push(id);
  }

  if (tag) {
    filters.push('t.name = ?');
    params.push(tag);
  }

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  let limitClause = '';
  if (typeof limit === 'number') {
    limitClause = ' LIMIT ? OFFSET ?';
    params.push(limit, offset ?? 0);
  }

  const rows = await dbAll(
    `SELECT ${BASE_COLUMNS}, t.name AS tag_name
     FROM videos v
     LEFT JOIN video_tags vt ON vt.video_id = v.id
     LEFT JOIN tags t ON t.id = vt.tag_id
     ${whereClause}
     ORDER BY v.id DESC, t.name ASC${limitClause}`,
    params
  );

  return mapVideoRows(rows);
}

export async function getVideoById(id) {
  const videos = await fetchVideosWithTags({ id });
  return videos[0] ?? null;
}

export async function countVideosByTag(tag) {
  const row = await dbGet(
    `SELECT COUNT(DISTINCT v.id) as total
     FROM videos v
     LEFT JOIN video_tags vt ON vt.video_id = v.id
     LEFT JOIN tags t ON t.id = vt.tag_id
     WHERE t.name = ?`,
    [tag]
  );

  return row?.total ?? 0;
}

export async function insertVideo({ title, description, video_file }) {
  const result = await dbRun(
    `INSERT INTO videos (title, description, video_file) VALUES (?, ?, ?)`,
    [title, description, video_file]
  );
  return result?.lastID;
}

export async function updateVideo({
  id,
  title,
  description,
  video_file = undefined,
}) {
  const fields = [];
  const params = [];

  if (typeof title !== 'undefined') {
    fields.push('title = ?');
    params.push(title);
  }

  if (typeof description !== 'undefined') {
    fields.push('description = ?');
    params.push(description);
  }

  if (typeof video_file !== 'undefined') {
    fields.push('video_file = ?');
    params.push(video_file);
  }

  if (!fields.length) {
    throw new Error('Не указаны поля для обновления.');
  }

  params.push(id);

  const result = await dbRun(
    `UPDATE videos SET ${fields.join(', ')} WHERE id = ?`,
    params
  );

  return result?.changes ?? 0;
}

export async function replaceVideoTags(videoId, tags = []) {
  const normalizedTags = normalizeTags(tags);

  await dbRun('BEGIN TRANSACTION');
  try {
    await dbRun('DELETE FROM video_tags WHERE video_id = ?', [videoId]);

    for (const tag of normalizedTags) {
      const tagId = await ensureTagExists(tag);
      if (tagId) {
        await dbRun(
          'INSERT OR IGNORE INTO video_tags (video_id, tag_id) VALUES (?, ?)',
          [videoId, tagId]
        );
      }
    }

    await dbRun('COMMIT');
  } catch (error) {
    await dbRun('ROLLBACK');
    throw error;
  }

  return normalizedTags;
}

async function ensureTagExists(tag) {
  const existing = await dbGet('SELECT id FROM tags WHERE name = ?', [tag]);
  if (existing?.id) {
    return existing.id;
  }

  const result = await dbRun('INSERT INTO tags (name) VALUES (?)', [tag]);
  return result?.lastID ?? null;
}

function mapVideoRows(rows) {
  const map = new Map();

  for (const row of rows) {
    if (!map.has(row.id)) {
      map.set(row.id, {
        id: row.id,
        title: row.title,
        description: row.description ?? '',
        video_file: row.video_file,
        created_at: row.created_at,
        tags: [],
      });
    }

    if (row.tag_name) {
      const video = map.get(row.id);
      if (!video.tags.includes(row.tag_name)) {
        video.tags.push(row.tag_name);
      }
    }
  }

  return Array.from(map.values());
}
