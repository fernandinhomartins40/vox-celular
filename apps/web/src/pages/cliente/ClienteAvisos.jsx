import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { PanelPageHeader } from '../../components/panel/PanelShell';
import { PanelLoading } from '../../components/panel/PanelFeedback';
const destinations = { '/pedidos': '/area-cliente/pedidos', '/servicos': '/area-cliente/servicos', '/beneficios': '/area-cliente/beneficios' };
export default function ClienteAvisos() {
  const [rows, setRows] = useState(null), [error, setError] = useState(''), [loading, setLoading] = useState(true), [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(''); setRows(null);
    api.get('/notificacoes').then(data => { if (active) setRows(data); }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reload]);
  return <div><PanelPageHeader title="Meus avisos" description="Atualizações recentes dos seus pedidos e atendimentos." /><p className="text-sm text-slate-600 mb-5">Esta lista não comprova entrega de notificações no aparelho.</p><button className="panel-secondary-button mb-5" disabled={loading} onClick={() => setReload(value => value + 1)}>Atualizar avisos</button>{error && <p role="alert" className="text-red-700 mb-5">{error}</p>}{loading && <PanelLoading />}{rows?.length === 0 && <div className="panel-card p-6"><p>Nenhum aviso disponível.</p><Link to="/area-cliente/conta" className="text-blue-700 inline-block py-3">Consultar preferências na minha conta</Link></div>}<div className="grid gap-4">{rows?.map(row => <article key={row.id} className="panel-card p-6"><h2 className="font-semibold text-lg">{row.titulo}</h2><p className="text-slate-600 my-3">{row.mensagem}</p><p className="text-sm text-slate-500">{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(row.createdAt))} (Brasília)</p>{Object.hasOwn(destinations, row.destino) && <Link to={destinations[row.destino]} className="text-blue-700 inline-block py-3">Ver detalhes</Link>}</article>)}</div></div>;
}
