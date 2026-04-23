export const APP_NAME = "MetaStrata";
export const APP_VERSION = "1.0.0";

export const FIELD_TYPES = [
  { value: "text", label: "Text", description: "Single-line text" },
  {
    value: "textarea",
    label: "Long Text",
    description: "Multi-line text block",
  },
  { value: "number", label: "Number", description: "Numeric value" },
  { value: "date", label: "Date", description: "Calendar date" },
  { value: "gps", label: "GPS Coords", description: "Latitude / Longitude" },
  { value: "url", label: "URL", description: "Web address or link" },
  { value: "select", label: "Select", description: "Single choice from list" },
  { value: "boolean", label: "Yes / No", description: "Boolean toggle" },
  { value: "tags", label: "Tags", description: "Multiple free-form tags" },
];

export const NAV_VIEWS = {
  HOME: "home",
  STRATUM: "stratum",
  SCHEME_BANK: "schemeBank",
  FEATURE_BANK: "featureBank",
  STATS: "stats",
  HISTORY: "history",
  SETTINGS: "settings",
};

export const FORMAT_LABELS = {
  fastq: "FASTQ",
  fq: "FASTQ",
  fasta: "FASTA",
  fa: "FASTA",
  bam: "BAM",
  sam: "SAM",
  cram: "CRAM",
  vcf: "VCF",
  bcf: "BCF",
  gff: "GFF",
  gff3: "GFF3",
  gtf: "GTF",
  bed: "BED",
  gb: "GenBank",
  gbk: "GenBank",
  biom: "BIOM",
  qza: "QIIME2",
  qzv: "QIIME2",
  pdb: "PDB",
  sdf: "SDF/MOL",
  mol: "MOL",
  cif: "CIF",
  jdx: "JCAMP-DX",
  mzml: "mzML",
  mzxml: "mzXML",
  csv: "CSV",
  json: "JSON",
  xml: "XML",
  txt: "Text",
};

export const PROVENANCE_FIELDS = [
  { key: "collection_date", label: "Collection Date", type: "date" },
  { key: "collection_location", label: "Location / Site Name", type: "text" },
  { key: "gps_lat", label: "GPS Latitude", type: "number" },
  { key: "gps_lon", label: "GPS Longitude", type: "number" },
  { key: "collection_method", label: "Collection Method", type: "text" },
  { key: "equipment", label: "Equipment / Instrument", type: "text" },
  { key: "collector", label: "Collector Name", type: "text" },
  { key: "notes", label: "Field Notes", type: "textarea" },
];

export const NAGOYA_NOTICE = `MetaStrata is a general-purpose, local-first data organization tool. It does not collect, transmit, analyze, or process the contents of your data. All files remain exclusively on your own device.

Users who use MetaStrata to organize data related to genetic resources or biological observations are solely responsible for ensuring their data collection activities comply with:

• The Nagoya Protocol on Access to Genetic Resources and the Fair and Equitable Sharing of Benefits Arising from their Utilization
• National Access and Benefit-Sharing (ABS) legislation in all applicable jurisdictions
• Any other applicable laws and regulations in the jurisdictions where data was collected

The developer of this tool — derives no financial or data benefit from what users store in it, has no visibility into user data, and is not subject to Nagoya Protocol obligations by virtue of developing a general-purpose data organization utility.

This is consistent with the legal standing of all general-purpose software tools (spreadsheets, databases, note-taking applications, etc.).

For more information on the Nagoya Protocol: https://www.cbd.int/abs/`;
