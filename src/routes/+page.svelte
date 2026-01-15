<script>
  import { onMount } from 'svelte';

  export let initialVideos = [];

  let videos = initialVideos;
  let loading = initialVideos.length === 0;
  let selectedVideoId = null;

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

  function selectVideo(videoId) {
    selectedVideoId = videoId === selectedVideoId ? null : videoId;
  }

  function goToVideo(videoId) {
    window.location.href = `/video/${videoId}`;
  }

  function handleKeyPress(event, videoId) {
    if (event.key === 'Enter') {
      selectVideo(videoId);
      goToVideo(videoId);
    }
  }
</script>

{#if loading}
  <p>Загрузка...</p>
{:else if videos.length > 0}
  <div class="video-grid">
    {#each videos.slice(0, 6) as video, index}
      <div
        class="video-card"
        on:click={() => goToVideo(video.id)}
        on:keydown={(event) => handleKeyPress(event, video.id)}
      >
        <div class="video-info">
          <h3 class="video-title">{video.title}</h3>
          <p class="video-description">{video.description}</p>
        </div>
      </div>
      {#if (index + 1) % 3 === 0}
        <div class="w-100" />
      {/if}
    {/each}
  </div>
{:else}
  <p>Нет добавленных видео.</p>
{/if}
