import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';

export function Alert({ tone = 'info', children, className = '' }) {
  const styles = {
    info: ['border-blue-600 bg-blue-50 text-blue-900', Info],
    success: ['border-emerald-600 bg-emerald-50 text-emerald-900', CheckCircle2],
    warning: ['border-amber-500 bg-amber-50 text-amber-900', AlertTriangle],
    error: ['border-red-600 bg-red-50 text-red-900', XCircle],
  };
  const [cls, Icon] = styles[tone] || styles.info;
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`flex items-start gap-2 rounded-md border-l-4 px-3.5 py-2.5 text-sm ${cls} ${className}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function Toggle({ checked, onChange, label, description, disabled = false, size = 'md', id, onClass = 'bg-navy' }) {
  const big = size === 'lg';
  return (
    <label htmlFor={id} className={`flex cursor-pointer items-center justify-between gap-4 ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}>
      <span className="min-w-0">
        <span className={`block font-semibold text-stone-900 ${big ? 'text-base' : 'text-sm'}`}>{label}</span>
        {description && <span className="mt-0.5 block text-sm text-stone-500">{description}</span>}
      </span>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex shrink-0 items-center rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${
          big ? 'h-9 w-16' : 'h-7 w-12'
        } ${checked ? onClass : 'bg-stone-300'}`}
      >
        <span
          className={`inline-block transform rounded-full bg-white shadow transition ${big ? 'h-7 w-7' : 'h-5 w-5'} ${
            checked ? (big ? 'translate-x-8' : 'translate-x-6') : 'translate-x-1'
          }`}
        />
      </button>
    </label>
  );
}

// `icon` is accepted for compatibility but intentionally not rendered.
// eslint-disable-next-line no-unused-vars
export function SectionCard({ title, icon, description, children, actions, className = '' }) {
  return (
    <section className={`card p-4 sm:p-6 ${className}`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="section-title">{title}</h2>
          {description && <p className="mt-1 text-sm text-stone-500">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

export function PasswordInput(props) {
  return <input type="password" autoComplete="new-password" className="input" {...props} />;
}
