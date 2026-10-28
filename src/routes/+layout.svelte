<script>
  let menuOpen = false;
</script>

<nav class="navbar is-dark" aria-label="main navigation">
  <div class="navbar-brand">
    <button type="button" class="navbar-burger burger" class:is-active={menuOpen}
      aria-label="Меню" aria-expanded={menuOpen} on:click={() => (menuOpen = !menuOpen)}>
      <span aria-hidden="true"></span>
      <span aria-hidden="true"></span>
      <span aria-hidden="true"></span>
    </button>
  </div>
  <div class="navbar-menu" class:is-active={menuOpen}>
    <div class="navbar-start">
      <a href="/" class="navbar-item">Главная</a>
      <a href="/tags" class="navbar-item">Теги</a>
      <a href="/add-video" class="navbar-item">Добавить видео</a>
    </div>
  </div>
</nav>

<slot />

<style>
  @import '/styles.css';
</style>
