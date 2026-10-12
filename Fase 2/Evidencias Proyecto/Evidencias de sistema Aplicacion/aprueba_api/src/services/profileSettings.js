const TESTS = ['m1','m2','lectora','cien','hist'];
const ALLOWED = ['name','school','region','selectedTests','difficulty','theme','locale','lang','dailyReminder','reminderTime','practiceFormat','targetTestId'];
const invalid = field => { throw Object.assign(new Error('Revisa los datos del perfil y las preferencias.'),{ status:400,code:'INVALID_PROFILE',field }); };

export function profilePatch(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body) || !Object.keys(body).length || Object.keys(body).some(k => !ALLOWED.includes(k))) invalid('body');
  const patch = {};
  for (const [field,max] of [['name',120],['school',200],['region',100]]) {
    if (body[field] === undefined) continue;
    if (typeof body[field] !== 'string' || body[field].length > max || (field === 'name' && !body[field].trim())) invalid(field);
    patch[field] = body[field].trim();
  }
  if (patch.name !== undefined) patch.nameLower = patch.name.toLowerCase();
  for (const [field,values] of [['theme',['light','dark']],['difficulty',['d1','d2','d3']],['practiceFormat',['random']],['targetTestId',TESTS]]) {
    if (body[field] === undefined) continue;
    if (!values.includes(body[field])) invalid(field);
    patch[field] = body[field];
  }
  if (body.locale !== undefined && body.lang !== undefined && body.locale !== body.lang) invalid('locale');
  const locale = body.locale !== undefined ? body.locale : body.lang;
  if (locale !== undefined) {
    if (!['es','en'].includes(locale)) invalid('locale');
    patch.locale = locale;
  }
  if (body.dailyReminder !== undefined) {
    if (typeof body.dailyReminder !== 'boolean') invalid('dailyReminder');
    patch.dailyReminder = body.dailyReminder;
  }
  if (body.reminderTime !== undefined) {
    if (typeof body.reminderTime !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(body.reminderTime)) invalid('reminderTime');
    patch.reminderTime = body.reminderTime;
  }
  if (body.selectedTests !== undefined) {
    const tests = body.selectedTests;
    if (!Array.isArray(tests) || !tests.length || tests.length > TESTS.length || new Set(tests).size !== tests.length || tests.some(id => !TESTS.includes(id))) invalid('selectedTests');
    patch.selectedTests = [...tests];
  }
  if (!Object.keys(patch).length) invalid('body');
  return patch;
}
