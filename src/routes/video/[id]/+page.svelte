<script>
  import { onMount, afterUpdate } from 'svelte';
  import { goto } from '$app/navigation';

  export let data;
  export let BASE_URL;

  let video = {};
  let pageTitle = '';
  let tags = [];
  let normalizedBase = '';

  const normalizeTagList = (value) =>
    Array.from(
      new Set(
        (Array.isArray(value)
          ? value
          : typeof value === 'string'
            ? value.split(',')
            : []
        )
          .map((tag) => `${tag ?? ''}`.trim())
          .filter(Boolean)
      )
    );

  onMount(async () => {
    try {
      const response = await fetch(`/api/videos/${data.props.id}`);
      if (!response.ok) {
        throw new Error('Ошибка загрузки видео');
      }
      const getData = await response.json();
      if (!getData) {
        throw new Error('Видео не найдено');
      }
      video = {
        ...getData,
        tags: normalizeTagList(getData.tags),
      };
      tags = video.tags;
      setPageTitle();
    } catch (error) {
      console.error('Ошибка при загрузке видео:', error);
      goto('/');
    }
  });

  $: {
    normalizedBase = (BASE_URL || '').replace(/\/$/, '');
  }

  const buildVideoUrl = (file) =>
    normalizedBase ? `${normalizedBase}/videos/${file}` : `/videos/${file}`;

  const setPageTitle = () => {
    pageTitle = `${video.title} - Микровидеохостинг`;
    if (typeof document !== 'undefined') {
      document.title = pageTitle;
      const metaDescription = document.querySelector(
        'meta[name="description"]'
      );
      if (metaDescription) {
        metaDescription.setAttribute(
          'content',
          `${video.description} на Микровидеохостинг.`
        );
      }
    }
  };

  afterUpdate(() => {
    setPageTitle();
  });

  BASE_URL = data.props.BASE_URL;
</script>

{#if Object.keys(video).length > 0}
  <div>
    <video controls>
      <source src="{buildVideoUrl(video.video_file)}" type="video/mp4" />
      <track kind="captions" src="captions.vtt" srclang="en" label="English" />
      Нет доступного видео.
    </video>
    <div>
      <p>Заголовок: {video.title}</p>
      <p>Описание: {video.description}</p>
      <p>Теги:</p>
      <ul>
        {#each tags as tag}
          <li>{tag}</li>
        {/each}
      </ul>
    </div>
  </div>
{:else}
  <p>Загрузка...</p>
{/if}
