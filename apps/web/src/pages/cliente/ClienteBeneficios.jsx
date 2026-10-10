import { useSearchParams } from 'react-router-dom';
import { PanelPageHeader } from '../../components/panel/PanelShell';
import { setPanelParams } from '../../lib/panel';
import ClienteFidelidade from './ClienteFidelidade';
import ClientePromocoes from './ClientePromocoes';

export default function ClienteBeneficios({ initialTab = 'pontos' }) {
  const [params, setParams] = useSearchParams();
  const tab = ['pontos', 'ofertas'].includes(params.get('aba')) ? params.get('aba') : initialTab;
  return <div>
    <PanelPageHeader title="Meus benefícios" description="Use seus pontos, recupere códigos de recompensas e confira as ofertas." />
    <nav className="panel-sections" aria-label="Seções de benefícios">
      <button className="panel-secondary-button" aria-pressed={tab === 'pontos'} onClick={() => setPanelParams(setParams, { aba: 'pontos' }, false)}>Pontos e recompensas</button>
      <button className="panel-secondary-button" aria-pressed={tab === 'ofertas'} onClick={() => setPanelParams(setParams, { aba: 'ofertas' }, false)}>Ofertas da loja</button>
    </nav>
    {tab === 'pontos' ? <ClienteFidelidade embedded /> : <ClientePromocoes embedded />}
  </div>;
}
