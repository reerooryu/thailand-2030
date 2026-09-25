/**
 * OECD accession chapters.
 *
 * Accelerating accession is a commitment to an outside standard. Each domestic
 * law that meets one of the standards closes a chapter, and every closed
 * chapter makes the rest of the reform programme stick: the review
 * process locks it in, and investors price it. Modelled as a rise in reform
 * capacity (how much effort becomes reform stock) plus an FDI signal, so it
 * is not flattened by the cap on raw reform effort.
 *
 * Only counts while accession is accelerating.
 */
export const OECD_CHAPTERS: { flag: string; name: string }[] = [
  { flag: 'super_licence_done', name: 'investment openness' },
  { flag: 'digital_government_mandated', name: 'digital government' },
  { flag: 'civil_service_shrinking', name: 'public governance' },
  { flag: 'anticorruption_enforcement', name: 'anti-corruption' },
  { flag: 'justice_reform_done', name: 'rule of law' },
  { flag: 'revenue_package_done', name: 'tax transparency' },
];
export const CAPACITY_PER_CHAPTER = 0.02;
export const FDI_PER_CHAPTER = 0.05;

export function closedChapters(flags: Set<string>): string[] {
  if (!flags.has('oecd_accelerating')) return [];
  return OECD_CHAPTERS.filter(c => flags.has(c.flag)).map(c => c.name);
}
