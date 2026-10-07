/**
 * Founder story for the "Made by women" section. Fill these in only with the
 * founder's real details and her own words, with her approval. While any
 * required field is empty the site shows a marked placeholder instead.
 */
export interface Founder {
  name: string;
  role: string;
  /** In her own words. Never written for her. */
  quote: string;
  /** Optional portrait, as a path under /public. */
  photo?: string;
}

export const FOUNDER: Partial<Founder> = {};

export function founderReady(f: Partial<Founder> = FOUNDER): f is Founder {
  return Boolean(f.name?.trim() && f.role?.trim() && f.quote?.trim());
}
