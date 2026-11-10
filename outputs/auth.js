(function () {
  'use strict';

  const SUPABASE_URL = 'https://qyadfoimsalesldohngq.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_ZN3kmoS6Y2VzsP2rGy1rWA_7pHqDHRQ';
  const OFFICIAL_SITE = 'https://devcarlos-code.github.io/demon-snike/outputs/';
  const client = window.supabase && window.supabase.createClient
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
    : null;

  const $ = id => document.getElementById(id);
  const signedOut = $('accountSignedOut');
  const signedIn = $('accountSignedIn');
  const status = $('accountStatus');
  const message = $('accountMessage');

  if (!signedOut || !signedIn || !message) return;

  function showMessage(text, isError) {
    message.textContent = text;
    message.dataset.error = isError ? 'true' : 'false';
  }

  function authErrorMessage(error) {
    const code = String(error && (error.code || error.name) || '').toLowerCase();
    if (code.includes('invalid_credentials')) return 'El correo o la contraseña no coinciden.';
    if (code.includes('email_not_confirmed')) return 'Confirma tu correo antes de iniciar sesión.';
    if (code.includes('user_already_exists')) return 'Ya existe una cuenta con ese correo. Intenta iniciar sesión.';
    if (code.includes('weak_password')) return 'La contraseña no cumple los requisitos de seguridad.';
    if (code.includes('network') || !navigator.onLine) return 'No hay conexión con el servicio de cuentas. Revisa tu conexión e inténtalo de nuevo.';
    if (code.includes('provider') || code.includes('oauth')) return 'No se pudo abrir Google. Verifica la configuración de OAuth e inténtalo de nuevo.';
    return 'No se pudo completar la operación. Revisa los datos e inténtalo de nuevo.';
  }

  function authRedirectUrl() {
    return window.location.hostname === 'devcarlos-code.github.io'
      ? OFFICIAL_SITE
      : window.location.origin + window.location.pathname;
  }

  function cleanAuthUrl() {
    const url = new URL(window.location.href);
    ['code', 'error', 'error_code', 'error_description', 'state'].forEach(key => url.searchParams.delete(key));
    if (url.hash.includes('access_token=') || url.hash.includes('error_description=')) url.hash = '';
    window.history.replaceState(null, '', url.pathname + url.search + url.hash);
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
      console.error('Error de autenticación:', { code: error && error.code, status: error && error.status });
      showMessage(authErrorMessage(error), true);
    }
  }

  if (!client) {
    showMessage('El servicio de cuentas no se pudo cargar. Recarga la página e inténtalo de nuevo.', true);
    return;
  }

  $('accountSignIn').addEventListener('click', () => run(async () => {
    const emailInput = $('accountEmail');
    const email = emailInput.value.trim();
    const passwordInput = $('accountPassword');
    const password = passwordInput.value;
    passwordInput.autocomplete = 'current-password';
    if (!email || !emailInput.validity.valid) return showMessage('Escribe un correo electrónico válido.', true);
    if (!password) return showMessage('Escribe tu contraseña.', true);
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }));

  $('accountSignUp').addEventListener('click', () => run(async () => {
    const emailInput = $('accountEmail');
    const email = emailInput.value.trim();
    const passwordInput = $('accountPassword');
    const password = passwordInput.value;
    passwordInput.autocomplete = 'new-password';
    if (!email || !emailInput.validity.valid || password.length < 8) return showMessage('Usa un correo válido y una contraseña de al menos 8 caracteres.', true);
    const { data, error } = await client.auth.signUp({ email, password });
    if (error) throw error;
    showMessage(data.session ? 'Cuenta creada y sesión iniciada.' : 'Cuenta creada. Revisa tu correo para confirmar la cuenta.', false);
  }));

  $('accountGoogle').addEventListener('click', () => run(async () => {
    const { error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: authRedirectUrl() }
    });
    if (error) throw error;
  }));

  $('accountSignOut').addEventListener('click', () => run(async () => {
    const { error } = await client.auth.signOut();
    if (error) throw error;
    showMessage('Sesión cerrada.', false);
  }));

  const authError = new URLSearchParams(window.location.hash.slice(1)).get('error_description') || new URLSearchParams(window.location.search).get('error_description');
  if (authError) showMessage('Google no pudo iniciar sesión. Revisa la configuración de acceso e inténtalo de nuevo.', true);
  client.auth.onAuthStateChange((_event, session) => setUser(session && session.user));
  client.auth.getSession().then(({ data, error }) => {
    if (error) {
      showMessage('No se pudo comprobar la sesión. Recarga la página e inténtalo de nuevo.', true);
      cleanAuthUrl();
      return;
    }
    setUser(data.session && data.session.user);
    if (window.location.hash.includes('access_token=') || window.location.hash.includes('error_description=') || window.location.search.includes('code=') || window.location.search.includes('error_description=')) cleanAuthUrl();
  }).catch(error => {
    console.error('No se pudo restaurar la sesión:', { code: error && error.code });
    showMessage('No se pudo comprobar la sesión. Recarga la página e inténtalo de nuevo.', true);
    cleanAuthUrl();
  });
})();
