import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';

export function Alert({ tone = 'info', children, className = '' }) {
  const styles = {
    info: ['bg-[#0071E3]/[0.08] text-[#0058b0]', Info],
    success: ['bg-[#34C759]/[0.12] text-[#1d7a35]', CheckCircle2],
    warning: ['bg-[#FF9500]/[0.12] text-[#9a5700]', AlertTriangle],
    error: ['bg-[#FF3B30]/[0.1] text-[#c4271d]', XCircle],
  };
  const [cls, Icon] = styles[tone] || styles.info;
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`flex items-start gap-2 rounded-xl px-3.5 py-2.5 text-sm ${cls} ${className}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function Toggle({ checked, onChange, label, description, disabled = false, size = 'md', id, onClass = 'bg-[#34C759]' }) {
  const big = size === 'lg';
  return (
    <label htmlFor={id} className={`flex cursor-pointer items-center justify-between gap-4 ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}>
      <span className="min-w-0">
        <span className={`block font-medium text-ink ${big ? 'text-[17px]' : 'text-[15px]'}`}>{label}</span>
        {description && <span className="mt-0.5 block text-[13px] text-mute">{description}</span>}
      </span>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex shrink-0 items-center rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${
          big ? 'h-[31px] w-[51px]' : 'h-[31px] w-[51px]'
        } ${checked ? onClass : 'bg-neutral-300'}`}
      >
        <span
          className={`inline-block h-[27px] w-[27px] transform rounded-full bg-white shadow-[0_3px_8px_rgba(0,0,0,0.15),0_1px_1px_rgba(0,0,0,0.16)] transition ${
            checked ? 'translate-x-[22px]' : 'translate-x-[2px]'
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
          {description && <p className="mt-1 text-sm text-neutral-500">{description}</p>}
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
