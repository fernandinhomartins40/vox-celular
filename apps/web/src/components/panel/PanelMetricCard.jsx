import { Link } from 'react-router-dom';
import { Icon } from '../../icons';

export default function PanelMetricCard({ label, value, description, icon, to }) {
  const I = Icon[icon];
  const content = <><span className="panel-action-icon"><I /></span><strong className="panel-metric-value">{value}</strong><span>{label}</span><small>{description}</small></>;
  return to ? <Link to={to} className="panel-metric-card">{content}</Link> : <div className="panel-metric-card">{content}</div>;
}
