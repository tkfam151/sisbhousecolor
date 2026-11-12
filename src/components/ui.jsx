import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';

export function Alert({ tone = 'info', children, className = '' }) {
  const styles = {
    info: ['bg-blue-50 text-blue-900 ring-blue-200', Info],
    success: ['bg-emerald-50 text-emerald-900 ring-emerald-200', CheckCircle2],
    warning: ['bg-amber-50 text-amber-900 ring-amber-200', AlertTriangle],
    error: ['bg-red-50 text-red-900 ring-red-200', XCircle],
  };
  const [cls, Icon] = styles[tone] || styles.info;
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`flex items-start gap-2 rounded-xl px-3.5 py-2.5 text-sm ring-1 ${cls} ${className}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function Toggle({ checked, onChange, label, description, disabled = false, size = 'md', id }) {
  const big = size === 'lg';
  return (
    <label htmlFor={id} className={`flex cursor-pointer items-center justify-between gap-4 ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}>
      <span className="min-w-0">
        <span className={`block font-semibold text-slate-900 ${big ? 'text-base' : 'text-sm'}`}>{label}</span>
        {description && <span className="mt-0.5 block text-sm text-slate-500">{description}</span>}
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
        } ${checked ? 'bg-violet-600' : 'bg-slate-300'}`}
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

export function SectionCard({ title, icon: Icon, description, children, actions, className = '' }) {
  return (
    <section className={`card p-4 sm:p-6 ${className}`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            {Icon && <Icon className="h-5 w-5 text-slate-500" aria-hidden="true" />}
            {title}
          </h2>
          {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
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
