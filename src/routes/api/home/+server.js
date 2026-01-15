import { dbAll } from '../../../database.js';

export async function GET() {
  try {
    const rows = await dbAll('SELECT * FROM videos ORDER BY id DESC LIMIT 6');
    return new Response(JSON.stringify({ videos: rows }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Ошибка при получении видео из базы данных:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
