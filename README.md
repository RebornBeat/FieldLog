# Metatrata

**A local-first metadata normalizer and personal collection manager for biological and scientific files.**

MetaStrata wraps any scientific file — FASTQ, FASTA, Darwin Core, FHIR, ISA-Tab, BAM, VCF, and more — in a standardized envelope that adds, normalizes, and preserves metadata. The enriched file is your personal record. Nothing ever leaves your machine.

---

## What MetaStrata Does

Most biological file formats were designed for *exchange* — not for *personal collection management*. They carry minimal metadata, don't link context to the file itself, and were never built for a citizen scientist organizing 200 samples across 3 fieldwork trips.

MetaStrata solves this with a simple model:

```
original file  +  your metadata  =  .stratum file  (1:1)

many .stratum files  =  .strata collection archive
```

**One `.stratum` file = one original file + all the metadata you add to it.** It's not a database dump. It's your original file, enriched and self-contained.

---

## Who It's For

- 🧫 **Biohackers** who want to organize self-collected samples, sequences, and observations with proper provenance before deciding what (if anything) to share publicly
- 🔬 **Independent researchers** maintaining a personal fieldwork record alongside their sequencing output
- 🌱 **Citizen scientists** building structured local records from iNaturalist exports, GBIF downloads, eDNA fieldwork
- 🌾 **Agronomists** correlating crop observation data with environmental conditions
- 🧬 **Anyone** who generates biological data files and wants them properly tagged, filterable, and portable

---

## Core Concepts

### The `.stratum` File (1:1 conversion)

A `.stratum` file is a ZIP archive that wraps **a single source file** with a metadata sidecar:

```
sample_001.stratum (ZIP)
├── source/
│   └── SRR12345.fastq          # Your original file — untouched
├── metadata.json               # All metadata you added/normalized
├── provenance.json             # Collection context: GPS, date, method, equipment
├── tags.json                   # Your personal tag set
└── manifest.json               # Schema version, Metastrata version, file hashes
```

**The original file is always preserved inside the `.stratum` archive.** MetaStrata never modifies, re-encodes, or transforms your source data. It adds a layer; it doesn't touch the content.

### The `.strata` Collection Archive

A `.strata` file is an aggregated archive of multiple `.stratum` files:

```
my_fieldwork_2025.strata (ZIP)
├── sample_001.stratum
├── sample_002.stratum
├── sample_003.stratum
└── collection_index.json       # Searchable index of all entries, tags, provenance
```

You build a collection by adding `.stratum` files to it from within the app. The collection index enables filtering, search, and aggregate stats across all your entries.

---

## Supported Source Formats

MetaStrata accepts any file as a source. The following formats receive format-aware metadata validation and template suggestions:

| Category | Formats |
|----------|---------|
| DNA Sequences | FASTQ, FASTA, BAM, SAM, CRAM, VCF, BCF |
| Genomic Annotation | GFF, GTF, BED, GenBank flat file (.gb/.gbk) |
| Biodiversity / Occurrence | Darwin Core CSV, Darwin Core Archive (.zip), GBIF download, iNaturalist export CSV |
| Clinical / Health | FHIR JSON/XML, HL7 |
| Study Metadata | ISA-Tab (.txt investigation/study/assay), MAGE-TAB |
| Metagenomics | BIOM format (.biom), QIIME2 artifact (.qza) |
| Molecular Structure | PDB, SDF/MOL, SMILES CSV, CIF |
| Spectroscopy | JCAMP-DX, mzML, mzXML |
| Generic | Any file — metadata schema is user-defined |

---

## Metadata Schema

When you open a source file in MetaStrata, the app detects the format and pre-populates a metadata template appropriate for that type. You fill in what you know and leave the rest blank.

### Universal Provenance Fields (all formats)

```json
{
  "collection_date": "2025-03-15",
  "collector_id": "your-name-or-identifier",
  "location": {
    "region": "Cordillera Central, Dominican Republic",
    "gps_lat": 19.1234,
    "gps_lon": -70.5678,
    "altitude_m": 1200,
    "location_notes": "Volcanic soil, cloud forest edge"
  },
  "collection_method": "Soil core extraction, 10cm depth",
  "equipment": "Qiagen PowerSoil Pro kit",
  "storage_conditions": "Frozen at -20C",
  "legal_notes": "Collected from own land",
  "compliance_self_attestation": "user_confirms_applicable_law_compliance"
}
```

### Format-Specific Fields (example: FASTQ)

```json
{
  "sequencer_model": "Oxford Nanopore MinION Mk1C",
  "flowcell_id": "FAO12345",
  "run_id": "run_20250315_001",
  "basecalling_software": "Guppy 6.5.7",
  "basecalling_model": "dna_r9.4.1_450bps_sup",
  "phred_q30_percent": 78.4,
  "total_reads": 45230,
  "mean_read_length_bp": 1240,
  "target_organism_hypothesis": "soil microbiome — bacterial 16S",
  "organism_taxonomy_hypothesis": "Unknown — to be identified"
}
```

### Darwin Core Fields (example: occurrence record)

```json
{
  "basisOfRecord": "HumanObservation",
  "scientificName": "Ganoderma sp.",
  "kingdom": "Fungi",
  "taxonRank": "genus",
  "identificationConfidence": "tentative",
  "identificationMethod": "morphology",
  "habitat": "Decaying hardwood, subtropical moist forest",
  "occurrenceRemarks": "Large fruiting body, approx 25cm diameter"
}
```

---

## Feature Tagging

Feature tags are your personal annotations about what a record *means* biologically or functionally. They are separate from provenance and separate from the source file's format-specific metadata.

```json
{
  "feature_tags": [
    {"category": "morphological",    "value": "large fruiting body"},
    {"category": "habitat",          "value": "decaying wood"},
    {"category": "ecological_role",  "value": "wood decomposer"},
    {"category": "personal_interest","value": "pharmaceutical candidate"},
    {"category": "custom",           "value": "site: DR-forest-2025-A"}
  ]
}
```

Feature tags are fully user-defined. Build your own taxonomy. Tag anything you observe or hypothesize. This is your personal annotation layer — it stays local.

---

## Export Options

From any `.stratum` file or `.strata` collection, you can export:

| Export Type | What You Get |
|-------------|-------------|
| **Original file extraction** | Your untouched source file, separated from the MetaStrata envelope |
| **Metadata sidecar only** | The `metadata.json` + `provenance.json` as standalone files |
| **Darwin Core CSV** | Occurrence/collection records exported in standard Darwin Core format for submission to iNaturalist, GBIF, or BOLD |
| **Collection CSV** | All entries in your collection as a flat CSV with all metadata fields |
| **Collection JSON** | Full JSON export of all entries with complete metadata |
| **Filtered subset** | Any of the above, filtered by tag, date range, format type, or collection status |

---

## Import Options

| Import Source | Notes |
|--------------|-------|
| Any supported file format | Drop a file; MetaStrata detects format and pre-fills metadata template |
| iNaturalist CSV export | Imports observation records with automatic Darwin Core field mapping |
| GBIF download | Imports occurrence data |
| Existing `.stratum` file | Open and edit a previously created stratum |
| Existing `.strata` archive | Open and add to an existing collection |

---

## Statistics Dashboard

The Stats tab shows aggregate information about your collection:

- Total entries by format type and category
- Tag frequency distribution (what you tag most, not what the tags say)
- Entries added over time (activity chart)
- Collection streaks
- Coverage by custom domain (your own organization system)

### Shareable Stats Cards

Generate a PNG stats card showing your aggregate collection stats — **no entry content, no file data, no GPS coordinates, no identifiers.** Just counts and charts. Share it on UngatedMinds discussions, GitHub, or anywhere else to show your collection progress without exposing any actual data.

---

## Installation

```bash
# Electron desktop app — Windows, macOS, Linux
# Download from Releases: .exe / .dmg / .AppImage

# Build from source
git clone https://github.com/RebornBeat/Metastrata
cd metastrata
npm install
npm run build
```

**Mobile (planned):** iOS and Android versions planned. Will read/write `.stratum` files and sync locally via USB/local network to desktop collection.

---

## Usage Quick Reference

```
File > New Stratum      — wrap a single file with metadata
File > Open Stratum     — edit an existing .stratum file
File > New Collection   — create a .strata collection archive
Collection > Add        — add a .stratum file to open collection
Collection > Filter     — filter entries by tag/date/format/status
Stats > View            — collection overview and charts
Stats > Export Card     — generate shareable stats PNG
File > Export           — export to CSV/JSON/Darwin Core/original file
```

---

## The `.stratum` and `.strata` Format Specification

Both formats are ZIP archives. The internal structure is documented at [spec/FORMAT.md] in the repository.

- `manifest.json` contains: `metastrata_version`, `schema_version`, `source_filename`, `source_format`, `source_sha256`, `source_size_bytes`, `created_at`, `updated_at`
- All JSON files use UTF-8 encoding
- All files within the archive are referenced by relative path
- Source files are stored in `source/` without modification
- SHA-256 checksums in `manifest.json` verify source file integrity

---

## Legal Notice

MetaStrata is general-purpose data organization software. **The developer of MetaStrata has no knowledge of, access to, or responsibility for data that users store in their local `.stratum` and `.strata` files.**

Users who collect biological samples, genetic sequences, eDNA, or other materials potentially regulated under the Nagoya Protocol on Access and Benefit Sharing, the Convention on Biological Diversity, or applicable national ABS legislation are **solely responsible** for ensuring their collection activities comply with applicable law. MetaStrata does not facilitate, enable, or participate in the commercialization, transfer, or licensing of genetic resources. It is a local metadata organization application.

MetaStrata is not part of, affiliated with, or integrated into the UngatedMinds platform. It is an independent open-source project.

---

## Contributing

Pull requests welcome. See [CONTRIBUTING.md].

Issues: [GitHub Issues](https://github.com/RebornBeat/metastrata/issues)

---

## License

MIT License — free for personal and commercial use.

---

*Strata is built for the person who collects carefully — and wants their collection to reflect that.*
