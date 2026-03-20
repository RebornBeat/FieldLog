# MetaStrata

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

MetaStrata is built on a core principle: **you are always in control.** The app never automatically fills in anything on your behalf. It presents your tools — your schemes, your categories, your values — and lets you work. The most it ever does is offer a suggestion; every character of metadata you see was put there by you.

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
└── manifest.json               # Schema version, MetaStrata version, file hashes
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

## The Scheme System

The scheme system is the heart of MetaStrata. A **scheme** is a set of metadata fields you define — the categories, field names, and structure you want to apply to a file or group of files. You are not locked into any format or standard. You build exactly what you need.

### Everything Is Manual — By Design

MetaStrata **never automatically populates metadata.** Nothing is pre-filled. Nothing is assumed. Every value you see in a scheme was entered by you.

When you drop a file into MetaStrata, the app:

1. Detects the file's format and extension
2. Looks at your Scheme Bank to see if you have schemes you've used previously with files of that type
3. Presents a suggestion list of relevant schemes if any match your history
4. Waits for you to select one, start a new scheme, or proceed without a scheme

That's it. No auto-fill. No guessing. A suggestion is offered once — the rest is you.

### Schemes

A **scheme** is a named, reusable metadata template you define. It has:

- A name (e.g., "MinION Run Metadata", "Field Collection Basic", "Soil Sample Full")
- A set of fields: each field has a name, a type (text, number, date, GPS, choice list, boolean, URL), and optionally a description
- Optional default field ordering and groupings for the UI

Schemes are stored in your local Scheme Bank. You can create as many as you want, modify them freely, delete them, import them from others, and export them to share.

**Schemes are not file-type-specific** — you can apply any scheme to any file. The suggestion system learns from your history, but it never enforces anything.

### Scheme Bank

Your **Scheme Bank** is your personal library of all schemes you have created, imported, or received. Access it from the sidebar at any time to:

- Browse all your schemes
- Create a new scheme from scratch (name it, add fields one by one)
- Duplicate an existing scheme and modify it
- Edit any scheme — add fields, remove fields, rename fields, reorder
- Delete schemes you no longer use
- Import a scheme from a `.metascheme` file shared by someone else
- Export any scheme as a `.metascheme` file to share

Schemes are entirely yours. There is no cloud sync, no scheme marketplace, no central authority. You share them however you choose — email, GitHub, a community post.

### Built-in Starter Schemes

MetaStrata ships with a library of **built-in starter schemes** covering common biological and scientific file types. These are starting points — every field, every name, every structure is fully editable. Delete ones you don't want. Add fields that matter to you. Rename everything to match your own vocabulary.

Built-in starter schemes include:

| Scheme Name | Intended For |
|-------------|-------------|
| DNA Sequencing Run | FASTQ/BAM files from sequencing instruments |
| Environmental Sample | eDNA, soil, water, air collection records |
| Species Occurrence | iNaturalist-style field observation records |
| Darwin Core Occurrence | Formal Darwin Core standard fields |
| Soil Physical/Chemical | Abiotic soil measurement records |
| Atmospheric Observation | Weather station and atmospheric sensor logs |
| Microscopy Session | Light and electron microscopy records |
| PCR / Amplification | PCR setup and results tracking |
| Metagenomics Run | QIIME2/BIOM-compatible metadata |
| Clinical Sample (FHIR) | FHIR-adjacent patient sample records |
| ISA-Tab Study Record | ISA-Tab compatible study/assay metadata |
| Custom (Blank) | Start entirely from scratch |

Built-in schemes are read-only by default — to customize one, duplicate it first. Your copy is fully editable.

### Feature Bank & Value History

As you fill in metadata across your collection, MetaStrata builds a **Feature Bank** — a history of every category, field name, and value you have ever entered. This history powers the suggestion system.

**Feature Bank contents:**

- Every category name you have used (e.g., "morphological", "ecological_role", "custom")
- Every field name from every scheme you have applied (e.g., "collection_date", "habitat", "sequencer_model")
- Every value you have entered for every field (e.g., "Decaying hardwood", "MinION Mk1C", "cloud forest edge")

The Feature Bank is local and grows with your collection. It is never shared or transmitted anywhere.

---

## As-You-Type Suggestions

When you type in any metadata field, MetaStrata provides **inline suggestions drawn from your Feature Bank.** These appear as a dropdown below the field as you type and disappear the moment your input no longer matches anything in your history.

### How It Works

- As you type, MetaStrata queries your Feature Bank for values in that field across your entire collection
- Matches are ranked by recency and frequency
- The suggestion list appears inline below the input — unobtrusive, not a modal
- The list disappears immediately when your input no longer matches any stored value
- You are never forced to pick from the list — keep typing to enter something new
- Selecting a suggestion fills the field and moves focus to the next field

### Category & Field Name Suggestions

The same system applies to:

- **Category names** when adding a feature tag — as you type, your previously used category names appear
- **Field names** when building or editing a scheme — your existing field name vocabulary appears as suggestions
- **Scheme selection** when dropping a new file — your most recently used schemes for that file type are surfaced

### No AI, No Autocomplete Engine

The suggestion system is purely local string matching against your own Feature Bank. There is no AI inference, no external lookup, no predictive filling. You are always in control of what ends up in your metadata.

---

## Applying Metadata — The Workflow

### 1. Drop a File

Drag any supported file onto the MetaStrata window or use File → New Stratum. MetaStrata detects the file format.

### 2. Scheme Suggestion (If Applicable)

If you have schemes in your Scheme Bank that you have previously used with files of this type, MetaStrata shows a suggestion panel:

```
Suggested schemes for .fastq files:
  ★ MinION Run Metadata       (used 14 times)
  ★ Environmental Sample      (used 3 times)

  [ Start with a suggested scheme ]  [ Browse all schemes ]  [ No scheme — blank record ]
```

This panel only appears if you have relevant history. It never appears for your first file of a new type.

### 3. Enter Your Metadata

All fields are blank. You fill them in manually:

- Type in text fields — as-you-type suggestions appear from your Feature Bank
- Pick dates from the date picker
- Enter GPS coordinates manually or pin on the map panel
- Add feature tags one at a time from the feature tag panel — category and value suggestions appear as you type
- Leave any field empty — nothing is required unless you define required fields in your scheme

### 4. Save as `.stratum`

When you're done, save. The original file and all your metadata are packaged into a `.stratum` archive. The original file is untouched inside.

---

## Shareable Schemes

Schemes can be exported and imported freely. This enables:

- **Sharing with collaborators:** Export a scheme, send the `.metascheme` file, your collaborator imports it and applies it to their own collection. Both collections now use consistent field names — making merged analysis easier later.
- **Community scheme libraries:** Post a scheme to a forum, GitHub, or UngatedMinds. Anyone can import it.
- **Lab/group standards:** A lab group can maintain a shared set of schemes in a repository. Each member imports the current version.
- **Personal backup:** Export your Scheme Bank as a full archive to keep alongside your `.strata` collection files.

### Scheme File Format

A `.metascheme` file is a JSON file:

```json
{
  "metastrata_schema": "scheme_v1",
  "name": "MinION Run Metadata",
  "description": "Fields for Oxford Nanopore MinION sequencing runs",
  "created_by": "optional-identifier",
  "created_at": "2025-03-15",
  "fields": [
    {
      "id": "sequencer_model",
      "label": "Sequencer Model",
      "type": "text",
      "description": "e.g., Oxford Nanopore MinION Mk1C"
    },
    {
      "id": "flowcell_id",
      "label": "Flow Cell ID",
      "type": "text"
    },
    {
      "id": "basecalling_software",
      "label": "Basecalling Software",
      "type": "text",
      "description": "e.g., Guppy 6.5.7"
    },
    {
      "id": "phred_q30_percent",
      "label": "Phred Q30 %",
      "type": "number"
    },
    {
      "id": "total_reads",
      "label": "Total Reads",
      "type": "number"
    }
  ]
}
```

`.metascheme` files are plain JSON — readable, version-controllable, and platform-independent.

---

## Supported Source Formats

MetaStrata accepts any file as a source. The following formats are recognized for format detection (used only to identify the file type — not to auto-populate anything):

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
| Generic | Any file — any scheme, any fields |

Format detection informs the scheme suggestion system only. MetaStrata does not read, parse, or process file contents for any purpose.

---

## Feature Tagging

Feature tags are your personal annotations about what a record *means* biologically or functionally. They live in `tags.json` inside the `.stratum` archive and are entirely separate from your scheme metadata.

Feature tags are free-form key-value pairs organized by category. Every category name and value you have ever used is stored in your Feature Bank and appears as a suggestion when you're adding new tags.

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

You define the categories. You define the values. You can tag anything you observe, hypothesize, or want to find later. The Feature Bank ensures your vocabulary stays consistent across your collection — as you type a category like "mor", your previously used "morphological" appears as a suggestion.

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
| **Filtered subset** | Any of the above, filtered by tag, date range, format type, collection status, or any scheme field value |
| **Scheme export** | Any scheme from your Scheme Bank as a `.metascheme` file |
| **Full Scheme Bank export** | All your schemes as a `.metascheme-bundle` archive |

---

## Import Options

| Import Source | Notes |
|--------------|-------|
| Any supported file format | Drop a file; MetaStrata detects format and offers relevant scheme suggestions from your history |
| iNaturalist CSV export | Imports observation records; field mapping to your schemes is manual |
| GBIF download | Imports occurrence data; field mapping is manual |
| Existing `.stratum` file | Open and edit previously created stratum — add or change metadata, add tags |
| Existing `.strata` archive | Open and add to an existing collection |
| `.metascheme` file | Import a scheme shared by a collaborator or from the community |
| `.metascheme-bundle` | Import a full scheme bundle |

---

## Statistics Dashboard

The Stats tab shows aggregate information about your collection:

- Total entries by format type and category
- Tag frequency distribution (what you tag most, not what the tags say)
- Category usage across the Feature Bank
- Entries added over time (activity chart)
- Collection streaks
- Coverage by custom domain (your own organization system)
- Scheme usage frequency — which schemes you use most

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

**Stack:** Electron + ReactJS — a native desktop experience with a modern, interactive interface.

**Mobile (planned):** iOS and Android versions planned. Will read/write `.stratum` files and sync locally via USB/local network to desktop collection. The Scheme Bank and Feature Bank sync locally between desktop and mobile — no cloud required.

---

## Usage Quick Reference

```
File > New Stratum           — wrap a single file with metadata
File > Open Stratum          — open and edit an existing .stratum file
File > New Collection        — create a .strata collection archive
Collection > Add             — add a .stratum file to open collection
Collection > Filter          — filter entries by tag, date range, format, field value
Schemes > Scheme Bank        — browse, create, edit, delete, import, export schemes
Schemes > New Scheme         — build a new scheme from scratch
Schemes > Import Scheme      — import a .metascheme or .metascheme-bundle file
Schemes > Export Scheme      — export a scheme to share
Features > Feature Bank      — browse all categories, field names, values in your history
Stats > View                 — collection overview, charts, scheme usage
Stats > Export Card          — generate shareable stats PNG (no data, counts only)
File > Export                — export to CSV / JSON / Darwin Core / original file
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

*MetaStrata is built for the person who collects carefully — and wants their collection to reflect that.*
