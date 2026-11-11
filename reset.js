// Başka bir sitenin çerçevesi (iframe) içinde açılırsa sayfayı gösterme.
if (window.top !== window.self) { document.documentElement.style.display = 'none'; try { window.top.location = window.self.location.href; } catch (e) {} }
  // Supabase anon anahtarı herkese açık olacak şekilde tasarlanmıştır (uygulamada da var);
  // veri erişimini RLS korur. service_role anahtarı ASLA buraya konmaz.
  var SUPABASE_URL = 'https://qfohlptcgdikkmcdrsau.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmb2hscHRjZ2Rpa2ttY2Ryc2F1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5MjEwNTUsImV4cCI6MjA5MTQ5NzA1NX0.gqIx9F7fPbGN0KVW1MoIOI8dRWQSCO855yrVpUM7lWk';

  function show(id) {
    ['loading', 'form-wrap', 'done', 'fail'].forEach(function (s) {
      document.getElementById(s).classList.toggle('hidden', s !== id);
    });
  }

  var hashErr = new URLSearchParams(location.hash.slice(1)).get('error');
  var client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { detectSessionInUrl: true, persistSession: false, autoRefreshToken: false }
  });

  var ready = false;
  client.auth.onAuthStateChange(function (event, session) {
    if (session && (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
      ready = true;
      history.replaceState(null, '', location.pathname);   // belirteci adres çubuğundan sil
      show('form-wrap');
    }
  });
  setTimeout(function () { if (!ready) { history.replaceState(null, '', location.pathname); show('fail'); } },
             hashErr ? 0 : 4000);

  document.getElementById('form').addEventListener('submit', async function (e) {
    e.preventDefault();
    var pw = document.getElementById('pw').value;
    var pw2 = document.getElementById('pw2').value;
    var msg = document.getElementById('msg');
    var btn = document.getElementById('btn');
    msg.textContent = '';
    if (pw.length < 6) { msg.textContent = 'Şifre en az 6 karakter olmalı.'; return; }
    if (pw !== pw2) { msg.textContent = 'İki şifre birbirinin aynı değil.'; return; }
    btn.disabled = true; btn.textContent = 'Kaydediliyor…';
    var res = await client.auth.updateUser({ password: pw });
    if (res.error) {
      btn.disabled = false; btn.textContent = 'Şifreyi kaydet';
      msg.textContent = /different from the old/i.test(res.error.message)
        ? 'Yeni şifre eskisiyle aynı olamaz.'
        : /session|expired|jwt/i.test(res.error.message)
        ? 'Linkin süresi dolmuş. Uygulamadan yeni bir link iste.'
        : 'Şifre kaydedilemedi: ' + res.error.message;
      return;
    }
    await client.auth.signOut();
    show('done');
  });
