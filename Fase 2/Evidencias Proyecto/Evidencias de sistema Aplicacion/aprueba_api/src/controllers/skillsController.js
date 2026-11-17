import {TEST_IDS,identifier,problem,fields} from '../services/social.js';
import { db } from '../config/firebase.js';

// Listar habilidades pedagógicas oficiales desde Firestore
export async function getSkills(req, res) {
  try {
    fields(req.query,['testId']);
    const { testId } = req.query;
    if(testId!==undefined&&!TEST_IDS.includes(testId))throw problem('Prueba inválida');
    let query = db.collection('skills');

    if (testId) {
      query = query.where('testId', '==', testId);
    }

    const snapshot = await query.limit(300).get();
    const skills = [];

    snapshot.forEach((doc) => {
      skills.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return res.success(skills);
  } catch (error) {
    return res.fail(error.status===400?error.message:'No se pudieron consultar las habilidades',null,error.status===400?400:503);
  }
}

// Obtener detalle de habilidad con su árbol de prerrequisitos
export async function getSkillById(req, res) {
  try {
    const skillId=identifier(req.params.skillId);
    const doc = await db.collection('skills').doc(skillId).get();

    if (!doc.exists) {
      return res.fail('Habilidad no encontrada', null, 404);
    }

    return res.success({ id: doc.id, ...doc.data() });
  } catch (error) {
    return res.fail(error.status===400?error.message:'No se pudieron consultar las habilidades',null,error.status===400?400:503);
  }
}