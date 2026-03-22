import { FORMAT_LABELS } from '../constants';

const FORMAT_GROUPS = {
  'DNA Sequences':           ['fastq','fq','fasta','fa','bam','sam','cram','vcf','bcf'],
  'Genomic Annotation':      ['gff','gff3','gtf','bed','gb','gbk'],
  'Biodiversity/Occurrence': ['csv','zip'],
  'Clinical / Health':       ['json','xml','hl7'],
  'Study Metadata':          ['txt','tab'],
  'Metagenomics':            ['biom','qza','qzv'],
  'Molecular Structure':     ['pdb','sdf','mol','cif'],
  'Spectroscopy':            ['jdx','mzml','mzxml'],
};

/**
 * Given a filename or extension, return format info.
 */
export function detectFormat(filenameOrExt) {
  const ext = filenameOrExt.includes('.')
    ? filenameOrExt.split('.').pop().toLowerCase()
    : filenameOrExt.toLowerCase();

  const label = FORMAT_LABELS[ext] || ext.toUpperCase();
  let group = 'Generic';
  for (const [g, exts] of Object.entries(FORMAT_GROUPS)) {
    if (exts.includes(ext)) { group = g; break; }
  }
  const recognized = !!FORMAT_LABELS[ext];
  return { ext, label, group, recognized };
}

/**
 * Returns scheme suggestions for a given file extension from the scheme bank.
 * Ranks by usage count (history) and returns top matches.
 */
export function getSchemeSuggestionsForFormat(ext, schemeBank, history) {
  // Count how many times each scheme was used with this ext
  const usageCounts = {};
  for (const entry of (history || [])) {
    if (entry.sourceFormat === ext && entry.schemeId) {
      usageCounts[entry.schemeId] = (usageCounts[entry.schemeId] || 0) + 1;
    }
  }

  const suggestions = schemeBank
    .filter(s => usageCounts[s.id])
    .map(s => ({ ...s, usageCount: usageCounts[s.id] || 0 }))
    .sort((a, b) => b.usageCount - a.usageCount);

  return suggestions;
}

/**
 * Suggest an archive name from a source filename.
 * Strips extension, replaces separators with spaces.
 */
export function suggestArchiveName(filename) {
  return filename
    .replace(/\.[^.]+$/, '')        // remove extension
    .replace(/[_\-\.]+/g, ' ')      // replace separators
    .trim();
}

/**
 * Human-readable file size.
 */
export function formatFileSize(bytes) {
  if (!bytes && bytes !== 0) return '—';
  if (bytes < 1024)         return `${bytes} B`;
  if (bytes < 1024 * 1024)  return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3)    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}
