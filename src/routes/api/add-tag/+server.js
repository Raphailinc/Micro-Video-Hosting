import db from '../../../database.js';

export async function POST(request) {
  try {
    const body = await request.request.json();

    if (!body || !body.tag) {
      throw new Error('Тег не был предоставлен.');
    }

    const { tag } = body;

    await addTagToDatabase(tag);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Тег "${tag}" успешно добавлен`,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Ошибка при добавлении тега:', error);

    return new Response(
      JSON.stringify({ success: false, error: 'Ошибка при добавлении тега' }),
      { status: 500 }
    );
  }
}

async function addTagToDatabase(tag) {
  return new Promise((resolve, reject) => {
    db.run('INSERT INTO tags (name) VALUES (?)', [tag], function (err) {
      if (err) {
        console.error('Ошибка при добавлении тега в базу данных:', err);
        reject(err);
      } else {
        console.log(`Тег "${tag}" успешно добавлен в базу данных`);
        resolve();
      }
    });
  });
}
