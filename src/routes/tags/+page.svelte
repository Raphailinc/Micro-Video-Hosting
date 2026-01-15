<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  let tags = [];
  let searchQuery = '';
  let filteredTags = [];
  let selectedTagIndex = -1;

  const fetchTags = async () => {
    try {
      const response = await fetch(`/api/tags`);
      if (!response.ok) {
        throw new Error('Ошибка при загрузке тегов');
      }
      const data = await response.json();
      tags = data.tags;
      filterTags();
    } catch (error) {
      console.error('Ошибка при загрузке тегов:', error);
      goto('/');
    }
  };

  const filterTags = () => {
    filteredTags = tags.filter((tag) =>
      tag.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (selectedTagIndex >= filteredTags.length) {
      selectedTagIndex = filteredTags.length - 1;
    }
  };

  const addTag = async () => {
    const newTag = prompt('Введите новый тег:');
    if (newTag && !tags.includes(newTag)) {
      try {
        const response = await fetch('/api/add-tag', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ tag: newTag }),
        });
        if (!response.ok) {
          throw new Error('Ошибка при добавлении тега');
        }
        tags = [...tags, newTag];
        filterTags();
      } catch (error) {
        console.error('Ошибка при добавлении тега:', error);
      }
    }
  };

  const handleKeyDown = (event) => {
    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        if (selectedTagIndex > 0) {
          selectedTagIndex--;
        }
        break;
      case 'ArrowDown':
        event.preventDefault();
        if (selectedTagIndex < filteredTags.length - 1) {
          selectedTagIndex++;
        }
        break;
      case 'Enter':
        event.preventDefault();
        if (selectedTagIndex !== -1) {
          const selectedTag = filteredTags[selectedTagIndex];
          goto(`/tags/${selectedTag}`);
        }
        break;
    }
  };

  const handleClickTag = (tag) => {
    goto(`/tags/${tag}`);
  };

  onMount(fetchTags);

  if (typeof document !== 'undefined') {
    document.title = 'Список тегов - Микровидеохостинг';
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute(
        'content',
        'Список тегов на Микровидеохостинг.'
      );
    }
  }
</script>

<div class="container" role="listbox" tabindex="0" on:keydown={handleKeyDown}>
  <h1 class="title">Список тегов</h1>

  <input
    type="text"
    placeholder="Поиск тегов..."
    bind:value={searchQuery}
    on:input={filterTags}
  />

  <div class="tags">
    {#each filteredTags as tag, index}
      <div
        class="tag-card"
        class:selected={index === selectedTagIndex}
        on:click={() => handleClickTag(tag)}
        on:keydown={(event) => event.key === 'Enter' && handleClickTag(tag)}
      >
        <span class="tag">{tag}</span>
      </div>
    {/each}
  </div>

  <button class="add-btn" on:click={addTag}>Добавить тег</button>
</div>
