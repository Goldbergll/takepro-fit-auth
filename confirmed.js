// Başka bir sitenin çerçevesi (iframe) içinde açılırsa sayfayı gösterme.
if (window.top !== window.self) { document.documentElement.style.display = 'none'; try { window.top.location = window.self.location.href; } catch (e) {} }
  // Supabase onaydan sonra buraya #access_token=... ya da #error=... ile yönlendirir.
  // Oturum belirtecini adres çubuğunda bırakmamak için hash'i hemen temizliyoruz.
  (function () {
    var h = new URLSearchParams(location.hash.slice(1));
    var q = new URLSearchParams(location.search);
    var err = h.get('error') || q.get('error');
    if (location.hash || location.search) history.replaceState(null, '', location.pathname);
    if (err) {
      document.getElementById('ok').classList.add('hidden');
      document.getElementById('fail').classList.remove('hidden');
    }
  })();
