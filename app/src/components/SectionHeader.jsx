import { Icon } from '../icons';

export default function SectionHeader({ eyebrow, title, sub, actionLabel, onAction }) {
  return (
    <div className="flex items-end justify-between gap-4 mb-7">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="w-6 h-[2px] bg-[var(--red-500)]"></span>
          <span className="font-display text-[var(--red-500)] font-semibold text-[11px] tracking-[0.28em] uppercase">{eyebrow}</span>
        </div>
        <h2 className="font-display font-bold text-[34px] sm:text-[44px] lg:text-[52px] leading-[1.0] tracking-tight">{title}</h2>
        {sub && <p className="text-zinc-600 mt-3 max-w-xl text-[15px] leading-relaxed">{sub}</p>}
      </div>
      {actionLabel && (
        <button onClick={onAction}
          className="hidden sm:inline-flex items-center gap-1.5 text-[14px] font-medium text-[var(--royal-700)] hover:text-[var(--royal-800)]">
          {actionLabel} <Icon.arrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
