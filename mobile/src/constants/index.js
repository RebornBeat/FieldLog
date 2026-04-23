export const APP_VERSION = '1.0.0';
export const APP_NAME    = 'MetaStrata';

export const FIELD_TYPES = [
  { value:'text',     label:'Text'      },
  { value:'textarea', label:'Long Text' },
  { value:'number',   label:'Number'    },
  { value:'date',     label:'Date'      },
  { value:'gps',      label:'GPS'       },
  { value:'url',      label:'URL'       },
  { value:'select',   label:'Select'    },
  { value:'boolean',  label:'Yes / No'  },
  { value:'tags',     label:'Tags'      },
];

export const PROVENANCE_FIELDS = [
  { key:'collection_date',     label:'Collection Date',          type:'date'     },
  { key:'collection_location', label:'Location / Site Name',     type:'text'     },
  { key:'gps_lat',             label:'GPS Latitude',             type:'number'   },
  { key:'gps_lon',             label:'GPS Longitude',            type:'number'   },
  { key:'collection_method',   label:'Collection Method',        type:'text'     },
  { key:'equipment',           label:'Equipment / Instrument',   type:'text'     },
  { key:'collector',           label:'Collector Name',           type:'text'     },
  { key:'notes',               label:'Field Notes',              type:'textarea' },
];

export const FORMAT_LABELS = {
  fastq:'FASTQ',fq:'FASTQ',fasta:'FASTA',fa:'FASTA',bam:'BAM',sam:'SAM',
  cram:'CRAM',vcf:'VCF',bcf:'BCF',gff:'GFF',gff3:'GFF3',gtf:'GTF',bed:'BED',
  gb:'GenBank',gbk:'GenBank',biom:'BIOM',qza:'QIIME2',qzv:'QIIME2',pdb:'PDB',
  sdf:'SDF',mol:'MOL',cif:'CIF',jdx:'JCAMP',mzml:'mzML',mzxml:'mzXML',
  csv:'CSV',json:'JSON',xml:'XML',txt:'Text',
};

export const STORAGE_KEYS = {
  SCHEME_BANK:   'metastrata_scheme_bank',
  FEATURE_BANK:  'metastrata_feature_bank',
  HISTORY:       'metastrata_history',
  SETTINGS:      'metastrata_settings',
  COLLECTION_DIR:'metastrata_collection_dir',
};
