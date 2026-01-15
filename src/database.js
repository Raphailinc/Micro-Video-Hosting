import sqlite3 from 'sqlite3';

const DB_FILE = process.env.DATABASE_FILE || './mydatabase.db';

let dbInstance = null;
let readyPromise = null;

async function openDatabase() {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await new Promise((resolve, reject) => {
    const instance = new sqlite3.Database(DB_FILE, (err) => {
      if (err) {
        reject(err);
      } else {
        console.log('Подключение к базе данных успешно установлено');
        resolve(instance);
      }
    });
  });

  return dbInstance;
}

async function ensureReady() {
  if (readyPromise) {
    return readyPromise;
  }

  readyPromise = (async () => {
    const db = await openDatabase();
    const run = (query) =>
      new Promise((resolve, reject) => {
        db.run(query, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });

    await run('PRAGMA foreign_keys = ON');
    await run(`CREATE TABLE IF NOT EXISTS videos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      video_file TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    await run(`CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    )`);
    await run(`CREATE TABLE IF NOT EXISTS video_tags (
      video_id INTEGER,
      tag_id INTEGER,
      FOREIGN KEY(video_id) REFERENCES videos(id),
      FOREIGN KEY(tag_id) REFERENCES tags(id),
      UNIQUE(video_id, tag_id)
    )`);
    await run(
      'CREATE INDEX IF NOT EXISTS idx_video_tags_video_id ON video_tags(video_id)'
    );
    await run(
      'CREATE INDEX IF NOT EXISTS idx_video_tags_tag_id ON video_tags(tag_id)'
    );
    await run(
      'CREATE INDEX IF NOT EXISTS idx_videos_created_at ON videos(created_at)'
    );

    try {
      await run(
        'ALTER TABLE videos ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP'
      );
    } catch (err) {
      if (!err.message.includes('duplicate column name')) {
        console.error('Ошибка при добавлении столбца created_at:', err.message);
        throw err;
      }
    }
  })();

  return readyPromise;
}

async function getDb() {
  await ensureReady();
  return dbInstance;
}

export async function dbAll(query, params = []) {
  const db = await getDb();
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

export async function dbGet(query, params = []) {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

export async function dbRun(query, params = []) {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    db.run(query, params, function (err) {
      if (err) {
        reject(err);
      } else {
        resolve(this);
      }
    });
  });
}

export default {
  get instance() {
    return dbInstance;
  },
};
