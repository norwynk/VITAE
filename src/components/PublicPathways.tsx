'use client';
import { useEffect, useState } from 'react';
import type { Treatment } from '@/domain/model';
import { repository } from '@/services/repository';
import { Badge, Card, Empty, Notice } from './ui';

export function PublicPathways() {
  const [treatments, setTreatments] = useState<Treatment[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    repository()
      .publicCatalogue()
      .then(setTreatments)
      .catch((e: Error) => setError(e.message));
  }, []);

  return (
    <Card title="Pathways">
      {error && <Notice tone="error">Pathways could not be loaded: {error}</Notice>}
      {!treatments && !error && <Empty>Loading pathways…</Empty>}
      {treatments?.length === 0 && <Empty>No pathways are available yet.</Empty>}
      <div className="grid">
        {treatments?.map((t) => (
          <article key={t.id} className="card">
            <h3>{t.name}</h3>
            <div className="row">
              <Badge>{t.category}</Badge>
              {t.requiresClinicianApproval && <Badge>Clinician review required</Badge>}
              {t.demoFictional && <Badge tone="alert">Fictional demo</Badge>}
            </div>
            <p>{t.summary}</p>
            {t.outcomes.length > 0 && (
              <ul className="small">
                {t.outcomes.map((o) => (
                  <li key={o}>{o}</li>
                ))}
              </ul>
            )}
            <p className="muted small">{t.purchasable ? 'Available after clinician approval.' : 'Not available to order.'}</p>
          </article>
        ))}
      </div>
    </Card>
  );
}
