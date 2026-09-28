import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/client';
import { useAuth } from '../auth/AuthContext';

const AVAILABLE_TESTS = [
  { id: 'm1', label: 'Competencia Matemática 1 (M1)', obligatory: true },
  { id: 'lectora', label: 'Competencia Lectora', obligatory: true },
  { id: 'm2', label: 'Competencia Matemática 2 (M2)', obligatory: false },
  { id: 'cien', label: 'Ciencias (Biología, Física, Química)', obligatory: false },
  { id: 'hist', label: 'Historia y Ciencias Sociales', obligatory: false },
];

export default function Onboarding() {
  const { user, updateUserState } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [school, setSchool] = useState(user?.school || '');
  const [region, setRegion] = useState(user?.region || 'Metropolitana de Santiago');
  const [selectedTests, setSelectedTests] = useState(user?.selectedTests || ['lectora', 'm1']);
  const [difficulty, setDifficulty] = useState('d2');
  const [practiceFormat, setPracticeFormat] = useState('random');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const toggleTest = (testId) => {
    if (selectedTests.includes(testId)) {
      if (selectedTests.length === 1) return;
      setSelectedTests(selectedTests.filter((t) => t !== testId));
    } else {
      setSelectedTests([...selectedTests, testId]);
    }
  };

  const handleFinish = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await apiFetch('/auth/onboarding', {
        method: 'POST',
        body: JSON.stringify({
          school,
          region,
          selectedTests,
          difficulty,
          practiceFormat,
        }),
      });

      updateUserState(res.data);
      navigate('/');
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--fondo)',
      display: 'grid',
      placeItems: 'center',
      padding: '24px',
    }}>
      <div style={{
        background: '#FFFFFF',
        width: '100%',
        maxWidth: '560px',
        borderRadius: '20px',
        padding: '36px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 8px 30px rgba(26,54,93,0.06)',
      }}>
        {/* Barra de progreso */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '28px' }}>
          {[1, 2].map((s) => (
            <div
              key={s}
              style={{
                flex: 1,
                height: '6px',
                borderRadius: '4px',
                backgroundColor: step >= s ? 'var(--azul)' : '#E2E8F0',
                transition: 'background-color 0.2s',
              }}
            />
          ))}
        </div>

        {error && (
          <div style={{
            marginBottom: '16px',
            padding: '12px',
            borderRadius: '8px',
            background: 'rgba(239,68,68,0.1)',
            color: 'var(--error)',
            fontSize: '13px',
            fontWeight: 600,
          }}>
            {error}
          </div>
        )}

        {step === 1 ? (
          <div>
            <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--oro)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Paso 1 de 2
            </span>
            <h1 style={{ fontFamily: 'Montserrat', fontSize: '22px', fontWeight: 800, color: 'var(--texto-oscuro)', marginTop: '4px' }}>
              Tu contexto académico
            </h1>
            <p style={{ color: 'var(--gris-medio)', fontSize: '13px', marginTop: '4px' }}>
              Personalizamos los ensayos y cuotas según tu institución educativa.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '24px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                  Colegio / Liceo / Preuniversitario
                </label>
                <input
                  type="text"
                  placeholder="Ej: Instituto Nacional"
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1px solid #E2E8F0', outline: 'none', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                  Región
                </label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1px solid #E2E8F0', outline: 'none', background: '#fff', fontSize: '13px' }}
                >
                  <option value="Arica y Parinacota">Arica y Parinacota</option>
                  <option value="Tarapacá">Tarapacá</option>
                  <option value="Antofagasta">Antofagasta</option>
                  <option value="Atacama">Atacama</option>
                  <option value="Coquimbo">Coquimbo</option>
                  <option value="Valparaíso">Valparaíso</option>
                  <option value="Metropolitana de Santiago">Metropolitana de Santiago</option>
                  <option value="O'Higgins">O'Higgins</option>
                  <option value="Maule">Maule</option>
                  <option value="Ñuble">Ñuble</option>
                  <option value="Biobío">Biobío</option>
                  <option value="Araucanía">Araucanía</option>
                  <option value="Los Ríos">Los Ríos</option>
                  <option value="Los Lagos">Los Lagos</option>
                  <option value="Aysén">Aysén</option>
                  <option value="Magallanes">Magallanes</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '28px' }}>
              <button
                type="button"
                onClick={() => setStep(2)}
                style={{
                  backgroundColor: 'var(--azul)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '12px 24px',
                  fontFamily: 'Montserrat',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Siguiente Paso →
              </button>
            </div>
          </div>
        ) : (
          <div>
            <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--oro)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Paso 2 de 2
            </span>
            <h1 style={{ fontFamily: 'Montserrat', fontSize: '22px', fontWeight: 800, color: 'var(--texto-oscuro)', marginTop: '4px' }}>
              Pruebas PAES que rendirás
            </h1>
            <p style={{ color: 'var(--gris-medio)', fontSize: '13px', marginTop: '4px' }}>
              Selecciona las asignaturas que componen tu postulación universitaria.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
              {AVAILABLE_TESTS.map((t) => {
                const isSelected = selectedTests.includes(t.id);
                return (
                  <div
                    key={t.id}
                    onClick={() => toggleTest(t.id)}
                    style={{
                      border: `1.5px solid ${isSelected ? 'var(--azul)' : '#E2E8F0'}`,
                      backgroundColor: isSelected ? 'rgba(26,54,93,0.04)' : '#FFFFFF',
                      borderRadius: '10px',
                      padding: '12px 16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--texto-oscuro)' }}>
                      {t.label}
                    </span>
                    <span style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '6px',
                      border: `1.5px solid ${isSelected ? 'var(--azul)' : '#CBD5E1'}`,
                      backgroundColor: isSelected ? 'var(--azul)' : 'transparent',
                      color: '#fff',
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: '11px',
                      fontWeight: 800,
                    }}>
                      {isSelected ? '✓' : ''}
                    </span>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '28px' }}>
              <button
                type="button"
                onClick={() => setStep(1)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--gris-medio)',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                ← Volver
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={handleFinish}
                style={{
                  backgroundColor: 'var(--oro)',
                  color: 'var(--azul)',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '12px 26px',
                  fontFamily: 'Montserrat',
                  fontWeight: 800,
                  fontSize: '13px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? 'Guardando perfil...' : 'Comenzar a Practicar 🚀'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}