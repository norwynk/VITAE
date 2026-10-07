/**
 * Shown wherever product or clinical information is missing. It replaces
 * the field; it never sits next to generated text standing in for it.
 */
export function NeedsVerification({ what, note }: { what?: string; note?: string }) {
  return (
    <span className="needs-verification" data-needs-verification={what ?? true}>
      <strong>NEEDS VERIFICATION</strong>
      {note && <span> {note}</span>}
    </span>
  );
}
