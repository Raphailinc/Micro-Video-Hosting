import { dbRun } from '../../../database.js';
import { requireAuth } from '$lib/server/auth.js';
import { errorResponse, HttpError } from '$lib/server/http-error.js';

export async function POST(event) {
  try {
    await requireAuth(event.request);

    const body = await event.request.json();

    if (!body || !body.tag) {
      throw new HttpError(400, 'Тег не был предоставлен.');
    }

    const tag = body.tag.toString().trim();
    if (!tag) {
      throw new HttpError(400, 'Тег не был предоставлен.');
    }

    await addTagToDatabase(tag);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Тег "${tag}" успешно добавлен`,
      }),
      { status: 201 }
    );
  } catch (error) {
    console.error('Ошибка при добавлении тега:', error);

    return errorResponse(error);
  }
}

async function addTagToDatabase(tag) {
  await dbRun('INSERT OR IGNORE INTO tags (name) VALUES (?)', [tag]);
}
