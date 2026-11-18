// Başka bir sitenin çerçevesi (iframe) içinde açılırsa sayfayı gösterme.
if (window.top !== window.self) { document.documentElement.style.display = 'none'; try { window.top.location = window.self.location.href; } catch (e) {} }
  // Supabase anon anahtarı herkese açık olacak şekilde tasarlanmıştır (uygulamada da var);
  // veri erişimini RLS korur. service_role anahtarı ASLA buraya konmaz.
  var SUPABASE_URL = 'https://qfohlptcgdikkmcdrsau.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmb2hscHRjZ2Rpa2ttY2Ryc2F1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5MjEwNTUsImV4cCI6MjA5MTQ5NzA1NX0.gqIx9F7fPbGN0KVW1MoIOI8dRWQSCO855yrVpUM7lWk';

  // 18 Kas 2026: İki adımlı doğrulama (MFA) açık hesaplarda Supabase, şifre
  // değiştirmeden önce 6 haneli kodu ister ("AAL2 session is required").
  // Eskiden bu hata "Linkin süresi dolmuş" diye gösteriliyordu (yanlış).
  // Artık gerekirse kod alanı açılır; kod doğrulanınca şifre kaydedilir.

  function show(id) {
    ['loading', 'form-wrap', 'done', 'fail'].forEach(function (s) {
      document.getElementById(s).classList.toggle('hidden', s !== id);
    });
  }

  var hashErr = new URLSearchParams(location.hash.slice(1)).get('error');
  var client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { detectSessionInUrl: true, persistSession: false, autoRefreshToken: false }
  });

  // ── 6 haneli kod alanı (yalnız gerekince görünür) ──
  var btn = document.getElementById('btn');
  var otpLabel = document.createElement('label');
  otpLabel.htmlFor = 'otp';
  otpLabel.textContent = 'Doğrulama kodu (Authenticator uygulamandaki 6 hane)';
  var otp = document.createElement('input');
  otp.id = 'otp'; otp.type = 'text'; otp.inputMode = 'numeric';
  otp.autocomplete = 'one-time-code'; otp.maxLength = 6; otp.pattern = '[0-9]*';
  otpLabel.style.display = 'none'; otp.style.display = 'none';
  btn.parentNode.insertBefore(otpLabel, btn);
  btn.parentNode.insertBefore(otp, btn);
  var needsCode = false;

  function askForCode(msg) {
    needsCode = true;
    otpLabel.style.display = ''; otp.style.display = '';
    otp.focus();
    msg.textContent = 'Bu hesapta iki adımlı doğrulama açık. Şifreyi kaydetmek için Authenticator uygulamandaki 6 haneli kodu gir.';
  }

  async function verifyCode(code) {
    var f = await client.auth.mfa.listFactors();
    if (f.error) return f.error;
    var totp = (f.data && f.data.totp || []).filter(function (x) { return x.status === 'verified'; })[0];
    if (!totp) return { message: 'Doğrulama yöntemi bulunamadı.' };
    var v = await client.auth.mfa.challengeAndVerify({ factorId: totp.id, code: code });
    return v.error || null;
  }

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
    msg.textContent = '';
    if (pw.length < 6) { msg.textContent = 'Şifre en az 6 karakter olmalı.'; return; }
    if (pw !== pw2) { msg.textContent = 'İki şifre birbirinin aynı değil.'; return; }
    if (needsCode && !/^\d{6}$/.test(otp.value.trim())) { msg.textContent = '6 haneli kodu gir.'; return; }

    btn.disabled = true; btn.textContent = 'Kaydediliyor…';
    var reset = function () { btn.disabled = false; btn.textContent = 'Şifreyi kaydet'; };

    if (needsCode) {
      var verr = await verifyCode(otp.value.trim());
      if (verr) {
        reset();
        msg.textContent = /invalid|expired/i.test(verr.message || '')
          ? 'Kod hatalı ya da süresi geçti. Uygulamadaki güncel kodu gir.'
          : 'Kod doğrulanamadı: ' + verr.message;
        return;
      }
    }

    var res = await client.auth.updateUser({ password: pw });
    if (res.error) {
      reset();
      var m = res.error.message || '';
      if (res.error.code === 'insufficient_aal' || /AAL2|MFA/i.test(m)) { askForCode(msg); return; }
      msg.textContent = /different from the old/i.test(m)
        ? 'Yeni şifre eskisiyle aynı olamaz.'
        : /expired|jwt|session.*(missing|not found)/i.test(m)
        ? 'Linkin süresi dolmuş. Uygulamadan yeni bir link iste.'
        : 'Şifre kaydedilemedi: ' + m;
      return;
    }
    await client.auth.signOut();
    show('done');
  });
