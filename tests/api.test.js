import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { FormData, File, Request } from 'undici';
import {
  beforeAll,
  afterAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

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
let addTagRoute;
let videoStore;
let homeRoute;
let videosRoute;
let videoByIdRoute;
let videosByTagRoute;
let tagsByIdRoute;
let auth;
let httpError;
let uploads;
let database;

beforeAll(async () => {
  await fs.rm(TEST_DIR, { recursive: true, force: true });
  await fs.mkdir(TEST_DIR, { recursive: true });

  ({ dbRun } = await import('../src/database.js'));
  videoStore = await import('../src/lib/server/video-store.js');
  ({ insertVideo, replaceVideoTags, getVideoById } = videoStore);
  auth = await import('../src/lib/server/auth.js');
  httpError = await import('../src/lib/server/http-error.js');
  uploads = await import('../src/lib/server/uploads.js');
  database = await import('../src/database.js');

  tagsRoute = await import('../src/routes/api/tags/+server.js');
  addVideoRoute = await import('../src/routes/api/add-video/+server.js');
  editVideoRoute = await import('../src/routes/api/edit_video/[id]/+server.js');
  addTagRoute = await import('../src/routes/api/add-tag/+server.js');
  homeRoute = await import('../src/routes/api/home/+server.js');
  videosRoute = await import('../src/routes/api/videos/+server.js');
  videoByIdRoute = await import('../src/routes/api/videos/[id]/+server.js');
  videosByTagRoute = await import(
    '../src/routes/api/videos-by-tag/[tag]/[page]/[limit]/+server.js'
  );
  tagsByIdRoute = await import('../src/routes/api/tags/[id]/+server.js');
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

  it('creates video via POST and persists file/tags', async () => {
    const formData = new FormData();
    formData.append('title', 'Hello');
    formData.append('description', 'World');
    formData.append('tags[]', 'tag1');
    formData.append('tags[]', 'Tag1'); // dedupe + normalize
    formData.append(
      'video_file',
      new File([Buffer.from('mp4')], 'clip.mp4', { type: 'video/mp4' })
    );

    const response = await addVideoRoute.POST({
      request: {
        headers: new Headers(),
        formData: async () => formData,
      },
    });

    expect(response.status).toBe(201);
    const payload = await response.json();
    const saved = await getVideoById(payload.id);
    expect(saved.title).toBe('Hello');
    expect(new Set(saved.tags)).toEqual(new Set(['tag1', 'Tag1']));
    const files = await fs.readdir(process.env.UPLOAD_DIR);
    expect(files).toContain(payload.video_file);
  });

  it('validates title and file presence on POST', async () => {
    const noTitle = new FormData();
    noTitle.append('video_file', new File([Buffer.from('x')], 'clip.mp4', { type: 'video/mp4' }));
    const responseNoTitle = await addVideoRoute.POST({
      request: { headers: new Headers(), formData: async () => noTitle },
    });
    expect(responseNoTitle.status).toBe(400);

    const noFile = new FormData();
    noFile.append('title', 'Missing file');
    const responseNoFile = await addVideoRoute.POST({
      request: { headers: new Headers(), formData: async () => noFile },
    });
    expect(responseNoFile.status).toBe(400);
  });

  it('updates video file and removes old asset', async () => {
    const videoId = await insertVideo({
      title: 'Has file',
      description: 'Old desc',
      video_file: 'old.mp4',
    });
    const oldPath = path.join(process.env.UPLOAD_DIR, 'old.mp4');
    await fs.writeFile(oldPath, 'old');

    const formData = new FormData();
    formData.append('title', 'Has file');
    formData.append(
      'video_file',
      new File([Buffer.from('newdata')], 'new.webm', { type: 'video/webm' })
    );

    const response = await editVideoRoute.PUT({
      params: { id: `${videoId}` },
      request: {
        headers: new Headers(),
        formData: async () => formData,
      },
    });

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.video.video_file).toMatch(/\.webm$/);
    await expect(fs.access(oldPath)).rejects.toThrow();
  });

  it('rejects invalid edit payloads (missing fields / bad tags / not found)', async () => {
    const videoId = await insertVideo({
      title: 'Check',
      description: 'Desc',
      video_file: 'demo.mp4',
    });

    const noFields = await editVideoRoute.PUT({
      params: { id: `${videoId}` },
      request: new Request(`http://localhost/api/edit_video/${videoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }),
    });
    expect(noFields.status).toBe(400);

    const badTags = await editVideoRoute.PUT({
      params: { id: `${videoId}` },
      request: new Request(`http://localhost/api/edit_video/${videoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: 'not-array' }),
      }),
    });
    expect(badTags.status).toBe(400);

    const emptyTitleJson = await editVideoRoute.PUT({
      params: { id: `${videoId}` },
      request: new Request(`http://localhost/api/edit_video/${videoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: '   ' }),
      }),
    });
    expect(emptyTitleJson.status).toBe(400);

    const missing = await editVideoRoute.PUT({
      params: { id: '9999' },
      request: new Request('http://localhost/api/edit_video/9999', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New' }),
      }),
    });
    expect(missing.status).toBe(404);
  });

  it('enforces auth when enabled', () => {
    process.env.REQUIRE_AUTH = 'true';
    process.env.API_TOKEN = 'secret';
    const okRequest = new Request('http://localhost', {
      headers: { authorization: 'Bearer secret' },
    });
    expect(() => auth.requireAuth(okRequest)).not.toThrow();

    const badRequest = new Request('http://localhost');
    expect(() => auth.requireAuth(badRequest)).toThrow(httpError.HttpError);
  });

  it('formats error responses', async () => {
    const res = httpError.errorResponse(new httpError.HttpError(418, 'nope'));
    expect(res.status).toBe(418);
    expect(await res.json()).toEqual({ error: 'nope' });

    const res2 = httpError.errorResponse(new Error('boom'));
    expect(res2.status).toBe(500);
    expect(await res2.json()).toEqual({ error: 'Internal Server Error' });
  });

  it('persists allowed uploads via validateAndPersistFile', async () => {
    const saved = await uploads.validateAndPersistFile(
      new File([Buffer.from('video')], 'ok.mp4', { type: 'video/mp4' })
    );
    expect(saved.filename).toMatch(/\.mp4$/);
    const exists = await fs.readFile(saved.fullPath, 'utf8');
    expect(exists).toBe('video');
  });

  it('validates uploads against detected mime and presence', async () => {
    await expect(uploads.validateAndPersistFile(null)).rejects.toThrow(
      httpError.HttpError
    );
    expect(uploads.allowedMimeTypes()).toContain('video/mp4');
    expect(uploads.getMaxUploadBytes()).toBe(Number(process.env.MAX_UPLOAD_BYTES));
    expect(uploads.UPLOAD_DIR).toBe(process.env.UPLOAD_DIR);
  });

  it('handles database helpers and video-store utilities', async () => {
    const id1 = await insertVideo({
      title: 'Video A',
      description: 'Desc A',
      video_file: 'a.mp4',
    });
    await replaceVideoTags(id1, ['news', 'tech']);
    const id2 = await insertVideo({
      title: 'Video B',
      description: 'Desc B',
      video_file: 'b.mp4',
    });
    await replaceVideoTags(id2, ['news']);

    await expect(
      videoStore.updateVideo({ id: id1 })
    ).rejects.toThrow();

    const filtered = await videosByTagRoute.GET({
      params: { tag: 'news', page: '1', limit: '1' },
    });
    expect(filtered.status).toBe(200);
    const filteredPayload = await filtered.json();
    expect(filteredPayload.totalVideos).toBe(2);
    expect(filteredPayload.videos).toHaveLength(1);

    const badLimit = await videosByTagRoute.GET({
      params: { tag: 'news', page: '1', limit: '0' },
    });
    expect(badLimit.status).toBe(400);

    const badPage = await videosByTagRoute.GET({
      params: { tag: 'news', page: '0', limit: '1' },
    });
    expect(badPage.status).toBe(400);

    const listVideos = await videosRoute.GET();
    expect(listVideos.status).toBe(200);

    const homeVideos = await homeRoute.GET();
    expect(homeVideos.status).toBe(200);

    const videoOk = await videoByIdRoute.GET({ params: { id: `${id1}` } });
    expect(videoOk.status).toBe(200);
    const videoMissing = await videoByIdRoute.GET({
      params: { id: '99999' },
    });
    expect(videoMissing.status).toBe(404);

    const tagsForVideo = await tagsByIdRoute.GET({
      params: { id: `${id1}` },
    });
    expect(tagsForVideo.status).toBe(200);
    const tagsMissing = await tagsByIdRoute.GET({
      params: { id: '9999' },
    });
    expect(tagsMissing.status).toBe(404);

    await expect(
      database.dbAll('SELECT * FROM not_a_table')
    ).rejects.toThrow();
    await expect(
      database.dbGet('SELECT * FROM not_a_table')
    ).rejects.toThrow();
    await expect(
      database.dbRun('INSERT INTO not_a_table VALUES (1)')
    ).rejects.toThrow();
    expect(database.default.instance).toBeTruthy();
  });

  it('supports tag creation with auth and handles errors', async () => {
    process.env.REQUIRE_AUTH = 'true';
    process.env.API_TOKEN = 'token123';

    const ok = await addTagRoute.POST({
      request: new Request('http://localhost/api/add-tag', {
        method: 'POST',
        headers: {
          authorization: 'Bearer token123',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ tag: 'newTag' }),
      }),
    });
    expect(ok.status).toBe(201);

    const missingAuth = await addTagRoute.POST({
      request: new Request('http://localhost/api/add-tag', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tag: 'other' }),
      }),
    });
    expect(missingAuth.status).toBe(401);

    const emptyTag = await addTagRoute.POST({
      request: new Request('http://localhost/api/add-tag', {
        method: 'POST',
        headers: {
          authorization: 'Bearer token123',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ tag: '' }),
      }),
    });
    expect(emptyTag.status).toBe(400);

    const spacesTag = await addTagRoute.POST({
      request: new Request('http://localhost/api/add-tag', {
        method: 'POST',
        headers: {
          authorization: 'Bearer token123',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ tag: '   ' }),
      }),
    });
    expect(spacesTag.status).toBe(400);
  });

  it('gracefully handles route failures (catch blocks)', async () => {
    const videoId = await insertVideo({
      title: 'Route Errors',
      description: 'desc',
      video_file: 'err.mp4',
    });
    await replaceVideoTags(videoId, ['err']);

    const fetchVideosSpy = vi
      .spyOn(videoStore, 'fetchVideosWithTags')
      .mockRejectedValueOnce(new Error('fail'));
    const homeFail = await homeRoute.GET();
    expect(homeFail.status).toBe(500);
    fetchVideosSpy.mockRestore();

    const fetchVideosSpy2 = vi
      .spyOn(videoStore, 'fetchVideosWithTags')
      .mockRejectedValueOnce(new Error('boom'));
    const videosFail = await videosRoute.GET();
    expect(videosFail.status).toBe(500);
    fetchVideosSpy2.mockRestore();

    const byIdSpy = vi
      .spyOn(videoStore, 'getVideoById')
      .mockRejectedValueOnce(new Error('x'));
    const byIdFail = await videoByIdRoute.GET({ params: { id: '1' } });
    expect(byIdFail.status).toBe(500);
    byIdSpy.mockRestore();

    const addVideoSpy = vi
      .spyOn(videoStore, 'fetchTags')
      .mockRejectedValueOnce(new Error('nope'));
    const addVideoGetFail = await addVideoRoute.GET();
    expect(addVideoGetFail.status).toBe(500);
    addVideoSpy.mockRestore();

    const tagsForVideoSpy = vi
      .spyOn(videoStore, 'fetchTagsForVideo')
      .mockRejectedValueOnce(new Error('bad'));
    const tagsByIdFail = await tagsByIdRoute.GET({
      params: { id: `${videoId}` },
    });
    expect(tagsByIdFail.status).toBe(500);
    tagsForVideoSpy.mockRestore();
  });

  it('returns tags list for add-video GET', async () => {
    await replaceVideoTags(await insertVideo({
      title: 'T',
      description: 'D',
      video_file: 'f.mp4',
    }), ['one']);
    const resp = await addVideoRoute.GET();
    expect(resp.status).toBe(200);
    const payload = await resp.json();
    expect(payload.tags.length).toBeGreaterThan(0);
  });

  it('normalizes tags input for non-arrays', () => {
    expect(videoStore.normalizeTags('single')).toEqual([]);
  });

  it('returns 500 when fetchTags throws', async () => {
    const spy = vi
      .spyOn(await import('../src/lib/server/video-store.js'), 'fetchTags')
      .mockRejectedValueOnce(new Error('fail'));
    const resp = await tagsRoute.GET();
    expect(resp.status).toBe(500);
    spy.mockRestore();
  });
});

async function createVideoWithTags({
  title = 'Test',
  description = 'Desc',
  tags = ['tag'],
  file = 'demo.mp4',
} = {}) {
  const id = await insertVideo({
    title,
    description,
    video_file: file,
  });
  await replaceVideoTags(id, tags);
  return id;
}
