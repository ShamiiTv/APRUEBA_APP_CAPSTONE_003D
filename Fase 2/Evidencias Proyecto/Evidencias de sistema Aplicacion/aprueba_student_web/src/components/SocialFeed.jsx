import ContentSkeleton from './ContentSkeleton';
import { useTheme } from '../context/useTheme';
import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '../api/client';
import { useSocialMutation } from '../hooks/useSocialMutation';
import './Social.css';

const merge = (previous, added) => [...new Map([...previous, ...added].map(row => [row.id, row])).values()];
const date = (value,lang) => value ? new Date(value).toLocaleString(lang==='en'?'en-GB':'es-CL', { timeZone: 'America/Santiago' }) : '';

function Comments({ postId, onCount }) {
  const {lang}=useTheme();const tr=(es,en)=>lang==='en'?en:es;
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
    setDraft(''); setMessage(tr('Comentario publicado.','Comment published.'));
  };
  return <section aria-label={tr('Comentarios','Comments')}>
    {error && <p role="alert">{error}</p>}
    {mutation.error && <p role="alert">{mutation.error}</p>}
    {message && <p role="status">{message}</p>}
    {!rows && !error && <ContentSkeleton kind="feed" />}
    {rows?.length === 0 && <p>{tr('Aún no hay comentarios.','No comments yet.')}</p>}
    {rows?.map(row => <article key={row.id}><strong>{row.contentDeleted||row.author.name==='Usuario eliminado'?tr('Usuario eliminado','Deleted user'):row.author.name}</strong><p className="social-text">{row.contentDeleted?tr('Comentario eliminado','Comment deleted'):row.text}</p><time dateTime={row.createdAt}>{date(row.createdAt,lang)}</time></article>)}
    <div className="social-actions"><button disabled={loading} onClick={() => load()}>{tr('Actualizar comentarios','Refresh comments')}</button>{cursor && <button disabled={loading} onClick={() => load(cursor)}>{tr('Ver comentarios anteriores','Older comments')}</button>}</div>
    <form onSubmit={submit}>
      <label htmlFor={`comment-${postId}`}>{tr('Escribe un comentario','Write a comment')}</label>
      <textarea id={`comment-${postId}`} maxLength={1000} value={mutation.pending?.text ?? draft} disabled={mutation.busy || !!mutation.pending} onChange={event => setDraft(event.target.value)} />
      <button disabled={mutation.busy || (!mutation.pending && !draft.trim())}>{mutation.pending ? tr('Reintentar comentario','Retry comment') : tr('Enviar comentario','Send comment')}</button>
    </form>
  </section>;
}

function Post({ initial }) {
  const {lang}=useTheme();const tr=(es,en)=>lang==='en'?en:es;
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
    <strong>{post.contentDeleted||post.author.name==='Usuario eliminado'?tr('Usuario eliminado','Deleted user'):post.author.name}</strong> <time dateTime={post.createdAt}>{date(post.createdAt,lang)}</time>
    <p className="social-text">{post.contentDeleted?tr('Publicación eliminada','Post deleted'):post.text}</p>
    {post.question && <section aria-label={tr('Pregunta compartida','Shared question')}><strong>{post.question.testId?.toUpperCase()}</strong><p className="social-text">{post.question.statement}</p><ol>{post.question.options?.map((option,index) => <li key={index}>{typeof option === 'string' ? option : option.text}</li>)}</ol><p>{tr('Pregunta compartida para conversar; no consume cuota ni entrega medallas.','Shared for discussion; it does not use your quota or award medals.')}</p></section>}
    {error && <p role="alert">{error}</p>}
    <div className="social-actions"><button aria-pressed={post.userLiked} disabled={busy} onClick={react}>{post.userLiked ? tr('Quitar Me gusta','Unlike') : tr('Me gusta','Like')} · {post.likeCount}</button><button aria-expanded={open} onClick={() => setOpen(value => !value)}>{tr('Comentarios','Comments')} · {post.commentCount}</button></div>
    {open && <Comments postId={post.id} onCount={count => setPost(previous => ({ ...previous, commentCount: count }))} />}
  </article>;
}

export default function SocialFeed({ groupId, questionId }) {
  const {lang}=useTheme();const tr=(es,en)=>lang==='en'?en:es;
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
    setDraft(''); setAttach(false); setMessage(tr('Publicación registrada.','Post saved.'));
  };
  return <div className="social-feed">
    <form onSubmit={submit}>
      <label htmlFor={groupId ? `post-${groupId}` : 'post-public'}>{groupId ? tr('Comparte una pregunta o duda con tu grupo','Share a question or doubt with your group') : tr('Comparte una pregunta o duda con la comunidad','Share a question or doubt with the community')}</label>
      <textarea id={groupId ? `post-${groupId}` : 'post-public'} rows={3} maxLength={3000} disabled={mutation.busy || !!mutation.pending} value={mutation.pending?.text ?? draft} onChange={event => setDraft(event.target.value)} />
      {questionId && <label className="social-check"><input type="checkbox" checked={mutation.pending ? !!mutation.pending.questionId : attach} disabled={mutation.busy || !!mutation.pending} onChange={event => setAttach(event.target.checked)} />{tr('Adjuntar la pregunta de práctica','Attach the practice question')}</label>}
      <p>{groupId ? tr('Solo los miembros de este grupo pueden ver esta publicación.','Only members of this group can see this post.') : tr('Tu nombre y publicación serán visibles para la comunidad de Aprueba.','Your name and post will be visible to the Aprueba community.')}</p>
      <button disabled={mutation.busy || (!mutation.pending && !draft.trim())}>{mutation.pending ? tr('Reintentar publicación','Retry post') : tr('Publicar','Publish')}</button>
    </form>
    {mutation.error && <p role="alert">{mutation.error}</p>}
    {message && <p role="status">{message}</p>}
    <div className="social-actions"><button disabled={loading} onClick={() => load()}>{tr('Actualizar publicaciones','Refresh posts')}</button></div>
    {error && <p role="alert">{error}</p>}
    {!rows && !error && <ContentSkeleton kind="feed" />}
    {rows?.length === 0 && <p>{tr('Aún no hay publicaciones. Comparte la primera duda o aporte.','No posts yet. Share the first question or contribution.')}</p>}
    {rows?.map(row => <Post key={`${revision}:${row.id}`} initial={row} />)}
    {cursor && <button disabled={loading} onClick={() => load(cursor)}>{tr('Ver publicaciones anteriores','Older posts')}</button>}
  </div>;
}
