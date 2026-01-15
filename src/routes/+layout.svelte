<nav class="navbar is-dark" aria-label="main navigation">
  <div class="navbar-brand">
    <div class="navbar-burger burger" aria-label="menu" aria-expanded="false">
      <span aria-hidden="true" />
      <span aria-hidden="true" />
      <span aria-hidden="true" />
    </div>
  </div>
  <div class="navbar-menu">
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
