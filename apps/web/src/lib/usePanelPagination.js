import { useSearchParams } from 'react-router-dom';
import { setPanelParams } from './panel';

export function usePanelPagination(items, pageSize = 12) {
  const [params, setParams] = useSearchParams();
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  const requested = Number(params.get('pagina'));
  const page = Math.min(pages, Math.max(1, Number.isInteger(requested) ? requested : 1));
  return { items: items.slice((page - 1) * pageSize, page * pageSize), page, pages, total: items.length,
    from: items.length ? (page - 1) * pageSize + 1 : 0, to: Math.min(items.length, page * pageSize),
    change: value => setPanelParams(setParams, { pagina: value > 1 ? String(value) : '' }) };
}

