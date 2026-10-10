import { useEffect, useRef } from 'react';

export default function PanelDialog({ children, onClose, label, className = 'p-4', layer = 'z-50' }) {
  const root = useRef(null);
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; }, [onClose]);
  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const workspace = document.querySelector('.panel-workspace');
    // The dialog is inside the workspace, so only its siblings are made inert.
    const siblings = [];
    let node = root.current;
    while (node && node !== workspace) {
      for (const sibling of node.parentElement?.children ?? []) {
        if (sibling !== node && !sibling.inert) { sibling.inert = true; siblings.push(sibling); }
      }
      node = node.parentElement;
    }
    root.current?.focus();
    const onKey = event => {
      if (event.key === 'Escape') { event.stopPropagation(); close.current(); }
      if (event.key !== 'Tab') return;
      const elements = [...root.current.querySelectorAll('a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]')].filter(el => el.getClientRects().length);
      const first = elements[0], last = elements.at(-1);
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === root.current)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === root.current)) { event.preventDefault(); first.focus(); }
    };
    root.current.addEventListener('keydown', onKey);
    const element = root.current;
    return () => {
      element.removeEventListener('keydown', onKey);
      siblings.forEach(sibling => { sibling.inert = false; });
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, []);
  return <div ref={root} tabIndex={-1} role="dialog" aria-modal="true" aria-label={label} className={`fixed inset-0 ${layer} flex items-center justify-center ${className}`}>
    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
    {children}
  </div>;
}
