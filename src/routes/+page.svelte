<script>
  import { onMount } from 'svelte';

  export let initialVideos = [];

  let videos = initialVideos;
  let loading = initialVideos.length === 0;

  onMount(async () => {
    if (initialVideos.length) {
      loading = false;
      return;
    }
    try {
      const response = await fetch(`/api/home`);
      const data = await response.json();
      videos = data.videos;
      loading = false;
    } catch (err) {
      console.error('Ошибка при получении видео:', err);
    }
  });

</script>

{#if loading}
  <p>Загрузка...</p>
{:else if videos.length > 0}
  <div class="video-grid">
    {#each videos.slice(0, 6) as video, index}
      <a class="video-card" href={`/video/${video.id}`}>
        <div class="video-info">
          <h3 class="video-title">{video.title}</h3>
          <p class="video-description">{video.description}</p>
        </div>
      </a>
      {#if (index + 1) % 3 === 0}
        <div class="w-100"></div>
      {/if}
    {/each}
  </div>
{:else}
  <p>Нет добавленных видео.</p>
{/if}
