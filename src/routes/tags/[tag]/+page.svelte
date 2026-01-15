<script>
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';

  export let data;
  export let BASE_URL;

  let videos = [];
  let currentPage = 1;
  let maxPage = 1;
  const limit = 6;
  const tag = data.props.tag;
  let normalizedBase = '';

  onMount(async () => {
    await loadVideos();
  });

  async function loadVideos() {
    try {
      const response = await fetch(
        `/api/videos-by-tag/${tag}/${currentPage}/${limit}`
      );
      if (!response.ok) {
        throw new Error('Ошибка загрузки видео по тегу');
      }
      const { videos: fetchedVideos, totalVideos } = await response.json();
      videos = fetchedVideos;
      maxPage = Math.max(1, Math.ceil(totalVideos / limit));
    } catch (error) {
      console.error('Ошибка при загрузке видео по тегу:', error);
      goto('/');
    }
  }

  async function goToPage(page) {
    currentPage = page;
    await loadVideos();
  }

  onDestroy(() => {
    currentPage = 1;
  });

  $: {
    normalizedBase = (BASE_URL || '').replace(/\/$/, '');
  }

  const buildVideoUrl = (file) =>
    normalizedBase ? `${normalizedBase}/videos/${file}` : `/videos/${file}`;

  BASE_URL = data.props.BASE_URL;
</script>

{#if videos.length > 0}
  <h1>Видео по тегу</h1>
  <div class="video-grid">
    {#each videos as video}
      <div class="video-card">
        <h2>Заголовок: {video.title}</h2>
        <p>Описание: {video.description}</p>
        <video controls>
          <source src="{buildVideoUrl(video.video_file)}" type="video/mp4" />
          <track kind="captions" src="captions.vtt" srclang="en" label="English" />
          Нет доступного видео.
        </video>
        {#if video.tags?.length}
          <ul class="tag-list">
            {#each video.tags as tag}
              <li>{tag}</li>
            {/each}
          </ul>
        {/if}
      </div>
    {/each}
  </div>

  <div class="pagination">
    {#if currentPage > 1}
      <button on:click={() => goToPage(currentPage - 1)}>Предыдущая</button>
    {/if}
    <span>Страница {currentPage}</span>
    {#if currentPage < maxPage}
      <button on:click={() => goToPage(currentPage + 1)}>Следующая</button>
    {/if}
  </div>
{:else}
  <p>Нет видео по выбранному тегу.</p>
{/if}
