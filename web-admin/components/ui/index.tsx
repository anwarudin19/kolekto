'use client';

import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes } from 'react';
import { Icon, type IconName } from '@/components/icons/Icon';
import { getInitials } from '@/lib/utils';

export * from './FullScreenLoader';

// ─── Button ───────────────────────────────────────────────────────────────────
type BtnVariant = 'default' | 'primary' | 'accent' | 'ghost' | 'danger';
type BtnSize    = 'sm' | 'md' | 'lg';

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: BtnVariant;
  size?: BtnSize;
  icon?: IconName;
  iconRight?: IconName;
  loading?: boolean;
};

export function Btn({
  variant = 'default', size = 'md', icon, iconRight,
  loading, className = '', children, disabled, ...rest
}: BtnProps) {
  const cls = [
    'btn',
    variant === 'primary' ? 'btn-primary' : '',
    variant === 'accent'  ? 'btn-accent'  : '',
    variant === 'ghost'   ? 'btn-ghost'   : '',
    variant === 'danger'  ? 'btn-danger'  : '',
    size === 'sm' ? 'btn-sm' : '',
    size === 'lg' ? 'btn-lg' : '',
    className,
  ].filter(Boolean).join(' ');

  const iconSize = size === 'sm' ? 13 : size === 'lg' ? 17 : 15;

  return (
    <button className={cls} disabled={disabled || loading} {...rest}>
      {icon && <Icon name={icon} size={iconSize} />}
      {children}
      {iconRight && <Icon name={iconRight} size={iconSize} />}
    </button>
  );
}

// ─── IconBtn ──────────────────────────────────────────────────────────────────
type IconBtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: IconName;
  size?: number;
  tip?: string;
};

export function IconBtn({ icon, size = 16, tip, className = '', ...rest }: IconBtnProps) {
  return (
    <button className={`iconbtn ${className}`} title={tip} {...rest}>
      <Icon name={icon} size={size} />
    </button>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

type AvatarProps = {
  name: string;
  size?: AvatarSize;
  color?: string;
  style?: React.CSSProperties;
};

export function Avatar({ name, size = 'md', color, style }: AvatarProps) {
  return (
    <div
      className={`avatar ${size === 'md' ? '' : size}`}
      style={{ background: color, ...style }}
    >
      {getInitials(name)}
    </div>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────
type BadgeVariant = 'ok' | 'warn' | 'danger' | 'info' | 'accent' | 'mute' | 'solid';

type BadgeProps = {
  variant?: BadgeVariant;
  naked?: boolean;
  children: React.ReactNode;
  className?: string;
};

export function Badge({ variant = 'mute', naked, children, className = '' }: BadgeProps) {
  const cls = [
    'badge',
    variant === 'ok'     ? 'badge-ok'     : '',
    variant === 'warn'   ? 'badge-warn'   : '',
    variant === 'danger' ? 'badge-danger' : '',
    variant === 'info'   ? 'badge-info'   : '',
    variant === 'accent' ? 'badge-accent' : '',
    variant === 'solid'  ? 'badge-solid'  : '',
    naked ? 'naked' : '',
    className,
  ].filter(Boolean).join(' ');
  return <span className={cls}>{children}</span>;
}

// ─── Status badge ─────────────────────────────────────────────────────────────
const STATUS_MAP: Record<string, { variant: BadgeVariant; label: string }> = {
  PAID:       { variant: 'ok',     label: 'Lunas' },
  PARTIAL:    { variant: 'warn',   label: 'Sebagian' },
  UNPAID:     { variant: 'mute',   label: 'Belum' },
  OVERDUE:    { variant: 'danger', label: 'Telat' },
  DRAFT:      { variant: 'mute',   label: 'Draft' },
  CANCELLED:  { variant: 'mute',   label: 'Dibatalkan' },
  PENDING:    { variant: 'warn',   label: 'Menunggu' },
  APPROVED:   { variant: 'ok',     label: 'Disetujui' },
  REJECTED:   { variant: 'danger', label: 'Ditolak' },
  ACTIVE:     { variant: 'ok',     label: 'Aktif' },
  INACTIVE:   { variant: 'mute',   label: 'Non-aktif' },
  INVITED:    { variant: 'info',   label: 'Diundang' },
  NONAKTIF:   { variant: 'mute',   label: 'Non-aktif' },
};

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] ?? { variant: 'mute' as BadgeVariant, label: status };
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

// ─── Card ─────────────────────────────────────────────────────────────────────
type CardProps = {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
};

export function Card({ children, style, className = '' }: CardProps) {
  return <div className={`card ${className}`} style={style}>{children}</div>;
}

type CardHeadProps = {
  title: string;
  sub?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
};

export function CardHead({ title, sub, badge, actions }: CardHeadProps) {
  return (
    <div className="card-head">
      <h3>{title}</h3>
      {sub && <span className="h-sub">{sub}</span>}
      {badge}
      {actions && <div className="actions">{actions}</div>}
    </div>
  );
}

// ─── Field + Input wrapper ────────────────────────────────────────────────────
type FieldProps = {
  label: string;
  help?: string;
  error?: string;
  children: React.ReactNode;
};

export function Field({ label, help, error, children }: FieldProps) {
  return (
    <div className="field">
      <div className="field-label">{label}</div>
      {children}
      {help  && <div className="field-help">{help}</div>}
      {error && <div className="field-error">{error}</div>}
    </div>
  );
}

// ─── InputWrap ────────────────────────────────────────────────────────────────
type InputWrapProps = {
  icon?: IconName;
  children: React.ReactNode;
  style?: React.CSSProperties;
};

export function InputWrap({ icon, children, style }: InputWrapProps) {
  return (
    <label className="input" style={style}>
      {icon && <Icon name={icon} size={15} style={{ color: 'var(--ink-muted)', flexShrink: 0 }} />}
      {children}
    </label>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  wide?: boolean;
  footer?: React.ReactNode;
  children: React.ReactNode;
};

export function Modal({ open, onClose, title, wide, footer, children }: ModalProps) {
  if (!open) return null;
  return (
    <div className="scrim" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`modal ${wide ? 'wide' : ''}`}>
        <div className="modal-head">
          <h3>{title}</h3>
          <div className="closer">
            <IconBtn icon="x" onClick={onClose} />
          </div>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

// ─── Drawer ───────────────────────────────────────────────────────────────────
type DrawerProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
};

export function Drawer({ open, onClose, title, footer, children }: DrawerProps) {
  if (!open) return null;
  return (
    <>
      <div className="drawer-scrim" onClick={onClose} />
      <div className="drawer">
        <div className="drawer-head">
          <h3>{title}</h3>
          <span className="spacer" />
          <IconBtn icon="x" onClick={onClose} />
        </div>
        <div className="drawer-body">{children}</div>
        {footer && <div className="drawer-foot">{footer}</div>}
      </div>
    </>
  );
}

// ─── Rp amount ────────────────────────────────────────────────────────────────
export function Rp({ n, size }: { n: number; size?: number }) {
  return (
    <span className="amt" style={size ? { fontSize: size } : undefined}>
      <span style={{ color: 'var(--ink-muted)', fontFamily: 'var(--font-sans)', fontWeight: 500 }}>
        Rp{' '}
      </span>
      {new Intl.NumberFormat('id-ID').format(n)}
    </span>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
export function Empty({ icon, title, sub, action }: {
  icon?: IconName; title: string; sub?: string; action?: React.ReactNode;
}) {
  return (
    <div className="empty" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      {icon && <Icon name={icon} size={36} style={{ color: 'var(--ink-faint)' }} />}
      <div className="empty-title">{title}</div>
      {sub && <div className="empty-sub">{sub}</div>}
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
  );
}

// ─── Segmented meter ──────────────────────────────────────────────────────────
type Segment = { value: number; color: string; label: string };

export function SegmentedMeter({ segments }: { segments: Segment[] }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  return (
    <div className="seg-meter">
      {segments.map((s, i) => (
        <div
          key={i}
          className="seg-meter-fill"
          title={`${s.label}: ${s.value}`}
          style={{ width: `${(s.value / total) * 100}%`, background: s.color }}
        />
      ))}
    </div>
  );
}

// ─── KV list ──────────────────────────────────────────────────────────────────
export function KV({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl className="kv" style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '4px 14px', fontSize: 13.5 }}>
      {rows.map(([k, v]) => (
        <>
          <dt key={k} style={{ color: 'var(--ink-muted)', padding: '6px 0' }}>{k}</dt>
          <dd key={k + '_v'} style={{ margin: 0, padding: '6px 0' }}>{v}</dd>
        </>
      ))}
    </dl>
  );
}
