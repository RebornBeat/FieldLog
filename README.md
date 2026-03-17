# FieldLog

**A local-first personal data collection manager for independent researchers, citizen scientists, and field enthusiasts.**

FieldLog is a free, open-source desktop application that helps you organize, tag, filter, and visualize your personal data collections — entirely on your own device. No accounts. No cloud. No data leaves your machine.

---

## What FieldLog Is

FieldLog is a personal database manager optimized for field observations, biological notes, scientific measurements, collected files, and any other structured data you want to keep organized locally.

Think of it as a personal lab notebook that understands structure — one that lets you filter and cross-reference everything you've ever collected, generate stats and charts, and export in standard formats.

**FieldLog is not a platform, not a cloud service, and not a data bank.** It's a desktop application, like Excel or Obsidian, but purpose-built for structured collection data.

---

## Who It's For

- 🧫 **Biohackers** organizing their self-collected samples, sequences, and observations
- 🌱 **Citizen scientists** logging species sightings, environmental measurements, and field data
- 🔬 **Independent researchers** maintaining a personal record of experiments and findings
- 🌍 **Nature enthusiasts** tracking phenological observations, biodiversity records, and ecological data
- 🌾 **Farmers and agronomists** logging crop performance, soil data, and farm observations
- Anyone who collects data and wants it organized, searchable, and visualized

---

## Key Features

- **Local-first** — all data stored in a SQLite database (`.flog` file) on your device. Nothing ever sent anywhere.
- **Flexible entry schema** — define custom fields for any type of collection entry.
- **Tagging system** — tag entries with multiple tags, build a personal taxonomy.
- **Full-text search** — instantly search across all your entries, notes, and tags.
- **File attachments** — attach files of any type to entries (photos, sequences, audio, documents). Files stored in your `.flog` archive.
- **Statistics dashboard** — visualize your collection: entries over time, distribution by tag, domain coverage charts, streak tracking.
- **Shareable stats cards** — generate a shareable image (PNG) of your collection stats — without sharing any of your actual data. Brag about your progress, not your contents.
- **Export** — export filtered subsets to CSV, JSON, or Darwin Core format. Full backup export of your entire `.flog` database.
- **Import** — import from CSV, iNaturalist export, GBIF download, custom CSV with field mapping.
- **Offline-first** — works with no internet connection.

---

## The `.flog` File Format

FieldLog uses the `.flog` format — a SQLite database with a standardized schema. You can open `.flog` files with any SQLite browser (DB Browser for SQLite, DBeaver, etc.) in addition to FieldLog.

### Schema Overview

```sql
-- Core tables
CREATE TABLE entries (
    id          TEXT PRIMARY KEY,    -- UUID
    title       TEXT NOT NULL,
    notes       TEXT,
    entry_type  TEXT,                -- user-defined category
    created_at  TEXT NOT NULL,       -- ISO 8601
    updated_at  TEXT NOT NULL,
    latitude    REAL,                -- optional GPS
    longitude   REAL,
    altitude_m  REAL,
    custom_data TEXT                 -- JSON blob for custom fields
);

CREATE TABLE tags (
    id          TEXT PRIMARY KEY,
    name        TEXT UNIQUE NOT NULL,
    color       TEXT,
    parent_id   TEXT REFERENCES tags(id)  -- hierarchical tags
);

CREATE TABLE entry_tags (
    entry_id    TEXT REFERENCES entries(id),
    tag_id      TEXT REFERENCES tags(id),
    PRIMARY KEY (entry_id, tag_id)
);

CREATE TABLE attachments (
    id          TEXT PRIMARY KEY,
    entry_id    TEXT REFERENCES entries(id),
    filename    TEXT NOT NULL,
    mime_type   TEXT,
    size_bytes  INTEGER,
    stored_path TEXT NOT NULL,       -- relative path within .flog archive
    sha256      TEXT NOT NULL,       -- integrity hash
    created_at  TEXT NOT NULL
);

CREATE TABLE fields (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    field_type  TEXT NOT NULL,       -- text, number, date, choice, boolean, url
    options     TEXT,                -- JSON array for choice fields
    applies_to  TEXT                 -- entry_type filter, null = all
);

CREATE TABLE meta (
    key         TEXT PRIMARY KEY,
    value       TEXT
    -- Stores: schema_version, created_at, fieldlog_version, collection_name
);
```

### File Structure

A `.flog` file is a ZIP archive containing:
```
my_collection.flog (ZIP)
├── fieldlog.db          # SQLite database (all entries, tags, fields, metadata)
├── attachments/         # All attached files, named by SHA-256 hash
│   ├── a3f2...c8.fastq
│   ├── b7d1...44.jpg
│   └── ...
└── export_manifest.json # Summary: entry count, tag list, date range
```

---

## Why `.flog` Over Existing Formats?

Existing biological data formats (Darwin Core, FHIR, ISA-Tab, FASTQ, FASTA, etc.) are designed for sharing and exchange. FieldLog's `.flog` format is designed for **personal local collection management** — a different use case that no existing format covers well:

| Need | Darwin Core | SQLite (.db) | `.flog` |
|------|-------------|--------------|---------|
| Personal multi-type collection | ❌ Species only | ✅ | ✅ |
| File attachments | ❌ | ❌ | ✅ |
| Custom fields per entry type | ❌ | Manually | ✅ |
| Built-in export to standard formats | ❌ | ❌ | ✅ (CSV, Darwin Core, JSON) |
| Portable single-file archive | ❌ | ✅ | ✅ |
| Human-readable without FieldLog | ❌ | With tools | ✅ (any SQLite browser) |

---

## Shareable Stats — Not Data

FieldLog includes a **Stats Card Generator** that produces a shareable PNG image showing:

- Total entries in your collection
- Entry count by category/domain
- Tags used (count, not values)
- Entries added over time (chart)
- Collection streaks
- Your custom collection name

**The stats card contains no entry content, no file data, no GPS coordinates, no identifiers.** Just aggregate numbers and charts — the same thing you'd see on any gaming achievement card or fitness app summary. Share it on [your knowledge platform], show your friends, flex your dedication.

---

## Installation

```bash
# Electron desktop app (Windows, macOS, Linux)
# Download from Releases page — .exe / .dmg / .AppImage

# Or build from source:
git clone https://github.com/[username]/fieldlog
cd fieldlog
npm install
npm run build
```

---

## Usage

```bash
# Create a new collection
File > New Collection > name your .flog file, choose save location

# Add an entry
+ New Entry > fill title, notes, tags, custom fields, attach files

# Filter entries
Filter Bar > by tag, by entry type, by date range, by text search

# View stats
Stats tab > collection overview, charts, generate shareable stats card

# Export
File > Export > choose format (CSV / Darwin Core / JSON) and filter

# Backup
File > Export > Full Backup (.flog copy)
```

---

## Legal Notice

FieldLog is general-purpose data organization software. **The developer of FieldLog has no knowledge of, access to, or responsibility for data that users store in their local `.flog` databases.**

Users who collect biological samples, genetic sequences, or other materials regulated under the Nagoya Protocol, the Convention on Biological Diversity, or applicable national Access and Benefit-Sharing legislation are solely responsible for ensuring their collection activities comply with applicable law. FieldLog is not a platform for trading, sharing, or commercializing any data. It is a local database application.

---

## Contributing

Pull requests welcome. See [CONTRIBUTING.md] for guidelines.

Issues: [GitHub Issues](https://github.com/[username]/fieldlog/issues)

---

## License

MIT License — free for personal and commercial use.

---

## Related

Users of this tool often also participate in the [Platform Name] knowledge community — an open learning network for intellectually curious people. If you want to discuss your findings, ask for help interpreting data, or learn from others in your field, that's the place to do it. FieldLog is a separate, standalone tool — not part of the platform.

---

*FieldLog is built for the person who collects because they love it — not because an institution told them to.*
