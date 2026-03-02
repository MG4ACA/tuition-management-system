/**
 * datatableLabels plugin
 *
 * Automatically stamps each DataTable <td> with a `data-label` attribute
 * whose value is the corresponding column header text (read from <thead>).
 *
 * This enables the CSS card-stack mobile layout to show
 *   "COLUMN LABEL    value"
 * for every row cell without touching any individual page.
 */

function applyLabels(tableEl) {
  const headers = [...tableEl.querySelectorAll('.p-datatable-thead th')].map(
    (th) =>
      th.querySelector('.p-column-title')?.textContent?.trim() ?? th.textContent?.trim() ?? '',
  );
  if (!headers.length) return;

  tableEl.querySelectorAll('.p-datatable-tbody > tr').forEach((row) => {
    [...row.querySelectorAll(':scope > td')].forEach((td, i) => {
      td.setAttribute('data-label', headers[i] ?? '');
    });
  });
}

function watchTable(el, watched) {
  if (watched.has(el)) return;
  watched.add(el);

  applyLabels(el);

  // Re-apply when rows are added/removed (pagination, filtering, sorting)
  const tbody = el.querySelector('.p-datatable-tbody');
  if (tbody) {
    new MutationObserver(() => applyLabels(el)).observe(tbody, { childList: true });
  }
}

export default {
  install(app) {
    const watched = new WeakSet();

    function scan(root) {
      if (!root?.querySelectorAll) return;
      root.querySelectorAll('.p-datatable').forEach((t) => watchTable(t, watched));
    }

    // Run after every component mount / update
    app.mixin({
      mounted() {
        scan(this.$el);
      },
      updated() {
        scan(this.$el);
      },
    });

    // Catch tables injected by router navigation or async loads
    if (typeof MutationObserver !== 'undefined') {
      const start = () => {
        // Initial scan
        scan(document.body);

        new MutationObserver((muts) =>
          muts.forEach((m) =>
            m.addedNodes.forEach((node) => {
              if (node.nodeType !== 1) return;
              if (node.classList?.contains('p-datatable')) watchTable(node, watched);
              else scan(node);
            }),
          ),
        ).observe(document.body, { childList: true, subtree: true });
      };

      document.readyState === 'loading'
        ? document.addEventListener('DOMContentLoaded', start)
        : start();
    }
  },
};
