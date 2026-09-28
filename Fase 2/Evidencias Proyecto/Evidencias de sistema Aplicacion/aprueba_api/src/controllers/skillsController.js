import { db } from '../config/firebase.js';

// Listar habilidades pedagógicas oficiales desde Firestore
export async function getSkills(req, res) {
  try {
    const { testId } = req.query;
    let query = db.collection('skills');

    if (testId) {
      query = query.where('testId', '==', testId);
    }

    const snapshot = await query.get();
    const skills = [];

    snapshot.forEach((doc) => {
      skills.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return res.success(skills);
  } catch (error) {
    return res.fail(error.message, null, 500);
  }
}

// Obtener detalle de habilidad con su árbol de prerrequisitos
export async function getSkillById(req, res) {
  try {
    const { skillId } = req.params;
    const doc = await db.collection('skills').doc(skillId).get();

    if (!doc.exists) {
      return res.fail('Habilidad no encontrada', null, 404);
    }

    return res.success({ id: doc.id, ...doc.data() });
  } catch (error) {
    return res.fail(error.message, null, 500);
  }
}