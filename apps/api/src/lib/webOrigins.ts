const storeOrigins = ['https://www.voxcelular.com.br', 'https://voxcelular.com.br'];

// Both public hosts serve the same store. Never trust a request Host header,
// arbitrary subdomains, or a production alias for a different configured site.
export function allowedWebOrigin(origin: string | undefined, configured = process.env.CORS_ORIGIN || 'http://localhost:3000') {
  if (!origin) return false;
  return origin === configured || (storeOrigins.includes(configured) && storeOrigins.includes(origin));
}
