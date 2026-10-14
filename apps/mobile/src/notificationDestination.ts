const destinations = ['/pedidos', '/servicos', '/beneficios'] as const;
export function notificationDestination(data: unknown): typeof destinations[number] | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const value = data as Record<string, unknown>;
  if (typeof value.id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(value.id)) return null;
  return destinations.find(route => route === value.destino) ?? null;
}
