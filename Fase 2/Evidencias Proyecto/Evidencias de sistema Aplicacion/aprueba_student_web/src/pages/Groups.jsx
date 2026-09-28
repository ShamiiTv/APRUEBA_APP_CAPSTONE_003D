import { useEffect, useState } from 'react';
import { apiFetch } from '../api/client';
import { useTheme } from '../context/ThemeContext';

export default function Groups() {
  const { t } = useTheme();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [subjectTestId, setSubjectTestId] = useState('m1');
  const [joinGroupId, setJoinGroupId] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  const fetchGroups = async () => {
    try {
      const res = await apiFetch('/groups');
      setGroups(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    setActionLoading(true);
    setMsg(null);

    try {
      await apiFetch('/groups', {
        method: 'POST',
        body: JSON.stringify({ name: newGroupName, subjectTestId })
      });
      setNewGroupName('');
      setShowCreateModal(false);
      setMsg({ type: 'ok', text: '¡Grupo de estudio creado con éxito!' });
      fetchGroups();
    } catch (err) {
      setMsg({ type: 'err', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!joinGroupId.trim()) return;
    setActionLoading(true);
    setMsg(null);

    try {
      await apiFetch('/groups/join', {
        method: 'POST',
        body: JSON.stringify({ groupId: joinGroupId.trim() })
      });
      setJoinGroupId('');
      setShowJoinModal(false);
      setMsg({ type: 'ok', text: '¡Te has unido al grupo correctamente!' });
      fetchGroups();
    } catch (err) {
      setMsg({ type: 'err', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div style={{ color: 'var(--muted)' }}>Cargando grupos de estudio...</div>;
  }

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h1 style={{ fontFamily: 'Montserrat', fontSize: '24px', fontWeight: 800, color: 'var(--ink)' }}>
            {t.groups.title}
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '14px', marginTop: '4px' }}>
            {t.groups.subtitle}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setShowJoinModal(true)}
            style={{
              backgroundColor: 'var(--panel)',
              color: 'var(--ink)',
              border: '1.5px solid var(--line)',
              borderRadius: '10px',
              padding: '10px 16px',
              fontFamily: 'Montserrat',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            {t.groups.joinWithCode}
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              backgroundColor: 'var(--cta)',
              color: 'var(--cta-ink)',
              border: 'none',
              borderRadius: '10px',
              padding: '10px 18px',
              fontFamily: 'Montserrat',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            {t.groups.createGroup}
          </button>
        </div>
      </div>

      {msg && (
        <div style={{
          marginBottom: '20px',
          padding: '12px 16px',
          borderRadius: '8px',
          fontSize: '13px',
          fontWeight: 600,
          background: msg.type === 'ok' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
          color: msg.type === 'ok' ? 'var(--accent)' : 'var(--danger)'
        }}>
          {msg.text}
        </div>
      )}

      {/* Grid de Grupos */}
      {groups.length === 0 ? (
        <div style={{
          background: 'var(--panel)',
          padding: '50px 24px',
          borderRadius: '16px',
          textAlign: 'center',
          border: '1px solid var(--line)',
          boxShadow: 'var(--shadow)'
        }}>
          <span style={{ fontSize: '40px' }}>👥</span>
          <h3 style={{ fontFamily: 'Montserrat', marginTop: '12px', fontSize: '18px', color: 'var(--ink)' }}>
            {t.groups.emptyTitle}
          </h3>
          <p style={{ color: 'var(--muted)', fontSize: '14px', marginTop: '6px' }}>
            {t.groups.emptySubtitle}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '20px' }}>
          {groups.map((g) => (
            <div
              key={g.id}
              style={{
                background: 'var(--panel)',
                borderRadius: '16px',
                padding: '20px',
                border: '1px solid var(--line)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: 'var(--shadow)'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    color: '#fff',
                    backgroundColor: g.color || 'var(--brand)',
                    padding: '3px 8px',
                    borderRadius: '6px'
                  }}>
                    {g.subjectTestId?.toUpperCase()}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                    ID: <code style={{ userSelect: 'all', color: 'var(--ink)' }}>{g.id.slice(0, 8)}</code>
                  </span>
                </div>

                <h3 style={{ fontFamily: 'Montserrat', fontSize: '17px', fontWeight: 800, marginTop: '12px', color: 'var(--ink)' }}>
                  {g.name}
                </h3>

                <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '8px' }}>
                  {g.memberCount} {g.memberCount === 1 ? 'miembro' : 'miembros'}
                </div>

                <div style={{ display: 'flex', gap: '6px', marginTop: '14px', flexWrap: 'wrap' }}>
                  {g.members?.map((m) => (
                    <div
                      key={m.uid}
                      title={`${m.name} (${m.role === 'owner' ? 'Líder' : 'Miembro'})`}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: m.role === 'owner' ? 'var(--cta)' : 'var(--brand)',
                        color: m.role === 'owner' ? 'var(--cta-ink)' : '#fff',
                        display: 'grid',
                        placeItems: 'center',
                        fontSize: '12px',
                        fontWeight: 800,
                        fontFamily: 'Montserrat'
                      }}
                    >
                      {m.name.charAt(0).toUpperCase()}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: '20px', paddingTop: '14px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Código completo:</span>
                <span
                  onClick={() => {
                    navigator.clipboard.writeText(g.id);
                    alert(`Código de grupo copiado: ${g.id}`);
                  }}
                  style={{ fontSize: '12px', color: 'var(--brand)', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Copiar Código
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Crear Grupo */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'grid',
          placeItems: 'center',
          zIndex: 100,
          padding: '20px'
        }}>
          <div style={{ background: 'var(--panel)', width: '100%', maxWidth: '420px', borderRadius: '16px', padding: '24px', border: '1px solid var(--line)', boxShadow: 'var(--shadow)' }}>
            <h3 style={{ fontFamily: 'Montserrat', fontSize: '18px', fontWeight: 800, color: 'var(--ink)' }}>
              Crear Grupo de Estudio
            </h3>
            <form onSubmit={handleCreate} style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--ink)', marginBottom: '6px' }}>Nombre del grupo</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Preu Matemáticas 2026"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--line)', backgroundColor: 'var(--soft)', color: 'var(--ink)', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--ink)', marginBottom: '6px' }}>Materia Principal</label>
                <select
                  value={subjectTestId}
                  onChange={(e) => setSubjectTestId(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--line)', outline: 'none', background: 'var(--soft)', color: 'var(--ink)' }}
                >
                  <option value="m1">Competencia Matemática 1 (M1)</option>
                  <option value="m2">Competencia Matemática 2 (M2)</option>
                  <option value="lectora">Competencia Lectora</option>
                  <option value="cien">Ciencias</option>
                  <option value="hist">Historia y Ciencias Sociales</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{ padding: '10px 14px', borderRadius: '8px', border: 'none', background: 'var(--soft)', color: 'var(--ink)', cursor: 'pointer', fontWeight: 600 }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{ padding: '10px 18px', borderRadius: '8px', border: 'none', background: 'var(--cta)', color: 'var(--cta-ink)', cursor: 'pointer', fontWeight: 700, fontFamily: 'Montserrat' }}
                >
                  {actionLoading ? 'Creando...' : 'Crear Grupo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Unirse con Código */}
      {showJoinModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'grid',
          placeItems: 'center',
          zIndex: 100,
          padding: '20px'
        }}>
          <div style={{ background: 'var(--panel)', width: '100%', maxWidth: '420px', borderRadius: '16px', padding: '24px', border: '1px solid var(--line)', boxShadow: 'var(--shadow)' }}>
            <h3 style={{ fontFamily: 'Montserrat', fontSize: '18px', fontWeight: 800, color: 'var(--ink)' }}>
              Unirse a un Grupo
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '4px' }}>
              Pídele el ID de grupo a tu compañero y pégalo aquí.
            </p>
            <form onSubmit={handleJoin} style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--ink)', marginBottom: '6px' }}>ID del Grupo</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: fK72mNpQ9x..."
                  value={joinGroupId}
                  onChange={(e) => setJoinGroupId(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--line)', backgroundColor: 'var(--soft)', color: 'var(--ink)', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  style={{ padding: '10px 14px', borderRadius: '8px', border: 'none', background: 'var(--soft)', color: 'var(--ink)', cursor: 'pointer', fontWeight: 600 }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{ padding: '10px 18px', borderRadius: '8px', border: 'none', background: 'var(--brand)', color: '#fff', cursor: 'pointer', fontWeight: 700, fontFamily: 'Montserrat' }}
                >
                  {actionLoading ? 'Uniéndose...' : 'Unirse al Grupo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}