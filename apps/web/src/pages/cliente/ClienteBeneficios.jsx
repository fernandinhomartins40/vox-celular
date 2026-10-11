import { useSearchParams } from 'react-router-dom';
import { useState } from 'react';
import { PanelPageHeader } from '../../components/panel/PanelShell';
import { setPanelParams } from '../../lib/panel';
import ClienteFidelidade from './ClienteFidelidade';
import ClientePromocoes from './ClientePromocoes';

export default function ClienteBeneficios({ initialTab = 'pontos' }) {
  const [params, setParams] = useSearchParams();
  const tab = ['pontos', 'ofertas'].includes(params.get('aba')) ? params.get('aba') : initialTab;
  const [visited, setVisited] = useState(() => [tab]);
  const choose = value => { setVisited(previous => [...new Set([...previous, tab, value])]); setPanelParams(setParams, { aba: value }, false); };
  return <div>
    <PanelPageHeader title="Meus benefícios" description="Use seus pontos, recupere códigos de recompensas e confira as ofertas." />
    <nav className="panel-sections" aria-label="Seções de benefícios">
      <button className="panel-secondary-button" aria-pressed={tab === 'pontos'} onClick={() => choose('pontos')}>Pontos e recompensas</button>
      <button className="panel-secondary-button" aria-pressed={tab === 'ofertas'} onClick={() => choose('ofertas')}>Ofertas da loja</button>
    </nav>
    {(visited.includes('pontos') || tab === 'pontos') && <div hidden={tab !== 'pontos'}><ClienteFidelidade embedded visible={tab === 'pontos'} /></div>}
    {(visited.includes('ofertas') || tab === 'ofertas') && <div hidden={tab !== 'ofertas'}><ClientePromocoes embedded /></div>}
  </div>;
}
