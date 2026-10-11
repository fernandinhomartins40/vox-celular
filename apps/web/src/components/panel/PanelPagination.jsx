export default function PanelPagination({ pagination, label }) {
  const { page, pages, total, from, to, change } = pagination;
  if (!total) return null;
  return <nav className="panel-pagination" aria-label={`Páginas de ${label}`}>
    <span role="status">{from}–{to} de {total} {label}</span>
    {pages > 1 && <div><button className="panel-secondary-button" disabled={page === 1} onClick={() => change(page - 1)}>Anterior</button><span>Página {page} de {pages}</span><button className="panel-secondary-button" disabled={page === pages} onClick={() => change(page + 1)}>Próxima</button></div>}
  </nav>;
}
