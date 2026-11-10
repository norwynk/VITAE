'use client';
import { CUSTOMER_STAGES, type CustomerStage } from '@/domain/journey';
import type { MorningBrief } from '@/domain/morning';
import { Badge, Card, Empty } from '../ui';
import { TeamActivity } from './PenReleases';

export type AdminTab = 'Today' | 'Customers' | 'Pens' | 'Royal Summons' | 'The Prick List' | 'Messages' | 'Stock and catalogue' | 'Behind the scenes';

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** The first thing the admin sees: what needs doing, then how everything stands. */
export function AdminToday({ brief, onGo }: { brief: MorningBrief; onGo: (tab: AdminTab, stage?: CustomerStage) => void }) {
  const late = brief.actions.filter((a) => a.late).length;
  const tiles: { label: string; value: number; tab: AdminTab; hot?: boolean }[] = [
    { label: 'Pens to send', value: brief.toSend, tab: 'Pens', hot: brief.toSend > 0 },
    { label: 'Royal summons to phone', value: brief.summons, tab: 'Royal Summons', hot: brief.summons > 0 },
    { label: `On The Prick List (${brief.prickList.thisWeek} this week)`, value: brief.prickList.total, tab: 'The Prick List' },
    { label: 'Out for delivery', value: brief.outForDelivery, tab: 'Pens' },
    { label: 'Delivered, last 7 days', value: brief.deliveredThisWeek, tab: 'Pens' },
    { label: 'With the doctor', value: brief.withDoctor, tab: 'Pens' },
    { label: 'New customers, last 7 days', value: brief.newThisWeek, tab: 'Customers' },
  ];
  return (
    <div className="stack">
      <p className="pulse__summary">
        {brief.actions.length ? `${plural(brief.actions.length, 'thing')} to do today${late ? `, ${late} late` : ''}.` : 'Nothing needs you today.'}
      </p>
      <div className="pulse">
        {tiles.map((t) => (
          <button key={t.label} type="button" className={`pulse__tile${t.hot ? ' is-hot' : ''}`} onClick={() => onGo(t.tab)}>
            <strong>{t.value}</strong>
            <span>{t.label}</span>
          </button>
        ))}
      </div>
      <Card title="Do these first">
        {!brief.actions.length && <Empty>All clear.</Empty>}
        <ul className="plain small">
          {brief.actions.map((a) => (
            <li key={a.key} className="row" style={{ justifyContent: 'space-between' }}>
              <span style={{ flex: 1, minWidth: '12rem' }}>
                {a.late && <Badge tone="alert">Late</Badge>} {a.text}
              </span>
              <span className="row">
                <Badge>{a.who}</Badge>
                <button type="button" className="secondary" onClick={() => onGo(a.tab)}>
                  Open
                </button>
              </span>
            </li>
          ))}
        </ul>
      </Card>
      <Card title="Where everyone is">
        <div className="pulse">
          {CUSTOMER_STAGES.map((s) => (
            <button key={s} type="button" className="pulse__tile" onClick={() => onGo('Customers', s)}>
              <strong>{brief.stages[s]}</strong>
              <span>{s}</span>
            </button>
          ))}
        </div>
      </Card>
      <TeamActivity />
    </div>
  );
}
