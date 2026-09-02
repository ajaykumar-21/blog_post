"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { api, getSession } from "../../../lib/api";

function Comment({ item, replies, session, onReply, onDelete }) {
  return (
    <div className="comment">
      <div>
        <strong>{item.author}</strong>
        <small> · {new Date(item.created_at).toLocaleDateString()}</small>
      </div>
      <p>{item.content}</p>
      {session && (
        <button className="text-button" onClick={() => onReply(item.id)}>
          Reply
        </button>
      )}
      {session?.user.id === item.user_id && (
        <button
          className="text-button danger"
          onClick={() => onDelete(item.id)}
        >
          Delete
        </button>
      )}
      {replies.map((reply) => (
        <div className="reply" key={reply.id}>
          <strong>{reply.author}</strong>
          <small> · {new Date(reply.created_at).toLocaleDateString()}</small>
          <p>{reply.content}</p>
          {session?.user.id === reply.user_id && (
            <button
              className="text-button danger"
              onClick={() => onDelete(reply.id)}
            >
              Delete
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

export default function PostPage({ params }) {
  const router = useRouter();
  const { id } = use(params);
  const [post, setPost] = useState(null);
  const [session, setSession] = useState(null);
  const [content, setContent] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setPost(await api(`/posts/${id}`));
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  useEffect(() => {
    setSession(getSession());
    load();
  }, [id]);

  const deletePost = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this post? This cannot be undone.",
      )
    )
      return;
    try {
      await api(`/posts/${post.id}`, {
        method: "DELETE",
        token: session.token,
      });
      router.push("/");
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const submitComment = async (event) => {
    event.preventDefault();
    try {
      await api(`/posts/${post.id}/comments`, {
        method: "POST",
        token: session.token,
        body: JSON.stringify({ content, parentId: replyTo }),
      });
      setContent("");
      setReplyTo(null);
      load();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const deleteComment = async (commentId) => {
    if (!confirm("Delete this comment and any replies?")) return;
    try {
      await api(`/posts/comments/${commentId}`, {
        method: "DELETE",
        token: session.token,
      });
      load();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  if (error && !post) {
    return (
      <main>
        <Link href="/">← Back to stories</Link>
        <p className="error">{error}</p>
      </main>
    );
  }

  if (!post) {
    return (
      <main>
        <p>Loading story…</p>
      </main>
    );
  }

  const roots = post.comments.filter((item) => !item.parent_id);
  const replies = (commentId) =>
    post.comments.filter((item) => item.parent_id === commentId);
  const isAuthor = session?.user && session.user.id === post.author_id;

  return (
    <main className="detail-page">
      <Link href="/" className="back">
        ← Back to stories
      </Link>
      <article className="post-detail">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <small>
            BY {post.author} · {new Date(post.created_at).toLocaleDateString()}
          </small>
          {isAuthor && (
            <button className="text-button danger" onClick={deletePost}>
              Delete post
            </button>
          )}
        </div>
        <h1>{post.title}</h1>
        <div className="tag-list">
          {post.tags.map((tag) => (
            <span key={tag.slug}>{tag.name}</span>
          ))}
        </div>
        <p>{post.content}</p>
      </article>

      {error && <p className="error">{error}</p>}

      <section className="discussion">
        <h2>Discussion ({post.comments.length})</h2>
        {roots.map((item) => (
          <Comment
            key={item.id}
            item={item}
            replies={replies(item.id)}
            session={session}
            onReply={setReplyTo}
            onDelete={deleteComment}
          />
        ))}

        {session ? (
          <form onSubmit={submitComment}>
            <h3>{replyTo ? "Reply to comment" : "Add a comment"}</h3>
            {replyTo && (
              <button
                type="button"
                className="text-button"
                onClick={() => setReplyTo(null)}
              >
                Cancel reply
              </button>
            )}
            <textarea
              value={content}
              placeholder="Add something thoughtful…"
              onChange={(event) => setContent(event.target.value)}
              required
            />
            <button>Publish comment</button>
          </form>
        ) : (
          <p>
            <Link href="/login">Sign in</Link> to join the discussion.
          </p>
        )}
      </section>
    </main>
  );
}
