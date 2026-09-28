import { useEffect, useState } from 'react';
import { apiFetch } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Community() {
  const { user } = useAuth();
  const { t } = useTheme();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [postText, setPostText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeCommentPostId, setActiveCommentPostId] = useState(null);
  const [commentText, setCommentText] = useState('');

  const loadPosts = async () => {
    try {
      const res = await apiFetch('/posts');
      setPosts(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!postText.trim() || submitting) return;
    setSubmitting(true);

    try {
      const res = await apiFetch('/posts', {
        method: 'POST',
        body: JSON.stringify({ text: postText })
      });
      setPosts([res.data, ...posts]);
      setPostText('');
    } catch (err) {
      alert(`Error al publicar: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleLike = async (postId) => {
    try {
      const res = await apiFetch(`/posts/${postId}/like`, { method: 'POST' });
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, userLiked: res.data.liked, likeCount: res.data.likeCount }
            : p
        )
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddComment = async (postId) => {
    if (!commentText.trim()) return;
    try {
      const res = await apiFetch(`/posts/${postId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ text: commentText })
      });

      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                commentCount: (p.commentCount || 0) + 1,
                comments: [...(p.comments || []), res.data]
              }
            : p
        )
      );
      setCommentText('');
    } catch (err) {
      alert(`Error al comentar: ${err.message}`);
    }
  };

  if (loading) {
    return <div style={{ color: 'var(--muted)' }}>Cargando muro de la comunidad...</div>;
  }

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'Montserrat', fontSize: '24px', fontWeight: 800, color: 'var(--ink)' }}>
          {t.community.title}
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '14px', marginTop: '4px' }}>
          {t.community.subtitle}
        </p>
      </div>

      {/* Caja de publicación nueva */}
      <div style={{
        background: 'var(--panel)',
        borderRadius: '16px',
        padding: '20px',
        border: '1px solid var(--line)',
        boxShadow: 'var(--shadow)',
        marginBottom: '24px'
      }}>
        <form onSubmit={handleCreatePost}>
          <textarea
            rows="3"
            value={postText}
            onChange={(e) => setPostText(e.target.value)}
            placeholder={t.community.placeholder.replace('{name}', user?.name || '')}
            style={{
              width: '100%',
              border: 'none',
              outline: 'none',
              fontSize: '14px',
              fontFamily: 'Inter',
              resize: 'none',
              background: 'transparent',
              color: 'var(--ink)'
            }}
          />
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '12px',
            paddingTop: '12px',
            borderTop: '1px solid var(--line)'
          }}>
            <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
              {t.community.scope}
            </span>
            <button
              type="submit"
              disabled={!postText.trim() || submitting}
              style={{
                backgroundColor: 'var(--cta)',
                color: 'var(--cta-ink)',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 18px',
                fontFamily: 'Montserrat',
                fontWeight: 700,
                fontSize: '13px',
                cursor: !postText.trim() || submitting ? 'not-allowed' : 'pointer',
                opacity: !postText.trim() || submitting ? 0.6 : 1
              }}
            >
              {submitting ? 'Publicando...' : t.community.publish}
            </button>
          </div>
        </form>
      </div>

      {/* Listado de Posts */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {posts.map((p) => {
          const authorInitial = p.author?.name ? p.author.name.charAt(0).toUpperCase() : 'E';
          return (
            <div
              key={p.id}
              style={{
                background: 'var(--panel)',
                borderRadius: '16px',
                padding: '20px',
                border: '1px solid var(--line)',
                boxShadow: 'var(--shadow)'
              }}
            >
              {/* Header del post */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  backgroundColor: p.author?.avatarColor || 'var(--brand)',
                  color: '#fff',
                  display: 'grid',
                  placeItems: 'center',
                  fontWeight: 800,
                  fontFamily: 'Montserrat',
                  fontSize: '14px'
                }}>
                  {authorInitial}
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ink)' }}>
                    {p.author?.name}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                    Estudiante Aprueba
                  </div>
                </div>
              </div>

              {/* Contenido del post */}
              <p style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--ink)', whiteSpace: 'pre-wrap' }}>
                {p.text}
              </p>

              {/* Barra de interacción */}
              <div style={{
                display: 'flex',
                gap: '20px',
                marginTop: '16px',
                paddingTop: '12px',
                borderTop: '1px solid var(--line)'
              }}>
                <button
                  onClick={() => handleToggleLike(p.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: p.userLiked ? 'var(--cta)' : 'var(--muted)'
                  }}
                >
                  <svg width="18" height="18" fill={p.userLiked ? 'var(--cta)' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  <span>{p.likeCount || 0}</span>
                </button>

                <button
                  onClick={() => setActiveCommentPostId(activeCommentPostId === p.id ? null : p.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'var(--muted)'
                  }}
                >
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span>{p.commentCount || 0} Comentarios</span>
                </button>
              </div>

              {/* Sección de Comentarios desplegable */}
              {activeCommentPostId === p.id && (
                <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--line)' }}>
                  {p.comments && p.comments.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
                      {p.comments.map((c) => (
                        <div key={c.id} style={{ background: 'var(--soft)', padding: '10px 14px', borderRadius: '10px' }}>
                          <span style={{ fontWeight: 700, fontSize: '12px', color: 'var(--brand)' }}>
                            {c.author?.name}
                          </span>
                          <p style={{ fontSize: '13px', marginTop: '2px', color: 'var(--ink)' }}>
                            {c.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Escribe una respuesta o aporte..."
                      style={{
                        flex: 1,
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--line)',
                        backgroundColor: 'var(--soft)',
                        color: 'var(--ink)',
                        fontSize: '13px',
                        outline: 'none'
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddComment(p.id);
                      }}
                    />
                    <button
                      onClick={() => handleAddComment(p.id)}
                      style={{
                        backgroundColor: 'var(--brand)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '0 14px',
                        fontWeight: 700,
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      Enviar
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}