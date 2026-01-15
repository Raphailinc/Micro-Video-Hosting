import TagsPage from './tags';
import AddVideoPage from './add-video';
import EditVideoPage from './edit-video';
import VideoPage from './video';

export const routes = {
  '/tags': TagsPage,
  '/add-video': AddVideoPage,
  '/add-video/:id': EditVideoPage,
  '/video/:id': VideoPage,
};
