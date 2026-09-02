"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, clearSession, getSession } from "../lib/api";

const initialPost = { title: "", content: "", tags: "" };

export default function Home() {
  const [session, setSession] = useState(null);
  const [posts, setPosts] = useState([]);
  const [tags, setTags] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [filters, setFilters] = useState({
    q: "",
    tag: "",
    sort: "newest",
    page: 1,
  });
  const [postForm, setPostForm] = useState(initialPost);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async (nextFilters = filters) => {
    setLoading(true);
    const params = new URLSearchParams({
      page: nextFilters.page,
      limit: 9,
      sort: nextFilters.sort,
    });
    if (nextFilters.q.trim()) params.set("q", nextFilters.q.trim());
    if (nextFilters.tag) params.set("tag", nextFilters.tag);
    try {
      const [postResponse, tagResponse] = await Promise.all([
        api(`/posts?${params}`),
        api("/tags"),
      ]);
      setPosts(postResponse.data);
      setMeta(postResponse.meta);
      setTags(tagResponse);
      setError("");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSession(getSession());
  }, []);

  useEffect(() => {
    load();
  }, [filters.page, filters.sort, filters.tag]);

  const submitSearch = (event) => {
    event.preventDefault();
    const next = { ...filters, page: 1 };
    setFilters(next);
    load(next);
  };

  const createPost = async (event) => {
    event.preventDefault();
    try {
      await api("/posts", {
        method: "POST",
        token: session.token,
        body: JSON.stringify({
          title: postForm.title,
          content: postForm.content,
          tags: postForm.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
        }),
      });
      setPostForm(initialPost);
      load({ ...filters, page: 1 });
      setFilters((current) => ({ ...current, page: 1 }));
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const deletePost = async (postId) => {
    if (
      !confirm(
        "Are you sure you want to delete this post? This cannot be undone.",
      )
    )
      return;
    try {
      await api(`/posts/${postId}`, { method: "DELETE", token: session.token });
      load();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const chooseTag = (tag) =>
    setFilters((current) => ({ ...current, tag, page: 1 }));
  const logout = () => {
    clearSession();
    setSession(null);
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <Link className="brand" href="/">
          <span className="mark">S</span>
          <span>
            <h1>Storyline</h1>
            <p>Ideas worth sharing.</p>
          </span>
        </Link>
        <nav>
          {session ? (
            <>
              <span className="user-avatar">
                {session.user.name.slice(0, 1).toUpperCase()}
              </span>
              <span className="welcome">Hi, {session.user.name}</span>
              <button className="secondary" onClick={logout}>
                Log out
              </button>
            </>
          ) : (
            <>
              <Link className="nav-link" href="/login">
                Sign in
              </Link>
              <Link className="button-link" href="/login">
                Get started
              </Link>
            </>
          )}
        </nav>
      </header>

      {error && <p className="error">{error}</p>}

      {session ? (
        <section className="compose">
          <div className="compose-heading">
            <div className="user-avatar large">
              {session.user.name.slice(0, 1).toUpperCase()}
            </div>
            <div>
              <span className="eyebrow">YOUR SPACE</span>
              <h2>Share a fresh perspective</h2>
            </div>
          </div>
          <form onSubmit={createPost}>
            <input
              placeholder="Post title"
              value={postForm.title}
              onChange={(event) =>
                setPostForm({ ...postForm, title: event.target.value })
              }
              required
            />
            <textarea
              placeholder="What would you like to share?"
              value={postForm.content}
              onChange={(event) =>
                setPostForm({ ...postForm, content: event.target.value })
              }
              required
            />
            <input
              placeholder="Tags, separated by commas (up to 5)"
              value={postForm.tags}
              onChange={(event) =>
                setPostForm({ ...postForm, tags: event.target.value })
              }
            />
            <button>Publish post</button>
          </form>
        </section>
      ) : (
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow">A HOME FOR CURIOUS MINDS</span>
            <h2>Ideas grow when they’re shared.</h2>
            <p>
              Read thoughtful stories, follow the conversation, and add your own
              perspective when you’re ready.
            </p>
            <div className="hero-actions">
              <Link className="button-link" href="/login">
                Start writing
              </Link>
              <a className="nav-link" href="#stories">
                Explore stories ↓
              </a>
            </div>
          </div>
          <div className="hero-art">
            <span>✦</span>
            <strong>
              Write.
              <br />
              Reflect.
              <br />
              Connect.
            </strong>
            <small>New voices welcome</small>
          </div>
        </section>
      )}

      <section className="discover" id="stories">
        <div className="section-title">
          <div>
            <h2>Explore stories</h2>
            <span>{meta.total} published posts</span>
          </div>
          <select
            value={filters.sort}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                sort: event.target.value,
                page: 1,
              }))
            }
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>
        <form className="search" onSubmit={submitSearch}>
          <input
            placeholder="Search stories"
            value={filters.q}
            onChange={(event) =>
              setFilters({ ...filters, q: event.target.value })
            }
          />
          <button>Search</button>
        </form>
        <div className="tags">
          <button
            className={!filters.tag ? "tag active" : "tag"}
            onClick={() => chooseTag("")}
          >
            All
          </button>
          {tags.map((tag) => (
            <button
              className={filters.tag === tag.slug ? "tag active" : "tag"}
              key={tag.id}
              onClick={() => chooseTag(tag.slug)}
            >
              {tag.name} <small>{tag.post_count}</small>
            </button>
          ))}
        </div>
        {loading ? (
          <p>Loading stories…</p>
        ) : posts.length === 0 ? (
          <p className="empty">No posts match these filters.</p>
        ) : (
          <div className="grid">
            {posts.map((post) => (
              <article key={post.id}>
                <div className="article-header">
                  <div className="author-avatar">
                    {post.author.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="author-info">
                    <span className="author-name">{post.author}</span>
                    <span className="post-date">
                      {new Date(post.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>
                <h3>
                  <Link href={`/posts/${post.slug || post.id}`}>
                    {post.title}
                  </Link>
                </h3>
                <p>{post.content}</p>
                <div className="tag-list">
                  {post.tags.map((tag) => (
                    <span key={tag.slug}>#{tag.name}</span>
                  ))}
                </div>
                <footer>
                  <span className="comments-count">
                    💬 {post.comment_count}{" "}
                    {post.comment_count === 1 ? "comment" : "comments"}
                  </span>
                  {session?.user && session.user.id === post.author_id && (
                    <button
                      className="text-button danger"
                      onClick={() => deletePost(post.id)}
                    >
                      Delete
                    </button>
                  )}
                </footer>
              </article>
            ))}
          </div>
        )}
        <div className="pagination">
          <button
            disabled={meta.page <= 1}
            onClick={() =>
              setFilters((current) => ({ ...current, page: current.page - 1 }))
            }
          >
            Previous
          </button>
          <span>
            Page {meta.page} of {meta.totalPages}
          </span>
          <button
            disabled={meta.page >= meta.totalPages}
            onClick={() =>
              setFilters((current) => ({ ...current, page: current.page + 1 }))
            }
          >
            Next
          </button>
        </div>
      </section>
    </main>
  );
}
