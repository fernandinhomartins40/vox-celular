import { Link } from 'react-router-dom';
import './panel.css';

export default function PanelAuthLayout({ title, description, children }) {
  return <div className="vox-panel panel-auth">
    <header className="panel-auth-header"><Link to="/" className="panel-auth-logo" aria-label="VOX Celular">VOX<span>.</span></Link><Link to="/">Voltar para a loja</Link></header>
    <main className="panel-auth-main"><div className="panel-auth-card"><h1>{title}</h1><p>{description}</p>{children}</div></main>
  </div>;
}
