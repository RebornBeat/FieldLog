import React, { useState, useMemo, useCallback } from "react";
import {
  Search,
  Link2,
  Tag,
  MapPin,
  BookOpen,
  ChevronRight,
  Database,
  Layers,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { getFeatureBankStats } from "../../utils/featureBank";
import "./FeatureBank.css";

const TABS = [
  { id: "discover", label: "Discover", icon: Link2 },
  { id: "values", label: "Field Values", icon: Database },
  { id: "tags", label: "Tags", icon: Tag },
  { id: "provenance", label: "Provenance", icon: MapPin },
  { id: "schemas", label: "Schema Relations", icon: BookOpen },
];

export default function FeatureBank() {
  const { state, dispatch, openStratum } = useApp();
  const { strata, schemeBank, featureBank } = state;
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("discover");
  const [selectedKey, setSelectedKey] = useState(null);

  const stats = getFeatureBankStats(featureBank);

  // ── Build relationship index (Now with full data from scan) ───────────────
  const relationships = useMemo(() => {
    const byScheme = {};
    const byFieldKey = {};
    const byTagCategory = {};
    const byProvenanceKey = {};

    // Scan the full strata list (now includes metadata/tags from electron.js update)
    strata.forEach((s) => {
      const m = s.manifest || {};
      const meta = s.metadata || {};
      const tags = s.tags?.feature_tags || [];
      const prov = s.provenance || {}; // Fix: Ensure provenance fallback

      // By scheme
      if (m.applied_scheme_id) {
        if (!byScheme[m.applied_scheme_id]) byScheme[m.applied_scheme_id] = [];
        byScheme[m.applied_scheme_id].push(s);
      }

      // By field keys
      Object.entries(meta).forEach(([key, val]) => {
        if (!val) return;
        if (!byFieldKey[key]) byFieldKey[key] = { values: {}, strata: [] };
        byFieldKey[key].strata.push(s);
        const v = Array.isArray(val) ? val.join(", ") : String(val);
        if (!byFieldKey[key].values[v]) byFieldKey[key].values[v] = [];
        byFieldKey[key].values[v].push(s);
      });

      // By tag category
      tags.forEach((t) => {
        if (!byTagCategory[t.category]) byTagCategory[t.category] = {};
        if (!byTagCategory[t.category][t.value])
          byTagCategory[t.category][t.value] = [];
        byTagCategory[t.category][t.value].push(s);
      });

      // Fix: By provenance
      Object.entries(prov).forEach(([key, val]) => {
        if (!val) return;
        if (!byProvenanceKey[key]) byProvenanceKey[key] = {};
        const v = String(val);
        if (!byProvenanceKey[key][v]) byProvenanceKey[key][v] = [];
        byProvenanceKey[key][v].push(s);
      });
    });

    return { byScheme, byFieldKey, byTagCategory, byProvenanceKey };
  }, [strata]);

  const handleOpenStratum = useCallback(
    async (filePath) => {
      // Fix: Await loading before navigating
      await openStratum(filePath);
      dispatch({ type: "NAV", payload: "stratum" });
    },
    [openStratum, dispatch],
  );

  const handleSwitchTab = (tabId, key = null) => {
    setActiveTab(tabId);
    if (key) setSelectedKey(key);
  };

  return (
    <div className="view-page">
      <div className="view-page__header">
        <div>
          <h1 className="view-page__title">Feature Bank</h1>
          <p className="view-page__subtitle">
            Discover relationships across your collection
          </p>
        </div>
      </div>

      <div className="view-page__body">
        {/* Search */}
        <div className="fb-search-row">
          <div className="fb-search">
            <Search size={13} className="fb-search__icon" />
            <input
              className="fb-search__input"
              placeholder="Search across all relationships..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="fb-tabs">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className={`fb-tab ${
                  activeTab === tab.id ? "fb-tab--active" : ""
                }`}
                onClick={() => handleSwitchTab(tab.id)}
              >
                <Icon size={12} /> {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        {activeTab === "discover" && (
          <DiscoverTab
            relationships={relationships}
            schemeBank={schemeBank}
            search={search}
            strata={strata}
            onNavigate={handleSwitchTab}
          />
        )}

        {activeTab === "values" && (
          <FieldValuesTab
            featureBank={featureBank}
            relationships={relationships}
            search={search}
            selectedKey={selectedKey}
            onSelectKey={setSelectedKey}
            onOpenStratum={handleOpenStratum}
          />
        )}

        {activeTab === "tags" && (
          <TagsRelationshipTab
            relationships={relationships}
            search={search}
            onOpenStratum={handleOpenStratum}
          />
        )}

        {activeTab === "provenance" && (
          <ProvenanceRelationshipTab
            relationships={relationships}
            search={search}
            onOpenStratum={handleOpenStratum}
          />
        )}

        {activeTab === "schemas" && (
          <SchemaRelationsTab
            relationships={relationships}
            schemeBank={schemeBank}
            search={search}
            onOpenStratum={handleOpenStratum}
          />
        )}
      </div>
    </div>
  );
}

// ── Discover Tab: Overview of all relationships ─────────────────────────────
function DiscoverTab({
  relationships,
  schemeBank,
  search,
  strata,
  onNavigate,
}) {
  const q = search.toLowerCase();

  const summaryItems = useMemo(() => {
    const items = [];

    // Schema groups
    Object.entries(relationships.byScheme).forEach(([id, arr]) => {
      const sc = schemeBank.find((s) => s.id === id);
      items.push({
        type: "schema",
        label: sc?.name || "Unknown Scheme",
        count: arr.length,
        id,
      });
    });

    // Top field keys
    Object.entries(relationships.byFieldKey).forEach(([key, data]) => {
      items.push({
        type: "field",
        label: key,
        count: data.strata.length,
        uniqueValues: Object.keys(data.values).length,
        key: key,
      });
    });

    // Tag categories
    Object.entries(relationships.byTagCategory).forEach(([cat, vals]) => {
      const totalCount = Object.values(vals).reduce((s, a) => s + a.length, 0);
      items.push({ type: "tag", label: cat, count: totalCount });
    });

    return items.filter((i) => !q || i.label.toLowerCase().includes(q));
  }, [relationships, schemeBank, q]);

  const handleCardClick = (item) => {
    if (item.type === "field" && item.key) {
      onNavigate("values", item.key);
    } else if (item.type === "schema") {
      onNavigate("schemas");
    } else if (item.type === "tag") {
      onNavigate("tags");
    }
  };

  return (
    <div className="fb-discover">
      <p className="fb-discover-intro">
        See how your Strata relate to each other through shared schemas, fields,
        and tags. Click a card to explore.
      </p>

      <div className="fb-discover-grid">
        {summaryItems.slice(0, 20).map((item, i) => (
          <div
            key={`${item.type}-${item.id || i}`}
            className="fb-discover-card"
            onClick={() => handleCardClick(item)}
          >
            <div className={`fb-discover-icon fb-discover-icon--${item.type}`}>
              {item.type === "schema" && <BookOpen size={14} />}
              {item.type === "field" && <Database size={14} />}
              {item.type === "tag" && <Tag size={14} />}
            </div>
            <div className="fb-discover-info">
              <span className="fb-discover-label">{item.label}</span>
              <span className="fb-discover-meta">
                {item.count} Stratum{item.count !== 1 ? "s" : ""}
                {item.uniqueValues && ` · ${item.uniqueValues} values`}
              </span>
            </div>
            <ChevronRight size={14} className="fb-discover-arrow" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Field Values Tab with relationships ──────────────────────────────────────
function FieldValuesTab({
  featureBank,
  relationships,
  search,
  selectedKey,
  onSelectKey,
  onOpenStratum,
}) {
  const q = search.toLowerCase();
  const fieldKeys = Object.keys(featureBank?.fieldValues || {});

  const filteredKeys = fieldKeys.filter(
    (k) => !q || k.toLowerCase().includes(q),
  );

  if (selectedKey) {
    const values = featureBank?.fieldValues?.[selectedKey] || [];
    const relatedStrata = relationships.byFieldKey?.[selectedKey]?.strata || [];

    // Group by value for display
    const valuesGrouped = {};
    Object.entries(
      relationships.byFieldKey?.[selectedKey]?.values || {},
    ).forEach(([val, strs]) => {
      valuesGrouped[val] = strs;
    });

    return (
      <div className="fb-detail-view">
        <button className="fb-back-btn" onClick={() => onSelectKey(null)}>
          ← Back to all fields
        </button>
        <h3 className="fb-detail-title">
          Field: <span>{selectedKey}</span>
        </h3>

        <div className="fb-detail-section">
          <h4>Values Used ({values.length})</h4>
          <div className="fb-value-chips">
            {values.slice(0, 50).map((v, i) => (
              <span key={i} className="fb-value-chip">
                {v} {/* Fix: Always show count if available */}
                {valuesGrouped[v]?.length > 0 && (
                  <span className="fb-tag-count">
                    ({valuesGrouped[v].length})
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>

        <div className="fb-detail-section">
          <h4>Strata Using This Field ({relatedStrata.length})</h4>
          <div className="fb-stratum-list">
            {relatedStrata.slice(0, 20).map((s) => (
              <button
                key={s.filePath}
                className="fb-stratum-item"
                onClick={() => onOpenStratum(s.filePath)}
              >
                <span className="fb-stratum-name">
                  {s.manifest?.archive_name || s.filename}
                </span>
                {/* Fix: Always show value */}
                <span className="fb-stratum-value">
                  {s.metadata?.[selectedKey] || "—"}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fb-values-grid">
      {filteredKeys.map((key) => {
        const vals = featureBank.fieldValues[key] || [];
        const relatedCount =
          relationships.byFieldKey?.[key]?.strata?.length || 0;
        return (
          <button
            key={key}
            className="fb-field-card"
            onClick={() => onSelectKey(key)}
          >
            <span className="fb-field-key">{key}</span>
            <span className="fb-field-stats">
              {vals.length} value{vals.length !== 1 ? "s" : ""} · {relatedCount}{" "}
              Strata
            </span>
            <ChevronRight size={12} className="fb-field-arrow" />
          </button>
        );
      })}
    </div>
  );
}

// ── Tags Relationship Tab ───────────────────────────────────────────────────
function TagsRelationshipTab({ relationships, search, onOpenStratum }) {
  const q = search.toLowerCase();
  const categories = relationships.byTagCategory || {};

  return (
    <div className="fb-tags-relations">
      {Object.entries(categories).map(([cat, values]) => {
        if (q && !cat.toLowerCase().includes(q)) return null;
        const valueEntries = Object.entries(values);
        return (
          <div key={cat} className="fb-tag-category">
            <div className="fb-tag-cat-header">
              <Tag size={12} />
              <span className="fb-tag-cat-name">{cat}</span>
            </div>
            <div className="fb-tag-values">
              {/* MOD: Restructure to show details explicitly */}
              {valueEntries.map(([val, strs]) => (
                <div key={val} className="fb-tag-detail-row">
                  <div className="fb-tag-detail-header">
                    <span className="fb-tag-value-name">{val}</span>
                    <span className="fb-tag-count">{strs.length} Strata</span>
                  </div>
                  <div className="fb-stratum-list">
                    {strs.slice(0, 5).map((s) => (
                      <button
                        key={s.filePath}
                        className="fb-stratum-item"
                        onClick={() => onOpenStratum(s.filePath)}
                      >
                        <span className="fb-stratum-name">
                          {s.manifest?.archive_name || s.filename}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Provenance Relationship Tab ─────────────────────────────────────────────
function ProvenanceRelationshipTab({ relationships, search, onOpenStratum }) {
  const q = search.toLowerCase();
  const provKeys = relationships.byProvenanceKey || {};

  return (
    <div className="fb-prov-relations">
      {Object.entries(provKeys).map(([key, values]) => {
        if (q && !key.toLowerCase().includes(q)) return null;
        return (
          <div key={key} className="fb-prov-group">
            <div className="fb-prov-header">
              <MapPin size={12} />
              <span className="fb-prov-key">{key}</span>
            </div>
            <div className="fb-prov-values">
              {Object.entries(values)
                .slice(0, 10)
                .map(([val, strs]) => (
                  <button
                    key={val}
                    className="fb-prov-row"
                    onClick={() => {
                      if (strs.length > 0) onOpenStratum(strs[0].filePath);
                    }}
                    title={`Click to open ${strs[0]?.manifest?.archive_name || strs[0]?.filename}`}
                  >
                    <span className="fb-prov-val">{val}</span>
                    <span className="fb-prov-count">{strs.length} Strata</span>
                  </button>
                ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Schema Relations Tab ────────────────────────────────────────────────────
function SchemaRelationsTab({
  relationships,
  schemeBank,
  search,
  onOpenStratum,
}) {
  const q = search.toLowerCase();
  const byScheme = relationships.byScheme || {};

  return (
    <div className="fb-schema-relations">
      {/* Strata without schema */}
      <div className="fb-schema-section">
        <h3 className="fb-schema-section-title">
          <Layers size={12} /> Without Schema
        </h3>
        <p className="fb-schema-section-desc">
          Strata that have no scheme applied
        </p>
      </div>

      {/* By Schema */}
      {Object.entries(byScheme).map(([id, arr]) => {
        const sc = schemeBank.find((s) => s.id === id);
        if (q && !sc?.name?.toLowerCase().includes(q)) return null;
        return (
          <div key={id} className="fb-schema-group">
            <div className="fb-schema-header">
              <BookOpen size={14} />
              <div className="fb-schema-info">
                <span className="fb-schema-name">
                  {sc?.name || "Unknown"}
                  {sc?.isBuiltIn && (
                    <span className="fb-schema-badge">built-in</span>
                  )}
                </span>
                <span className="fb-schema-fields">
                  {sc?.fields?.length || 0} fields
                </span>
              </div>
              <span className="fb-schema-count">{arr.length}</span>
            </div>
            <div className="fb-schema-archives">
              {arr.slice(0, 8).map((s) => (
                <button
                  key={s.filePath}
                  className="fb-schema-archive"
                  onClick={() => onOpenStratum(s.filePath)}
                >
                  <span className="fb-schema-arch-name">
                    {s.manifest?.archive_name || s.filename}
                  </span>
                  <span className="fb-schema-arch-file">
                    {s.manifest?.source_filename}
                  </span>
                </button>
              ))}
              {arr.length > 8 && (
                <span className="fb-schema-more">+{arr.length - 8} more</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
