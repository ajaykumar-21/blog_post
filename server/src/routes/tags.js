import { Router } from 'express';
import { pool } from '../db.js';
const router = Router();
router.get('/', async (_req, res, next) => { try { const { rows } = await pool.query('SELECT t.*, COUNT(pt.post_id)::int AS post_count FROM tags t LEFT JOIN post_tags pt ON pt.tag_id=t.id GROUP BY t.id ORDER BY post_count DESC, t.name ASC'); res.json(rows); } catch (error) { next(error); } });
export default router;
