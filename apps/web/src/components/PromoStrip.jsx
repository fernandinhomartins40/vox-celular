export default function PromoStrip() {
  const items = [
    'Entrega local em Palmital acima de R$ 200',
    'Até 12x sem juros no cartão',
    'Assistência técnica com 90 dias de garantia',
    'Representante TIM autorizado',
    'Aceitamos seu seminovo na troca',
    'Recarga liberada na hora',
  ];
  const loop = [...items, ...items];
  return (
    <div className="bg-[var(--royal-900)] text-white/85 text-[12px] overflow-hidden">
      <div className="flex marquee-track whitespace-nowrap py-2">
        {loop.map((t, i) => (
          <span key={i} className="px-7 flex items-center gap-3 tracking-wide">
            <span className="w-1 h-1 rounded-full bg-[var(--red-500)]"></span>
            <span>{t}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
