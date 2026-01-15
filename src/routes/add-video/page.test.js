import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { vi } from 'vitest';
import AddVideo from './+page.svelte';

vi.mock('$app/navigation', () => ({ goto: vi.fn() }));

const mockFetchQueue = (responses) => {
  let call = 0;
  const handler = vi.fn(() => {
    const res = responses[call] || responses[responses.length - 1];
    call += 1;
    return Promise.resolve({
      ok: true,
      json: async () => res,
    });
  });
  global.fetch = handler;
  globalThis.fetch = handler;
  if (typeof window !== 'undefined') {
    window.fetch = handler;
  }
  return handler;
};

describe('add-video page', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('submits new video with tags and file', async () => {
    const fetchMock = mockFetchQueue([
      { tags: ['nasa', 'mars'] }, // fetchAvailableVideos when editing
      { id: 1, title: 'Old video', description: 'desc', tags: ['nasa'] }, // fetchSelectedVideo (not used)
    ]);

    render(AddVideo, { props: { initialTags: ['nasa', 'mars'] } });

    const titleInput = screen.getByLabelText('Название:');
    const descInput = screen.getByLabelText('Описание:');
    const fileInput = screen.getByLabelText('Видеофайл:');

    await fireEvent.input(titleInput, { target: { value: 'Demo' } });
    await fireEvent.input(descInput, { target: { value: 'Sample' } });

    const file = new File(['dummy'], 'demo.mp4', { type: 'video/mp4' });
    await fireEvent.change(fileInput, { target: { files: [file] } });

    const submit = screen.getByRole('button', { name: /Добавить/i });
    await fireEvent.click(submit);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1)); // submit
  });
});
