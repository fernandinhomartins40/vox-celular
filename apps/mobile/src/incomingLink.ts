const routes: Record<string, string> = {
  '/assistente': '/assistente', '/novidades': '/novidades',
  '/area-cliente/pedidos': '/pedidos', '/area-cliente/servicos': '/servicos',
  '/area-cliente/beneficios': '/beneficios', '/area-cliente/avisos': '/avisos',
  '/area-cliente/favoritos': '/favoritos', '/area-cliente': '/conta',
};
export function incomingLink(path: string) {
  try {
    if (path.length > 2048) return '/';
    if (path.startsWith('voxcelular://')) {
      const native = new URL(path);
      if (native.username || native.password || native.port) return '/';
      const nativePath = native.hostname ? `/${native.hostname}${native.pathname}` : native.pathname;
      const allowed = ['/', '/loja', '/assistente', '/ajuda', '/conta', '/pedidos', '/servicos', '/beneficios', '/avisos', '/favoritos', '/carrinho'];
      return allowed.includes(nativePath) ? nativePath : '/';
    }
    const url = new URL(path, 'https://www.voxcelular.com.br');
    if (url.protocol !== 'https:' || !['www.voxcelular.com.br', 'voxcelular.com.br'].includes(url.hostname) || url.username || url.password || (url.port && url.port !== '443')) return '/';
    const route = Object.hasOwn(routes, url.pathname) ? routes[url.pathname] : '/';
    if (route === '/novidades') {
      const id = url.searchParams.get('id');
      return id && /^[a-zA-Z0-9_-]{1,100}$/.test(id) ? `${route}?id=${encodeURIComponent(id)}` : route;
    }
    return route;
  } catch { return '/'; }
}
