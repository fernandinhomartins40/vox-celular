import { Link } from 'react-router-dom';
import { Icon } from '../../icons';

export default function PanelNextAction({ title, description, action, to }) {
  return <section className="panel-next-action" aria-label="Próximo passo"><span className="panel-action-icon"><Icon.arrowRight /></span><div><h2>{title}</h2><p>{description}</p></div><Link className="panel-primary-button" to={to}>{action} <Icon.arrowRight /></Link></section>;
}
