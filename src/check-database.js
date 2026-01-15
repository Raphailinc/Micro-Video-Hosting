import { dbAll } from './database.js';

export async function isDatabaseEmpty() {
  try {
    const rows = await dbAll('SELECT COUNT(*) as cnt FROM videos');
    return rows[0]?.cnt === 0;
  } catch (error) {
    console.error('Ошибка при проверке базы данных:', error);
    return true;
  }
}

// simple check when run directly
if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  isDatabaseEmpty()
    .then((isEmpty) =>
      console.log(isEmpty ? 'База данных пуста.' : 'База данных не пуста.')
    )
    .catch((err) => console.error(err));
}
