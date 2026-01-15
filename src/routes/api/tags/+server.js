import { dbAll } from '../../../database.js';

export async function GET() {
  try {
    const videoTags = await getVideoTags();
    const tagsFromTagsTable = await getTagsFromTagsTable();
    const allTags = [...new Set([...videoTags, ...tagsFromTagsTable])];
    
    return new Response(JSON.stringify({ tags: allTags }), {
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

async function getVideoTags() {
  const rows = await dbAll('SELECT tags FROM videos');
  const tags = [];
  rows.forEach(row => {
    if (row.tags) {
      const videoTags = row.tags.split(',');
      videoTags.forEach(tag => {
        if (!tags.includes(tag.trim())) {
          tags.push(tag.trim());
        }
      });
    }
  });
  return tags;
}

async function getTagsFromTagsTable() {
  const rows = await dbAll('SELECT name FROM tags');
  return rows.map(row => row.name.trim());
}
