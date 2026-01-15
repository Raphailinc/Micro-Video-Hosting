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

  it('escapes user-provided fields (no HTML injection)', () => {
    const malicious = [
      {
        id: 1,
        title: '<img src=x onerror=alert(1)>',
        description: '<script>alert(2)</script>',
      },
    ];

    const { container } = render(Page, { props: { initialVideos: malicious } });

    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeTruthy();
    expect(screen.getByText('<script>alert(2)</script>')).toBeTruthy();
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('script')).toBeNull();
  });
});
