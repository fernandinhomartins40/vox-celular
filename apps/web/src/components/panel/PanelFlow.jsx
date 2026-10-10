import { Link } from 'react-router-dom';
import { Icon } from '../../icons';
import { formatPanelDate } from '../../lib/panel';

export function PanelSteps({ steps, current }) {
  return <ol className="panel-steps" aria-label="Etapas da tarefa">{steps.map((label, index) => <li key={label} aria-current={index === current ? 'step' : undefined} className={index <= current ? 'is-current' : ''}><span>{index < current ? <Icon.check /> : index + 1}</span><strong>{label}</strong></li>)}</ol>;
}
export function PanelEmptyState({ title, description, action, to, onAction }) {
  return <div className="panel-feedback"><Icon.package className="w-8 h-8" /><strong>{title}</strong><p>{description}</p>{action && (to ? <Link className="panel-primary-button" to={to}>{action}</Link> : <button className="panel-primary-button" onClick={onAction}>{action}</button>)}</div>;
}
export function PanelOrderTimeline({ timeline }) {
  return <ol className="panel-order-timeline" aria-label="Acompanhamento do pedido">{timeline.map((item, index) => <li key={item.id ?? index} className={item.ok ? 'is-complete' : ''}><span aria-hidden="true">{item.ok ? <Icon.check /> : index + 1}</span><div><strong>{item.status}</strong><small>{item.data ? formatPanelDate(item.data) : item.ok ? 'Etapa concluída' : 'Aguardando'}</small></div></li>)}</ol>;
}
