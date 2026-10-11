import { PanelLoading, PanelError } from '../../components/panel/PanelFeedback';
import PanelDialog from '../../components/panel/PanelDialog';
import { PanelPageHeader } from '../../components/panel/PanelShell';
import { useState, useEffect } from 'react';
import { api } from '../../lib/api.js';
import { Icon } from '../../icons';
import { PHONE_DIGITS } from '../../data';
import { formatPanelDate } from '../../lib/panel';

const NIVEL_STYLE = {
  'Bronze': 'text-amber-700 bg-amber-50',
  'Prata':  'text-zinc-500 bg-zinc-100',
  'Ouro':   'text-amber-500 bg-amber-50',
  'Platina':'text-violet-600 bg-violet-50',
};

const TIPO_STYLE = {
  ganho:   { cor: 'text-emerald-700', bg: 'bg-emerald-50', simbolo: '+' },
  resgate: { cor: 'text-[var(--red-500)]', bg: 'bg-red-50', simbolo: '-' },
  bonus:   { cor: 'text-[var(--royal-700)]', bg: 'bg-[var(--royal-50)]', simbolo: '+' },
};

const NIVEIS = [
  { nivel: 'Bronze', min: 0,    max: 199  },
  { nivel: 'Prata',  min: 200,  max: 599  },
  { nivel: 'Ouro',   min: 600,  max: 1199 },
  { nivel: 'Platina',min: 1200, max: null },
];

export default function ClienteFidelidade({ embedded = false, visible = true }) {
  const [fidelidade, setFidelidade] = useState(null);
  const [resgatado, setResgatado] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [resgatando, setResgatando] = useState(false);
  const [actionError, setActionError] = useState('');
  const [revisando, setRevisando] = useState(null);
  const [copyStatus, setCopyStatus] = useState('');

  useEffect(() => {
    api.get('/fidelidade/pontos')
      .then(setFidelidade)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const resgatar = async (recompensa) => {
    if (resgatando) return;
    if ((recompensa.pontos ?? recompensa.custo) > (fidelidade?.saldo ?? 0)) return;
    setResgatando(true);
    setActionError('');
    try {
      const r = await api.post(`/fidelidade/resgatar/${recompensa.id}`, {});
      setResgatado({ ...recompensa, codigo: r.codigo });
      setRevisando(null);
      setCopyStatus('');
      setFidelidade(prev => ({ ...prev, saldo: r.saldo ?? prev.saldo - (recompensa.pontos ?? recompensa.custo), resgates: [{ codigo: r.codigo, createdAt: new Date().toISOString(), recompensa: { titulo: recompensa.titulo ?? recompensa.nome } }, ...(prev.resgates ?? [])] }));
      try { setFidelidade(await api.get('/fidelidade/pontos')); }
      catch { setActionError('Resgate confirmado. Não foi possível atualizar o histórico agora; seu código continua disponível.'); }
    } catch (e) {
      setActionError(e.message);
    } finally {
      setResgatando(false);
    }
  };

  if (loading) return <PanelLoading />;
  if (error) return <PanelError message={error} />;
  if (!fidelidade) return null;

  const p = fidelidade;
  const progresso = p.meta ? Math.min(100, Math.max(0, Math.round((p.saldo / p.meta) * 100))) : 100;

  return (
    <div className="space-y-6">
      {!embedded && <PanelPageHeader title="Pontos e recompensas" description="Veja seu saldo e escolha uma recompensa." />}

      {/* Cartão de pontos */}
      <div className="royal-radiant rounded-2xl p-7 text-white relative overflow-hidden">
        <div className="absolute -bottom-10 -right-10 w-56 h-56 rounded-full bg-white/5" />
        <div className="relative flex flex-col sm:flex-row sm:items-end justify-between gap-5">
          <div>
            <div className="font-display text-[11px] tracking-[0.25em] text-white/55 mb-3">SEU SALDO</div>
            <div className="font-display font-black text-[64px] sm:text-[80px] leading-none tracking-tight">
              {p.saldo}
              <span className="text-[20px] font-semibold text-white/60 ml-2">pontos</span>
            </div>
            {p.meta && (
              <div className="mt-4">
                <div className="h-2 bg-white/20 rounded-full overflow-hidden w-64 max-w-full">
                  <div className="h-full bg-white rounded-full" style={{ width: `${progresso}%` }} />
                </div>
                <div className="flex justify-between text-[11px] text-white/55 mt-1.5">
                  <span>{p.saldo} pts</span>
                  <span>{p.meta} pts → {p.proximoNivel}</span>
                </div>
              </div>
            )}
          </div>
          {p.nivel && (
            <div className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-display font-bold text-[14px] ${NIVEL_STYLE[p.nivel] ?? 'text-white bg-white/15'}`}>
              <Icon.award className="w-5 h-5" /> Nível {p.nivel}
            </div>
          )}
        </div>
      </div>

      {/* Níveis */}
      <details className="bg-white border border-[var(--line)] rounded-2xl p-6">
        <summary className="font-display font-bold text-[18px] cursor-pointer">Como funcionam os níveis</summary>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          {NIVEIS.map((n, i) => {
            const atual = n.nivel === p.nivel;
            return (
              <div key={i} className={`rounded-xl p-4 text-center transition ${atual ? 'ring-2 ring-[var(--royal-700)] bg-[var(--royal-50)]' : 'bg-[var(--paper)]'}`}>
                <Icon.award className={`w-6 h-6 mx-auto mb-2 ${atual ? 'text-[var(--royal-700)]' : 'text-zinc-400'}`} />
                <div className={`font-display font-bold text-[14px] ${atual ? 'text-[var(--royal-700)]' : 'text-zinc-600'}`}>{n.nivel}</div>
                <div className="text-[11px] text-zinc-400 mt-0.5">{n.min}–{n.max ?? '∞'} pts</div>
                {atual && <div className="text-[10px] font-bold text-[var(--royal-700)] mt-1">VOCÊ ESTÁ AQUI</div>}
              </div>
            );
          })}
        </div>
      </details>

      <div className="grid md:grid-cols-2 gap-5">
        {/* Recompensas */}
        <div className="bg-white border border-[var(--line)] rounded-2xl p-6">
          <div className="font-display font-bold text-[18px] mb-4">Resgatar recompensas</div>
          {actionError && <p role="alert" className="text-red-600 mb-3">{actionError}</p>}
          <div className="space-y-3">
            {[...(p.recompensas ?? [])].sort((a, b) => (a.pontos ?? a.custo) - (b.pontos ?? b.custo)).map((r, i) => {
              const custo = r.pontos ?? r.custo ?? 0;
              const pode = custo <= p.saldo;
              return (
                <div key={r.id ?? i} className="panel-reward-card">
                  <div className="flex flex-wrap gap-3 items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg grid place-items-center ${pode ? 'bg-[var(--royal-50)] text-[var(--royal-700)]' : 'bg-zinc-100 text-zinc-400'}`}>
                      <Icon.gift className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-medium text-[13px]">{r.titulo ?? r.nome}</div>
                      <div className="text-[11px] text-zinc-500">{custo} pontos</div>
                    </div>
                  </div>
                  <button
                    disabled={!pode || resgatando}
                    onClick={() => { setRevisando(r); setActionError(''); }}
                    className={`px-3.5 h-8 rounded-full text-[12px] font-semibold transition ${pode ? 'bg-[var(--royal-700)] text-white hover:bg-[var(--royal-800)]' : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'}`}>
                    {pode ? 'Resgatar' : `Faltam ${custo - p.saldo}`}
                  </button>
                  </div>
                  {revisando?.id === r.id && <div className="panel-reward-review">
                    <strong>Usar {custo} pontos em {r.titulo ?? r.nome}?</strong>
                    <p>Seu saldo passa de {p.saldo} para {p.saldo - custo} pontos. O código ficará salvo em Meus resgates.</p>
                    <div className="panel-filter-bar"><button className="panel-primary-button" disabled={resgatando} onClick={() => resgatar(r)}>{resgatando ? 'Confirmando…' : 'Confirmar resgate'}</button><button className="panel-secondary-button" disabled={resgatando} onClick={() => setRevisando(null)}>Voltar</button></div>
                  </div>}
                </div>
              );
            })}
            {(p.recompensas ?? []).length === 0 && (
              <div className="text-center text-zinc-500 text-[13px] py-4">Nenhuma recompensa disponível.</div>
            )}
          </div>
        </div>

        {/* Histórico */}
        <div className="bg-white border border-[var(--line)] rounded-2xl p-6">
          <div className="font-display font-bold text-[18px] mb-4">Histórico de pontos</div>
          <div className="space-y-3">
            {(p.historico ?? []).map((h, i) => {
              const tipo = h.tipo?.toLowerCase() ?? (h.pontos > 0 ? 'ganho' : 'resgate');
              const t = TIPO_STYLE[tipo] ?? TIPO_STYLE.ganho;
              return (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg grid place-items-center ${t.bg}`}>
                      {tipo === 'ganho' || tipo === 'bonus'
                        ? <Icon.trendingUp className={`w-3.5 h-3.5 ${t.cor}`} />
                        : <Icon.gift className={`w-3.5 h-3.5 ${t.cor}`} />}
                    </div>
                    <div>
                      <div className="text-[13px] font-medium text-zinc-700">{h.descricao}</div>
                      <div className="text-[11px] text-zinc-400">{h.createdAt ? new Date(h.createdAt).toLocaleDateString('pt-BR') : h.data}</div>
                    </div>
                  </div>
                  <div className={`font-display font-bold text-[16px] ${t.cor}`}>
                    {t.simbolo}{Math.abs(h.pontos)}
                  </div>
                </div>
              );
            })}
            {(p.historico ?? []).length === 0 && (
              <div className="text-center text-zinc-500 text-[13px] py-4">Nenhuma movimentação ainda.</div>
            )}
          </div>
        </div>
      </div>

      <section className="panel-surface" aria-label="Meus resgates">
        <h2>Meus resgates</h2><p className="panel-muted">Os últimos 20 códigos ficam disponíveis aqui para você consultar novamente.</p>
        {(p.resgates ?? []).length === 0 ? <p>Você ainda não resgatou uma recompensa.</p> : <div className="panel-receipt-list">{p.resgates.map(r => <div key={r.id ?? r.codigo}><div><strong>{r.recompensa?.titulo ?? r.titulo}</strong><small>{formatPanelDate(r.createdAt)} · {r.usadoEm ? 'Utilizada' : 'Código gerado'}</small></div><button className="panel-secondary-button" onClick={() => { setResgatado({ titulo: r.recompensa?.titulo ?? r.titulo, codigo: r.codigo }); setCopyStatus(''); }}>Ver código</button></div>)}</div>}
      </section>

      {/* Modal resgate */}
      {resgatado && visible && (
        <PanelDialog label="Resgate confirmado" onClose={() => setResgatado(null)}>
          <div className="relative bg-white rounded-2xl w-full max-w-sm shadow-2xl p-8 text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-[var(--royal-50)] text-[var(--royal-700)] grid place-items-center mb-4">
              <Icon.gift className="w-8 h-8" />
            </div>
            <div className="font-display font-bold text-[24px] mb-2">Resgate confirmado!</div>
            <p className="text-zinc-600 text-[14px] mb-1"><strong>{resgatado.titulo ?? resgatado.nome}</strong></p>
            <p className="text-zinc-500 text-[13px] mb-6">
              Apresente o código ao atendente na loja ou envie via WhatsApp para usar sua recompensa.
            </p>
            <div className="bg-[var(--royal-50)] rounded-xl px-6 py-3 mb-6 font-display font-bold text-[22px] text-[var(--royal-700)] tracking-widest">
              {resgatado.codigo ?? 'Código indisponível'}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setResgatado(null)} className="flex-1 h-10 border border-[var(--line)] rounded-xl text-[13px] font-medium text-zinc-600 hover:bg-zinc-50">Fechar</button>
              <a href={`https://wa.me/${PHONE_DIGITS}?text=${encodeURIComponent(`Olá! Quero usar minha recompensa: ${resgatado.titulo ?? resgatado.nome}. Código: ${resgatado.codigo ?? 'indisponível'}`)}`}
                target="_blank" rel="noopener"
                className="flex-1 h-10 inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[13px] font-semibold transition">
                <Icon.whatsapp className="w-4 h-4" /> WhatsApp
              </a>
            </div>
            <button className="panel-secondary-button mt-3" onClick={async () => {
              try { await navigator.clipboard.writeText(resgatado.codigo); setCopyStatus('Código copiado.'); }
              catch { setCopyStatus('Selecione o código acima para copiar ou envie pelo WhatsApp.'); }
            }}>Copiar código</button><p role="status" className="panel-muted">{copyStatus}</p>
          </div>
        </PanelDialog>
      )}
    </div>
  );
}
