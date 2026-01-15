<script>
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import { renderVideoComponent } from './index.js';

  export let data;
  export let BASE_URL;

  let videos = [];
  let currentPage = 1;
  let maxPage = 1;
  let limit = 6;

  onMount(async () => {
    await loadVideos();
  });

  async function loadVideos() {
    try {
      console.log(currentPage);
      const response = await fetch(
        `/api/videos-by-tag/${data.props.tag}/${currentPage}/${limit}`
      );
      if (!response.ok) {
        throw new Error('Ошибка загрузки видео по тегу');
      }
      const { videos: fetchedVideos, totalVideos } = await response.json();
      videos = fetchedVideos;
      maxPage = Math.ceil(totalVideos / 6);
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

  BASE_URL = data.props.BASE_URL;
</script>

{#if videos.length > 0}
  {@html renderVideoComponent(videos, BASE_URL)}

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
