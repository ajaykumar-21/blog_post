import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { slugify, uniqueSlug } from '../utils/slug.js';
import { validateComment, validatePost } from '../utils/validation.js';

const router = Router();
const clamp = (value, fallback, maximum) => Math.min(Math.max(Number(value) || fallback, 1), maximum);

const postColumns = `p.id, p.title, p.content, p.slug, p.status, p.created_at, p.updated_at,
  p.author_id, COALESCE(u.name, p.author) AS author,
  (SELECT COUNT(*)::int FROM comments c WHERE c.post_id = p.id) AS comment_count,
  COALESCE((SELECT json_agg(json_build_object('name', t.name, 'slug', t.slug) ORDER BY t.name)
    FROM tags t JOIN post_tags pt ON pt.tag_id = t.id WHERE pt.post_id = p.id), '[]') AS tags`;

async function assignTags(client, postId, tagNames = []) {
  const normalized = [...new Set(tagNames.map((tag) => tag.trim().toLowerCase()))];
  await client.query('DELETE FROM post_tags WHERE post_id = $1', [postId]);
  for (const name of normalized) {
    const slug = slugify(name);
    const { rows } = await client.query(
      'INSERT INTO tags (name, slug) VALUES ($1, $2) ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id',
      [name, slug],
    );
    await client.query('INSERT INTO post_tags (post_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [postId, rows[0].id]);
  }
}

router.get('/', async (req, res, next) => {
  const page = clamp(req.query.page, 1, 100000);
  const limit = clamp(req.query.limit, 10, 50);
  const sort = req.query.sort === 'oldest' ? 'ASC' : 'DESC';
  const clauses = ["p.status = 'published'"];
  const values = [];
  const add = (value) => { values.push(value); return `$${values.length}`; };

  if (req.query.q?.trim()) {
    const query = add(req.query.q.trim());
    clauses.push(`to_tsvector('english', coalesce(p.title, '') || ' ' || coalesce(p.content, '')) @@ websearch_to_tsquery('english', ${query})`);
  }
  if (req.query.tag?.trim()) {
    const tag = add(slugify(req.query.tag));
    clauses.push(`EXISTS (SELECT 1 FROM post_tags ptx JOIN tags tx ON tx.id = ptx.tag_id WHERE ptx.post_id = p.id AND tx.slug = ${tag})`);
  }
  try {
    const where = clauses.join(' AND ');
    const total = await pool.query(`SELECT COUNT(*)::int AS count FROM posts p WHERE ${where}`, values);
    const queryValues = [...values, limit, (page - 1) * limit];
    const { rows } = await pool.query(`SELECT ${postColumns} FROM posts p LEFT JOIN users u ON u.id = p.author_id
      WHERE ${where} ORDER BY p.created_at ${sort}, p.id ${sort} LIMIT $${queryValues.length - 1} OFFSET $${queryValues.length}`, queryValues);
    const count = total.rows[0].count;
    res.json({ data: rows, meta: { page, limit, total: count, totalPages: Math.max(Math.ceil(count / limit), 1) } });
  } catch (error) { next(error); }
});

router.get('/mine', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(`SELECT ${postColumns} FROM posts p LEFT JOIN users u ON u.id = p.author_id WHERE p.author_id = $1 ORDER BY p.updated_at DESC`, [req.user.id]);
    res.json(rows);
  } catch (error) { next(error); }
});

router.get('/:idOrSlug', async (req, res, next) => {
  try {
    const value = req.params.idOrSlug;
    const identifier = /^\d+$/.test(value) ? 'p.id = $1' : 'p.slug = $1';
    const { rows } = await pool.query(`SELECT ${postColumns} FROM posts p LEFT JOIN users u ON u.id = p.author_id WHERE ${identifier} AND p.status = 'published'`, [value]);
    if (!rows[0]) return res.status(404).json({ error: 'Post not found.' });
    const comments = await pool.query(`SELECT c.id, c.post_id, c.parent_id, c.content, c.created_at, c.user_id,
      COALESCE(u.name, c.name) AS author FROM comments c LEFT JOIN users u ON u.id = c.user_id
      WHERE c.post_id = $1 ORDER BY c.created_at ASC`, [rows[0].id]);
    res.json({ ...rows[0], comments: comments.rows });
  } catch (error) { next(error); }
});

router.post('/', requireAuth, async (req, res, next) => {
  const error = validatePost(req.body);
  if (error) return res.status(400).json({ error });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const slug = uniqueSlug(req.body.title);
    const { rows } = await client.query(`INSERT INTO posts (title, content, author, author_id, slug, status)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`, [req.body.title.trim(), req.body.content.trim(), req.user.name, req.user.id, slug, req.body.status === 'draft' ? 'draft' : 'published']);
    await assignTags(client, rows[0].id, req.body.tags);
    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (dbError) { await client.query('ROLLBACK'); next(dbError); }
  finally { client.release(); }
});

router.put('/:id', requireAuth, async (req, res, next) => {
  const error = validatePost(req.body);
  if (error) return res.status(400).json({ error });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows, rowCount } = await client.query(`UPDATE posts SET title=$1, content=$2, status=$3, updated_at=CURRENT_TIMESTAMP
      WHERE id=$4 AND author_id=$5 RETURNING *`, [req.body.title.trim(), req.body.content.trim(), req.body.status === 'draft' ? 'draft' : 'published', req.params.id, req.user.id]);
    if (!rowCount) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Post not found or not owned by you.' }); }
    await assignTags(client, rows[0].id, req.body.tags);
    await client.query('COMMIT');
    res.json(rows[0]);
  } catch (dbError) { await client.query('ROLLBACK'); next(dbError); }
  finally { client.release(); }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query('DELETE FROM posts WHERE id=$1 AND author_id=$2', [req.params.id, req.user.id]);
    if (!result.rowCount) return res.status(404).json({ error: 'Post not found or not owned by you.' });
    res.status(204).end();
  } catch (error) { next(error); }
});

router.post('/:id/comments', requireAuth, async (req, res, next) => {
  const error = validateComment(req.body);
  if (error) return res.status(400).json({ error });
  const parentId = req.body.parentId || null;
  try {
    const post = await pool.query('SELECT id FROM posts WHERE id=$1 AND status=\'published\'', [req.params.id]);
    if (!post.rowCount) return res.status(404).json({ error: 'Post not found.' });
    if (parentId) {
      const parent = await pool.query('SELECT parent_id FROM comments WHERE id=$1 AND post_id=$2', [parentId, req.params.id]);
      if (!parent.rowCount) return res.status(400).json({ error: 'Reply target is invalid.' });
      if (parent.rows[0].parent_id) return res.status(400).json({ error: 'Replies can be one level deep.' });
    }
    const { rows } = await pool.query(`INSERT INTO comments (post_id, parent_id, user_id, name, content)
      VALUES ($1,$2,$3,$4,$5) RETURNING id,post_id,parent_id,user_id,name AS author,content,created_at`, [req.params.id, parentId, req.user.id, req.user.name, req.body.content.trim()]);
    res.status(201).json(rows[0]);
  } catch (dbError) { next(dbError); }
});

router.delete('/comments/:id', requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query('DELETE FROM comments WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    if (!result.rowCount) return res.status(404).json({ error: 'Comment not found or not owned by you.' });
    res.status(204).end();
  } catch (error) { next(error); }
});

export default router;
