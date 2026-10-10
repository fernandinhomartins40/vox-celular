export function PanelLoading() {
  return <div role="status" className="panel-feedback"><span className="panel-spinner" aria-hidden="true" /><span>Carregando informações…</span></div>;
}
export function PanelError({ message }) {
  return <div role="alert" className="panel-feedback panel-error"><strong>Não foi possível carregar as informações.</strong><p>{message}</p><button onClick={() => window.location.reload()}>Tentar novamente</button></div>;
}
