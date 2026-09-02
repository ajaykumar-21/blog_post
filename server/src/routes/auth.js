import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { validateCredentials } from "../utils/validation.js";
const router = Router();
const tokenFor = (user) =>
  jwt.sign(
    { id: user.id, name: user.name, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" },
  );
router.post("/register", async (req, res, next) => {
  const error = validateCredentials(req.body, true);
  if (error) return res.status(400).json({ error });
  try {
    const hash = await bcrypt.hash(req.body.password, 12);
    const { rows } = await pool.query(
      "INSERT INTO users (name, email, password_hash) VALUES ($1,$2,$3) RETURNING id,name,email,created_at",
      [req.body.name.trim(), req.body.email.trim().toLowerCase(), hash],
    );
    const user = rows[0];
    res.status(201).json({ user, token: tokenFor(user) });
  } catch (dbError) {
    if (dbError.code === "23505")
      return res
        .status(409)
        .json({ error: "An account with this email already exists." });
    next(dbError);
  }
});
router.post("/login", async (req, res, next) => {
  const error = validateCredentials(req.body);
  if (error) return res.status(400).json({ error });
  try {
    const { rows } = await pool.query("SELECT * FROM users WHERE email=$1", [
      req.body.email.trim().toLowerCase(),
    ]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(req.body.password, user.password_hash)))
      return res.status(401).json({ error: "Incorrect email or password." });
    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        created_at: user.created_at,
      },
      token: tokenFor(user),
    });
  } catch (dbError) {
    next(dbError);
  }
});
router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      "SELECT id,name,email,created_at FROM users WHERE id=$1",
      [req.user.id],
    );
    if (!rows[0])
      return res.status(401).json({ error: "Account no longer exists." });
    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
});
export default router;
