// Identical field definitions to the fixed desktop starterSchemes.js
// Every field has: id (unique), key (snake_case for metadata access), label, type, required, placeholder, options, order

export const STARTER_SCHEMES = [
  {
    id:'builtin-dna-seq-run', name:'DNA Sequencing Run', description:'FASTQ/BAM sequencing metadata', isBuiltIn:true, forFormats:['fastq','fq','fasta','fa','bam','sam'],
    fields:[
      {id:'f-dsq-01',key:'sequencer_model',     label:'Sequencer Model',        type:'text',  required:false,placeholder:'e.g. MinION Mk1C',options:[],order:0},
      {id:'f-dsq-02',key:'flowcell_id',         label:'Flow Cell ID',           type:'text',  required:false,placeholder:'',options:[],order:1},
      {id:'f-dsq-03',key:'library_prep_kit',    label:'Library Prep Kit',       type:'text',  required:false,placeholder:'',options:[],order:2},
      {id:'f-dsq-04',key:'basecalling_software',label:'Basecalling Software',   type:'text',  required:false,placeholder:'e.g. Guppy 6.5.7',options:[],order:3},
      {id:'f-dsq-05',key:'phred_q30_percent',   label:'Phred Q30 %',            type:'number',required:false,placeholder:'',options:[],order:4},
      {id:'f-dsq-06',key:'total_reads',         label:'Total Reads',            type:'number',required:false,placeholder:'',options:[],order:5},
      {id:'f-dsq-07',key:'mean_read_length_bp', label:'Mean Read Length (bp)',  type:'number',required:false,placeholder:'',options:[],order:6},
      {id:'f-dsq-08',key:'target_organism',     label:'Target Organism',        type:'text',  required:false,placeholder:'',options:[],order:7},
      {id:'f-dsq-09',key:'run_date',            label:'Run Date',               type:'date',  required:false,placeholder:'',options:[],order:8},
    ],
  },
  {
    id:'builtin-env-sample', name:'Environmental Sample', description:'eDNA, soil, water, air records', isBuiltIn:true, forFormats:['fastq','fq','csv'],
    fields:[
      {id:'f-env-01',key:'sample_type',         label:'Sample Type',            type:'select',required:true, placeholder:'',options:['Soil','Water','Air','Sediment','Plant tissue','Animal tissue','Other'],order:0},
      {id:'f-env-02',key:'habitat',             label:'Habitat Description',    type:'text',  required:false,placeholder:'e.g. cloud forest edge',options:[],order:1},
      {id:'f-env-03',key:'substrate',           label:'Substrate',              type:'text',  required:false,placeholder:'',options:[],order:2},
      {id:'f-env-04',key:'depth_cm',            label:'Depth (cm)',             type:'number',required:false,placeholder:'',options:[],order:3},
      {id:'f-env-05',key:'ph',                  label:'pH',                     type:'number',required:false,placeholder:'',options:[],order:4},
      {id:'f-env-06',key:'temperature_c',       label:'Temperature (°C)',       type:'number',required:false,placeholder:'',options:[],order:5},
      {id:'f-env-07',key:'preservation_method', label:'Preservation Method',    type:'text',  required:false,placeholder:'e.g. Flash frozen',options:[],order:6},
      {id:'f-env-08',key:'dna_extraction_kit',  label:'DNA Extraction Kit',     type:'text',  required:false,placeholder:'',options:[],order:7},
    ],
  },
  {
    id:'builtin-species-occurrence', name:'Species Occurrence', description:'iNaturalist-style field observation records', isBuiltIn:true, forFormats:['csv','json'],
    fields:[
      {id:'f-spo-01',key:'scientific_name',       label:'Scientific Name',       type:'text',    required:true, placeholder:'',options:[],order:0},
      {id:'f-spo-02',key:'common_name',           label:'Common Name',           type:'text',    required:false,placeholder:'',options:[],order:1},
      {id:'f-spo-03',key:'taxon_rank',            label:'Taxon Rank',            type:'select',  required:false,placeholder:'',options:['Species','Genus','Family','Order','Class','Phylum','Kingdom'],order:2},
      {id:'f-spo-04',key:'kingdom',               label:'Kingdom',               type:'select',  required:false,placeholder:'',options:['Animalia','Plantae','Fungi','Bacteria','Archaea','Other'],order:3},
      {id:'f-spo-05',key:'observation_type',      label:'Observation Type',      type:'select',  required:false,placeholder:'',options:['Visual','Acoustic','Physical specimen','Photo','Track/Sign','Genetic'],order:4},
      {id:'f-spo-06',key:'count',                 label:'Individual Count',      type:'number',  required:false,placeholder:'',options:[],order:5},
      {id:'f-spo-07',key:'life_stage',            label:'Life Stage',            type:'text',    required:false,placeholder:'',options:[],order:6},
      {id:'f-spo-08',key:'identification_remarks',label:'ID Remarks',            type:'textarea',required:false,placeholder:'',options:[],order:7},
    ],
  },
  {
    id:'builtin-darwin-core', name:'Darwin Core Occurrence', description:'Formal Darwin Core standard', isBuiltIn:true, forFormats:['csv','json'],
    fields:[
      {id:'f-dwc-01',key:'occurrenceid',    label:'Occurrence ID',       type:'text',  required:false,placeholder:'',options:[],order:0},
      {id:'f-dwc-02',key:'basisofrecord',   label:'Basis of Record',     type:'select',required:false,placeholder:'',options:['HumanObservation','MachineObservation','PreservedSpecimen','LivingSpecimen','MaterialSample'],order:1},
      {id:'f-dwc-03',key:'scientificname',  label:'Scientific Name',     type:'text',  required:true, placeholder:'',options:[],order:2},
      {id:'f-dwc-04',key:'kingdom',         label:'Kingdom',             type:'text',  required:false,placeholder:'',options:[],order:3},
      {id:'f-dwc-05',key:'family',          label:'Family',              type:'text',  required:false,placeholder:'',options:[],order:4},
      {id:'f-dwc-06',key:'genus',           label:'Genus',               type:'text',  required:false,placeholder:'',options:[],order:5},
      {id:'f-dwc-07',key:'eventdate',       label:'Event Date',          type:'date',  required:false,placeholder:'',options:[],order:6},
      {id:'f-dwc-08',key:'country',         label:'Country',             type:'text',  required:false,placeholder:'',options:[],order:7},
      {id:'f-dwc-09',key:'locality',        label:'Locality',            type:'text',  required:false,placeholder:'',options:[],order:8},
      {id:'f-dwc-10',key:'decimallatitude', label:'Decimal Latitude',    type:'number',required:false,placeholder:'',options:[],order:9},
      {id:'f-dwc-11',key:'decimallongitude',label:'Decimal Longitude',   type:'number',required:false,placeholder:'',options:[],order:10},
    ],
  },
  {
    id:'builtin-pcr', name:'PCR / Amplification', description:'PCR setup and results tracking', isBuiltIn:true, forFormats:['csv','txt'],
    fields:[
      {id:'f-pcr-01',key:'target_gene',      label:'Target Gene / Region',  type:'text',  required:true, placeholder:'e.g. 16S rRNA, ITS2',options:[],order:0},
      {id:'f-pcr-02',key:'primer_forward',   label:'Forward Primer',         type:'text',  required:false,placeholder:'',options:[],order:1},
      {id:'f-pcr-03',key:'primer_reverse',   label:'Reverse Primer',         type:'text',  required:false,placeholder:'',options:[],order:2},
      {id:'f-pcr-04',key:'annealing_temp_c', label:'Annealing Temp (°C)',    type:'number',required:false,placeholder:'',options:[],order:3},
      {id:'f-pcr-05',key:'cycle_count',      label:'Cycle Count',            type:'number',required:false,placeholder:'',options:[],order:4},
      {id:'f-pcr-06',key:'gel_result',       label:'Gel Result',             type:'select',required:false,placeholder:'',options:['Positive','Negative','Faint band','Contamination','Not run'],order:5},
      {id:'f-pcr-07',key:'remarks',          label:'Remarks',                type:'textarea',required:false,placeholder:'',options:[],order:6},
    ],
  },
  {
    id:'builtin-custom-blank', name:'Custom (Blank)', description:'Start entirely from scratch', isBuiltIn:true, forFormats:['*'],
    fields:[],
  },
];
