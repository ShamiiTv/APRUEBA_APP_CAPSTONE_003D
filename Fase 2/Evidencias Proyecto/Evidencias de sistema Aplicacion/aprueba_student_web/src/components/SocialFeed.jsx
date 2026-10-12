import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '../api/client';
import { useSocialMutation } from '../hooks/useSocialMutation';
import './Social.css';

const merge = (previous, added) => [...new Map([...previous, ...added].map(row => [row.id, row])).values()];
const date = value => value ? new Date(value).toLocaleString('es-CL', { timeZone: 'America/Santiago' }) : '';

function Comments({ postId, onCount }) {
  const [rows, setRows] = useState(null);
  const [cursor, setCursor] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState('');
  const [message, setMessage] = useState('');
  const guard = useRef(false);
  const alive = useRef(false);
  const mutation = useSocialMutation(`/posts/${postId}/comments`, `comment:${postId}`);
  const load = useCallback(async next => {
    if (guard.current) return;
    guard.current = true; setLoading(true); setError('');
    try {
      const response = await apiFetch(`/posts/${postId}/comments${next ? `?cursor=${encodeURIComponent(next)}` : ''}`);
      if (!alive.current) return;
      setRows(previous => next ? merge(previous || [], response.data) : response.data);
      setCursor(response.meta?.nextCursor || null);
    } catch (cause) { if (alive.current) setError(cause.message); }
    finally { guard.current = false; if (alive.current) setLoading(false); }
  }, [postId]);
  useEffect(() => {
    alive.current = true;
    queueMicrotask(() => { if (alive.current) load(); });
    return () => { alive.current = false; };
  }, [load]);
  const submit = async event => {
    event.preventDefault();
    const response = await mutation.run({ text: draft });
    if (!response) return;
    setRows(previous => merge([response.data], previous || []));
    onCount(response.meta.commentCount);
    setDraft(''); setMessage('Comentario publicado.');
  };
  return <section aria-label="Comentarios">
    {error && <p role="alert">{error}</p>}
    {mutation.error && <p role="alert">{mutation.error}</p>}
    {message && <p role="status">{message}</p>}
    {!rows && !error && <p>Cargando comentarios...</p>}
    {rows?.length === 0 && <p>Aún no hay comentarios.</p>}
    {rows?.map(row => <article key={row.id}><strong>{row.author.name}</strong><p className="social-text">{row.text}</p><time dateTime={row.createdAt}>{date(row.createdAt)}</time></article>)}
    <div className="social-actions"><button disabled={loading} onClick={() => load()}>Actualizar comentarios</button>{cursor && <button disabled={loading} onClick={() => load(cursor)}>Ver comentarios anteriores</button>}</div>
    <form onSubmit={submit}>
      <label htmlFor={`comment-${postId}`}>Escribe un comentario</label>
      <textarea id={`comment-${postId}`} maxLength={1000} value={mutation.pending?.text ?? draft} disabled={mutation.busy || !!mutation.pending} onChange={event => setDraft(event.target.value)} />
      <button disabled={mutation.busy || (!mutation.pending && !draft.trim())}>{mutation.pending ? 'Reintentar comentario' : 'Enviar comentario'}</button>
    </form>
  </section>;
}

function Post({ initial }) {
  const [post, setPost] = useState(initial);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const guard = useRef(false);
  // Preserve local comment/reaction updates; remount when the feed is explicitly refreshed.
  const react = async () => {
    if (guard.current) return;
    guard.current = true; setBusy(true); setError('');
    try {
      const response = await apiFetch(`/posts/${post.id}/like`, { method: 'POST', body: JSON.stringify({ liked: !post.userLiked }) });
      setPost(previous => ({ ...previous, userLiked: response.data.liked, likeCount: response.data.likeCount }));
    } catch (cause) { setError(cause.message); }
    finally { guard.current = false; setBusy(false); }
  };
  return <article className="social-post">
    <strong>{post.author.name}</strong> <time dateTime={post.createdAt}>{date(post.createdAt)}</time>
    <p className="social-text">{post.text}</p>
    {post.question && <section aria-label="Pregunta compartida"><strong>{post.question.testId?.toUpperCase()}</strong><p className="social-text">{post.question.statement}</p><ol>{post.question.options?.map((option,index) => <li key={index}>{typeof option === 'string' ? option : option.text}</li>)}</ol><p>Pregunta compartida para conversar; no consume cuota ni entrega medallas.</p></section>}
    {error && <p role="alert">{error}</p>}
    <div className="social-actions"><button aria-pressed={post.userLiked} disabled={busy} onClick={react}>{post.userLiked ? 'Quitar Me gusta' : 'Me gusta'} · {post.likeCount}</button><button aria-expanded={open} onClick={() => setOpen(value => !value)}>Comentarios · {post.commentCount}</button></div>
    {open && <Comments postId={post.id} onCount={count => setPost(previous => ({ ...previous, commentCount: count }))} />}
  </article>;
}

export default function SocialFeed({ groupId, questionId }) {
  const [rows, setRows] = useState(null);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState('');
  const [attach, setAttach] = useState(!!questionId);
  const [message, setMessage] = useState('');
  const [revision, setRevision] = useState(0);
  const guard = useRef(false);
  const alive = useRef(false);
  const mutation = useSocialMutation('/posts', groupId ? `post:group:${groupId}` : 'post:public');
  const load = useCallback(async next => {
    if (guard.current) return;
    guard.current = true; setLoading(true); setError('');
    const params = new URLSearchParams();
    if (groupId) params.set('groupId', groupId);
    if (next) params.set('cursor', next);
    try {
      const response = await apiFetch(`/posts?${params}`);
      if (!alive.current) return;
      setRows(previous => next ? merge(previous || [], response.data) : response.data);
      if (!next) setRevision(value => value + 1);
      setCursor(response.meta?.nextCursor || null);
    } catch (cause) { if (alive.current) setError(cause.message); }
    finally { guard.current = false; if (alive.current) setLoading(false); }
  }, [groupId]);
  useEffect(() => {
    alive.current = true;
    queueMicrotask(() => { if (alive.current) load(); });
    return () => { alive.current = false; };
  }, [load]);
  const submit = async event => {
    event.preventDefault();
    const response = await mutation.run({ text: draft, ...(groupId ? { groupId } : {}), ...(attach && questionId ? { questionId } : {}) });
    if (!response) return;
    setRows(previous => merge([response.data], previous || []));
    setDraft(''); setAttach(false); setMessage('Publicación registrada.');
  };
  return <div className="social-feed">
    <form onSubmit={submit}>
      <label htmlFor={groupId ? `post-${groupId}` : 'post-public'}>{groupId ? 'Comparte una pregunta o duda con tu grupo' : 'Comparte una pregunta o duda con la comunidad'}</label>
      <textarea id={groupId ? `post-${groupId}` : 'post-public'} rows={3} maxLength={3000} disabled={mutation.busy || !!mutation.pending} value={mutation.pending?.text ?? draft} onChange={event => setDraft(event.target.value)} />
      {questionId && <label className="social-check"><input type="checkbox" checked={mutation.pending ? !!mutation.pending.questionId : attach} disabled={mutation.busy || !!mutation.pending} onChange={event => setAttach(event.target.checked)} />Adjuntar la pregunta de práctica</label>}
      <p>{groupId ? 'Solo los miembros de este grupo pueden ver esta publicación.' : 'Tu nombre y publicación serán visibles para la comunidad de Aprueba.'}</p>
      <button disabled={mutation.busy || (!mutation.pending && !draft.trim())}>{mutation.pending ? 'Reintentar publicación' : 'Publicar'}</button>
    </form>
    {mutation.error && <p role="alert">{mutation.error}</p>}
    {message && <p role="status">{message}</p>}
    <div className="social-actions"><button disabled={loading} onClick={() => load()}>Actualizar publicaciones</button></div>
    {error && <p role="alert">{error}</p>}
    {!rows && !error && <p>Cargando publicaciones...</p>}
    {rows?.length === 0 && <p>Aún no hay publicaciones. Comparte la primera duda o aporte.</p>}
    {rows?.map(row => <Post key={`${revision}:${row.id}`} initial={row} />)}
    {cursor && <button disabled={loading} onClick={() => load(cursor)}>Ver publicaciones anteriores</button>}
  </div>;
}
