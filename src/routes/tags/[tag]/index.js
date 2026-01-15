export function renderVideoComponent(videos, BASE_URL) {
  if (videos.length > 0) {
    let videoHTML = `
      <h1>Видео по тегу</h1>
      <div class="video-grid">`;

    videos.forEach((video, i) => {
      if (i % 3 === 0) {
        videoHTML += `<div class="video-row">`;
      }
      videoHTML += `
        <div class="video-card">
          <h2>Заголовок: ${video.title}</h2>
          <p>Описание: ${video.description}</p>
          <video controls>
            <source src="${BASE_URL}/videos/${video.video_file}" type="video/mp4">
            <track kind="captions" src="captions.vtt" srclang="en" label="English">
            Нет доступного видео.
          </video>
        </div>`;
      if (i % 3 === 2 || i === videos.length - 1) {
        videoHTML += `</div>`;
      }
    });

    return videoHTML;
  } else {
    return `<p>Нет видео по выбранному тегу.</p>`;
  }
}
