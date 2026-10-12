import { Router } from 'express';
import { getPosts, createPost, toggleLike, addComment, getComments } from '../controllers/postsController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

router.get('/', getPosts);
router.post('/', createPost);
router.post('/:id/like', toggleLike);
router.post('/:id/comments', addComment);
router.get('/:id/comments', getComments);

export default router;
