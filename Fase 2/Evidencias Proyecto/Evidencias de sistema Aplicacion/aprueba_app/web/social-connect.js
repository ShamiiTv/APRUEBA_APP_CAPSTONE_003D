// SDK oficial cargado solo cuando se solicita vincular una cuenta.
window.apruebaLinkProvider = async function(sessionJson, providerId) {
  const session=JSON.parse(sessionJson);
  if (!['google.com','facebook.com'].includes(providerId)) throw new Error('INVALID_PROVIDER');
  const [appSdk,sdk]=await Promise.all([
    import('https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js'),
  ]);
  const app=appSdk.getApps().find(item=>item.name==='aprueba-link') || appSdk.initializeApp(session.config,'aprueba-link');
  const auth=sdk.getAuth(app);
  try {
    await sdk.setPersistence(auth,sdk.inMemoryPersistence);
    const credential=await sdk.signInWithCustomToken(auth,session.customToken);
    if (credential.user.uid!==session.uid) throw new Error('INVALID_IDENTITY');
    const provider=providerId==='google.com'?new sdk.GoogleAuthProvider():new sdk.FacebookAuthProvider();
    await sdk.linkWithPopup(credential.user,provider);
    return 'linked';
  } finally {await sdk.signOut(auth);}
};
