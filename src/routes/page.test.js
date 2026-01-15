import { render, screen } from '@testing-library/svelte';
import Page from './+page.svelte';

const mockVideos = [
  { id: 1, title: 'Demo video', description: 'Sample description' },
  { id: 2, title: 'Another', description: 'Second' },
];

describe('+page', () => {
  it('shows loading then renders videos', async () => {
    render(Page, { props: { initialVideos: mockVideos } });
    expect(screen.getByText('Demo video')).toBeTruthy();
    expect(screen.getByText('Sample description')).toBeTruthy();
  });
});
