import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { FormData, File, Request } from 'undici';
import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';

globalThis.FormData = FormData;
globalThis.File = File;
globalThis.Request = Request;

const TEST_DIR = path.join(os.tmpdir(), 'micro-video-hosting-tests');
process.env.DATABASE_FILE = path.join(TEST_DIR, 'test.db');
process.env.UPLOAD_DIR = path.join(TEST_DIR, 'uploads');
process.env.MAX_UPLOAD_BYTES = `${1024 * 1024}`;
process.env.REQUIRE_AUTH = 'false';

let dbRun;
let insertVideo;
let replaceVideoTags;
let getVideoById;
let tagsRoute;
let addVideoRoute;
let editVideoRoute;

beforeAll(async () => {
  await fs.rm(TEST_DIR, { recursive: true, force: true });
  await fs.mkdir(TEST_DIR, { recursive: true });

  ({ dbRun } = await import('../src/database.js'));
  ({
    insertVideo,
    replaceVideoTags,
    getVideoById,
  } = await import('../src/lib/server/video-store.js'));

  tagsRoute = await import('../src/routes/api/tags/+server.js');
  addVideoRoute = await import('../src/routes/api/add-video/+server.js');
  editVideoRoute = await import('../src/routes/api/edit_video/[id]/+server.js');
});

beforeEach(async () => {
  process.env.REQUIRE_AUTH = 'false';
  process.env.MAX_UPLOAD_BYTES = `${1024 * 1024}`;

  await fs.rm(process.env.UPLOAD_DIR, { recursive: true, force: true });
  await fs.mkdir(process.env.UPLOAD_DIR, { recursive: true });

  await dbRun('DELETE FROM video_tags');
  await dbRun('DELETE FROM tags');
  await dbRun('DELETE FROM videos');
  await dbRun(
    "DELETE FROM sqlite_sequence WHERE name IN ('videos','tags','video_tags')"
  );
});

afterAll(async () => {
  await fs.rm(TEST_DIR, { recursive: true, force: true });
});

describe('API routes', () => {
  it('/api/tags returns tag list', async () => {
    const videoId = await insertVideo({
      title: 'Video 1',
      description: 'Desc',
      video_file: 'demo.mp4',
    });
    await replaceVideoTags(videoId, ['alpha', 'beta']);

    const response = await tagsRoute.GET();
    expect(response.status).toBe(200);
    const payload = await response.json();

    expect(payload.tags).toEqual(
      expect.arrayContaining(['alpha', 'beta'])
    );
  });

  it('rejects HTML uploads with 415', async () => {
    const formData = new FormData();
    formData.append('title', 'Bad');
    formData.append('description', 'desc');
    formData.append('tags[]', 'demo');
    formData.append(
      'video_file',
      new File(['<script>alert(1)</script>'], 'bad.html', {
        type: 'text/html',
      })
    );

    const response = await addVideoRoute.POST({
      request: {
        headers: new Headers(),
        formData: async () => formData,
      },
    });

    expect(response.status).toBe(415);
    const payload = await response.json();
    expect(payload.error).toBeTruthy();

    const files = await fs.readdir(process.env.UPLOAD_DIR);
    expect(files).toHaveLength(0);
  }, 10000);

  it('rejects oversized uploads with 413', async () => {
    process.env.MAX_UPLOAD_BYTES = '10';
    const formData = new FormData();
    formData.append('title', 'Too big');
    formData.append('description', 'desc');
    formData.append('tags[]', 'demo');
    formData.append(
      'video_file',
      new File([Buffer.alloc(20)], 'big.mp4', { type: 'video/mp4' })
    );

    const response = await addVideoRoute.POST({
      request: {
        headers: new Headers(),
        formData: async () => formData,
      },
    });

    expect(response.status).toBe(413);
    const files = await fs.readdir(process.env.UPLOAD_DIR);
    expect(files).toHaveLength(0);
  }, 10000);

  it('updates video tags when editing without file upload', async () => {
    const videoId = await insertVideo({
      title: 'Original',
      description: 'Old description',
      video_file: 'demo.mp4',
    });
    await replaceVideoTags(videoId, ['old', 'legacy']);

    const response = await editVideoRoute.PUT({
      params: { id: `${videoId}` },
      request: new Request(`http://localhost/api/edit_video/${videoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Updated',
          description: 'New description',
          tags: ['fresh', 'new-tag'],
        }),
      }),
    });

    expect(response.status).toBe(200);
    const payload = await response.json();

    expect(payload.video.title).toBe('Updated');
    expect(new Set(payload.video.tags)).toEqual(
      new Set(['fresh', 'new-tag'])
    );
    expect(payload.video.tags).not.toContain('old');

    const persistedVideo = await getVideoById(videoId);
    expect(new Set(persistedVideo.tags)).toEqual(
      new Set(['fresh', 'new-tag'])
    );
    expect(persistedVideo.video_file).toBe('demo.mp4');
  });
});
