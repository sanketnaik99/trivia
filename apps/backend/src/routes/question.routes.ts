import express from 'express';
import { questionService } from '../services/question.service';

const router = express.Router();

// GET /api/questions/categories
router.get('/categories', async (req, res) => {
  try {
    const cats = await questionService.getCategoriesWithCount();
    res.json({ success: true, categories: cats });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
  }
});

export default router;
