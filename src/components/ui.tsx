'use client';
import type { ReactNode } from 'react';

export function Card({ title, children, actions }: { title?: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="card">
      {(title || actions) && (
        <div className="row" style={{ justifyContent: 'space-between' }}>
          {title && <h2>{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'warn' | 'error' | 'ok'; children: ReactNode }) {
  return (
    <div className={`notice ${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      {children}
    </div>
  );
}

export function Badge({ tone, children }: { tone?: 'alert' | 'good'; children: ReactNode }) {
  return <span className={`badge ${tone ?? ''}`}>{children}</span>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="muted">{children}</p>;
}

/** Reads a form into a plain object of trimmed strings and checkbox booleans. */
export function formValues(form: HTMLFormElement): Record<string, string> & { checked: (name: string) => boolean } {
  const data = new FormData(form);
  const out: Record<string, string> = {};
  for (const [k, v] of data.entries()) if (typeof v === 'string') out[k] = v.trim();
  return Object.assign(out, { checked: (name: string) => data.get(name) === 'on' });
}

export function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg', dateStyle: 'medium', timeStyle: 'short' });
}

export function humanise(value: string): string {
  return value.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}
