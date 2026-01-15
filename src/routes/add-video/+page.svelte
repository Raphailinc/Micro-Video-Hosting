<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  export let initialTags = [];
  let isEditing = false;
  let selectedVideoId = null;
  let selectedVideo = null;
  let availableVideos = [];

  let title = '';
  let description = '';
  let selectedTags = [];
  let videoFile = null;
  let availableTags = [];

  const normalizeTagList = (tags) =>
    Array.from(
      new Set(
        (Array.isArray(tags)
          ? tags
          : typeof tags === 'string'
            ? tags.split(',')
            : []
        )
          .map((tag) => `${tag ?? ''}`.trim())
          .filter(Boolean)
      )
    );

  const handleSubmit = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      console.error('Поле "Название" должно быть заполнено');
      return;
    }

    const tags = Array.isArray(selectedTags) ? selectedTags : [];

    try {
      let response;
      if (isEditing) {
        if (!selectedVideoId) {
          throw new Error('Не выбрано видео для редактирования.');
        }

        if (videoFile) {
          const formData = new FormData();
          formData.append('title', trimmedTitle);
          formData.append('description', description);
          tags.forEach((tag) => formData.append('tags[]', tag));
          formData.append('video_file', videoFile);

          response = await fetch(`/api/edit_video/${selectedVideoId}`, {
            method: 'PUT',
            body: formData,
          });
        } else {
          response = await fetch(`/api/edit_video/${selectedVideoId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: trimmedTitle,
              description,
              tags,
            }),
          });
        }
      } else {
        if (!videoFile) {
          console.error('Видеофайл обязателен для добавления нового видео');
          return;
        }

        const formData = new FormData();
        formData.append('title', trimmedTitle);
        formData.append('description', description);
        tags.forEach((tag) => formData.append('tags[]', tag));
        formData.append('video_file', videoFile);

        response = await fetch('/api/add-video', {
          method: 'POST',
          body: formData,
        });
      }

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Ошибка при сохранении видео');
      }

      goto('/');
    } catch (error) {
      console.error('Ошибка при сохранении видео:', error);
    }
  };

  const handleFileChange = (event) => {
    videoFile = event.target.files[0];
  };

  const handleTagChange = (tag) => {
    if (!Array.isArray(selectedTags)) {
      selectedTags = [];
    }
    if (selectedTags.includes(tag)) {
      selectedTags = selectedTags.filter((t) => t !== tag);
    } else {
      selectedTags = [...selectedTags, tag];
    }
  };

  const fetchAvailableVideos = async () => {
    try {
      const response = await fetch('/api/videos');
      const data = await response.json();
      availableVideos = data;
      if (isEditing && !selectedVideoId && data.length > 0) {
        selectedVideoId = data[0].id;
      }
    } catch (error) {
      console.error('Ошибка при загрузке доступных видео:', error);
    }
  };

  const fetchSelectedVideo = async () => {
    try {
      const response = await fetch(`/api/videos/${selectedVideoId}`);
      if (!response.ok) {
        throw new Error('Видео не найдено');
      }
      selectedVideo = await response.json();
      title = selectedVideo.title ?? '';
      description = selectedVideo.description ?? '';
      selectedTags = normalizeTagList(selectedVideo.tags);

      const responseTags = await fetch(`/api/tags/${selectedVideoId}`);
      if (responseTags.ok) {
        const data = await responseTags.json();
        const videoTags = normalizeTagList(data.tags || []);
        selectedTags = normalizeTagList([...selectedTags, ...videoTags]);
        availableTags = normalizeTagList([...(availableTags || []), ...videoTags]);
      }
    } catch (error) {
      console.error('Ошибка при загрузке выбранного видео:', error);
    }
  };

  onMount(async () => {
    if (initialTags.length) {
      availableTags = normalizeTagList(initialTags);
    } else {
      try {
        const response = await fetch('/api/tags');
        const data = await response.json();
        availableTags = normalizeTagList(data.tags);
      } catch (error) {
        console.error('Ошибка при загрузке тегов:', error);
      }
    }

    await fetchAvailableVideos();
  });

  const handleModeChange = () => {
    isEditing = !isEditing;
    if (isEditing) {
      fetchAvailableVideos();
    } else {
      selectedVideoId = null;
      selectedVideo = null;
      videoFile = null;
      selectedTags = [];
    }
  };

  $: {
    if (selectedVideoId) {
      fetchSelectedVideo();
    }
  }

  if (typeof document !== 'undefined') {
    document.title = 'Добавить/Редактировать видео - Микровидеохостинг';
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute(
        'content',
        'Добавление или редактирование видео на Микровидеохостинг.'
      );
    }
  }
</script>

<div class="container">
  <h1 class="title">{isEditing ? 'Редактировать видео' : 'Добавить видео'}</h1>

  <div class="field">
    <label class="label" for="modeToggle">Режим:</label>
    <div class="control">
      <label class="radio" for="editingMode">
        <input
          type="radio"
          id="editingMode"
          checked={isEditing}
          on:change={handleModeChange}
        />
        Редактирование
      </label>
      <label class="radio" for="addingMode">
        <input
          type="radio"
          id="addingMode"
          checked={!isEditing}
          on:change={handleModeChange}
        />
        Добавление
      </label>
    </div>
  </div>

  <form
    on:submit|preventDefault={handleSubmit}
    class="box"
    enctype="multipart/form-data"
  >
    {#if isEditing}
      <div class="field">
        <label class="label" for="videoSelect"
          >Выберите видео для редактирования:</label
        >
        <div class="control">
          <select id="videoSelect" bind:value={selectedVideoId}>
            {#each availableVideos as video}
              <option value={video.id}>{video.title}</option>
            {/each}
          </select>
        </div>
      </div>
    {/if}

    <div class="field">
      <label for="title" class="label">Название:</label>
      <div class="control">
        <input
          type="text"
          id="title"
          bind:value={title}
          class="input"
          required
        />
      </div>
    </div>
    <div class="field">
      <label for="description" class="label">Описание:</label>
      <div class="control">
        <textarea id="description" bind:value={description} class="textarea" />
      </div>
    </div>
    <div class="field">
      <label for="tags" class="label">Теги:</label>
      <div class="control">
        <div
          id="tags"
          role="group"
          aria-labelledby="tags"
          class="checkbox-group"
        >
          {#each availableTags as tag}
            <label>
              <input
                type="checkbox"
                on:change={() => handleTagChange(tag)}
                value={tag}
                class="mr-2"
                checked={selectedTags.includes(tag)}
              />
              {tag}
            </label>
          {/each}
        </div>
      </div>
    </div>
    <div class="field">
      <label for="videoFile" class="label">Видеофайл:</label>
      <div class="control">
        <input
          type="file"
          id="videoFile"
          on:change={handleFileChange}
          accept="video/*"
          class="input"
        />
      </div>
    </div>
    <div class="field">
      <div class="control">
        <button type="submit" class="button is-primary"
          >{isEditing ? 'Сохранить' : 'Добавить'}</button
        >
      </div>
    </div>
  </form>
</div>
