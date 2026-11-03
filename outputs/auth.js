(function () {
  'use strict';

  const SUPABASE_URL = 'https://qyadfoimsalesldohngq.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_ZN3kmoS6Y2VzsP2rGy1rWA_7pHqDHRQ';
  const client = window.supabase && window.supabase.createClient
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
    : null;

  const $ = id => document.getElementById(id);
  const signedOut = $('accountSignedOut');
  const signedIn = $('accountSignedIn');
  const status = $('accountStatus');
  const message = $('accountMessage');

  if (!client || !signedOut || !signedIn) return;

  function showMessage(text, isError) {
    message.textContent = text;
    message.dataset.error = isError ? 'true' : 'false';
  }

  function setUser(user) {
    signedOut.hidden = Boolean(user);
    signedIn.hidden = !user;
    if (user) {
      status.textContent = 'SESIÓN ACTIVA · PROGRESO LISTO PARA SINCRONIZAR';
      $('accountUser').textContent = user.email || 'Cuenta conectada';
      showMessage('Sesión iniciada correctamente.', false);
    } else {
      status.textContent = 'INICIA SESIÓN PARA SINCRONIZAR TU PROGRESO';
      $('accountUser').textContent = '';
    }
  }

  async function run(action) {
    showMessage('', false);
    try {
      await action();
    } catch (error) {
      console.error('Error de autenticación:', error);
      showMessage('No se pudo completar la operación. Revisa los datos e inténtalo de nuevo.', true);
    }
  }

  $('accountSignIn').addEventListener('click', () => run(async () => {
    const email = $('accountEmail').value.trim();
    const password = $('accountPassword').value;
    if (!email || !password) return showMessage('Escribe tu correo y contraseña.', true);
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }));

  $('accountSignUp').addEventListener('click', () => run(async () => {
    const email = $('accountEmail').value.trim();
    const password = $('accountPassword').value;
    if (!email || password.length < 6) return showMessage('Usa un correo válido y una contraseña de al menos 6 caracteres.', true);
    const { data, error } = await client.auth.signUp({ email, password });
    if (error) throw error;
    showMessage(data.session ? 'Cuenta creada y sesión iniciada.' : 'Cuenta creada. Revisa tu correo para confirmar la cuenta.', false);
  }));

  $('accountGoogle').addEventListener('click', () => run(async () => {
    const { error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + window.location.pathname }
    });
    if (error) throw error;
  }));

  $('accountSignOut').addEventListener('click', () => run(async () => {
    const { error } = await client.auth.signOut();
    if (error) throw error;
    showMessage('Sesión cerrada.', false);
  }));

  client.auth.onAuthStateChange((_event, session) => setUser(session && session.user));
  client.auth.getSession().then(({ data, error }) => {
    if (error) return showMessage('No se pudo comprobar la sesión.', true);
    setUser(data.session && data.session.user);
  });
})();
