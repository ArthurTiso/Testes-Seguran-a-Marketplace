/* Abre/fecha o modal "Detalhe das tabelas" do painel de Banco de Dados.
   Servido localmente (/static/js) para respeitar a CSP (script-src 'self'). */
(function () {
  var modal = document.getElementById('modal-tabelas');
  if (!modal) return;
  var abrir = document.getElementById('abrir-tabelas');

  function pararRefresh() {
    var m = document.querySelector('meta[http-equiv="refresh"]');
    if (m) m.parentNode.removeChild(m); // não recarrega enquanto o modal está aberto
  }
  function abrirModal() {
    modal.classList.add('aberto');
    document.body.style.overflow = 'hidden';
    pararRefresh();
    try { localStorage.setItem('bancoModal', '1'); } catch (e) {}
  }
  function fecharModal() {
    try { localStorage.removeItem('bancoModal'); } catch (e) {}
    window.location.href = '/admin/banco'; // volta ao resumo e retoma o auto-refresh
  }

  if (abrir) abrir.addEventListener('click', function (e) { e.preventDefault(); abrirModal(); });
  var fechados = modal.querySelectorAll('[data-fechar]');
  for (var i = 0; i < fechados.length; i++) {
    fechados[i].addEventListener('click', function (e) { e.preventDefault(); fecharModal(); });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modal.classList.contains('aberto')) fecharModal();
  });

  // Reabre o modal após navegar entre tabelas (que recarrega a página).
  try { if (localStorage.getItem('bancoModal') === '1') abrirModal(); } catch (e) {}
})();
