import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  Search,
  Link2,
  Tag,
  MapPin,
  BookOpen,
  ChevronRight,
  ChevronLeft,
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

const PAGE_SIZE = 20;

export default function FeatureBank() {
  const { state, openStratum } = useApp();
  const { strata, schemeBank, featureBank } = state;
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("discover");
  const [selectedKey, setSelectedKey] = useState(null);

  // Pagination state per tab
  const [page, setPage] = useState(0);

  const stats = getFeatureBankStats(featureBank);

  // Reset page when tab or search changes
  useEffect(() => {
    setPage(0);
  }, [activeTab, search]);

  // ── Build relationship index ───────────────────────────────────────────────
  const relationships = useMemo(() => {
    const byScheme = {};
    const byFieldKey = {};
    const byTagCategory = {};
    const byProvenanceKey = {};

    strata.forEach((s) => {
      const m = s.manifest || {};
      const meta = s.metadata || {};
      const tags = s.tags?.feature_tags || [];
      const prov = s.provenance || {};

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

      // By provenance
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

  // ── FIX: Remove redundant NAV dispatch that clears state ───────────────────
  const handleOpenStratum = useCallback(
    async (filePath) => {
      // openStratum action in AppContext already handles view switching and state population.
      // We must NOT dispatch NAV here, as it resets activeStratumFilePath to null.
      await openStratum(filePath);
    },
    [openStratum],
  );

  const handleSwitchTab = (tabId, key = null) => {
    setActiveTab(tabId);
    if (key) setSelectedKey(key);
    setPage(0);
  };

  // ── Pagination Controls Component ──────────────────────────────────────────
  const Pagination = ({ totalItems, currentPage, onPageChange }) => {
    const totalPages = Math.ceil(totalItems / PAGE_SIZE);
    if (totalPages <= 1) return null;

    return (
      <div className="fb-pagination">
        <button
          className="fb-pagination__btn"
          disabled={currentPage === 0}
          onClick={() => onPageChange(currentPage - 1)}
        >
          <ChevronLeft size={14} /> Prev
        </button>
        <span className="fb-pagination__info">
          Page {currentPage + 1} of {totalPages}
        </span>
        <button
          className="fb-pagination__btn"
          disabled={currentPage >= totalPages - 1}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Next <ChevronRight size={14} />
        </button>
      </div>
    );
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
              placeholder="Filter across all relationships..."
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
            page={page}
            setPage={setPage}
            Pagination={Pagination}
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
            page={page}
            setPage={setPage}
            Pagination={Pagination}
          />
        )}

        {activeTab === "tags" && (
          <TagsRelationshipTab
            relationships={relationships}
            search={search}
            onOpenStratum={handleOpenStratum}
            page={page}
            setPage={setPage}
            Pagination={Pagination}
          />
        )}

        {activeTab === "provenance" && (
          <ProvenanceRelationshipTab
            relationships={relationships}
            search={search}
            onOpenStratum={handleOpenStratum}
            page={page}
            setPage={setPage}
            Pagination={Pagination}
          />
        )}

        {activeTab === "schemas" && (
          <SchemaRelationsTab
            relationships={relationships}
            schemeBank={schemeBank}
            search={search}
            onOpenStratum={handleOpenStratum}
            page={page}
            setPage={setPage}
            Pagination={Pagination}
          />
        )}
      </div>
    </div>
  );
}

// ── Discover Tab ─────────────────────────────────────────────────────────────
function DiscoverTab({
  relationships,
  schemeBank,
  search,
  strata,
  onNavigate,
  page,
  setPage,
  Pagination,
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

    // MOD: Provenance fields
    Object.entries(relationships.byProvenanceKey || {}).forEach(
      ([key, values]) => {
        const totalCount = Object.values(values).reduce(
          (s, a) => s + a.length,
          0,
        );
        items.push({ type: "provenance", label: key, count: totalCount });
      },
    );

    return items.filter((i) => !q || i.label.toLowerCase().includes(q));
  }, [relationships, schemeBank, q]);

  const handleCardClick = (item) => {
    if (item.type === "field" && item.key) {
      onNavigate("values", item.key);
    } else if (item.type === "schema") {
      onNavigate("schemas");
    } else if (item.type === "tag") {
      onNavigate("tags");
    } else if (item.type === "provenance") {
      onNavigate("provenance");
    }
    setPage(0);
  };

  const paginatedItems = summaryItems.slice(
    page * PAGE_SIZE,
    (page + 1) * PAGE_SIZE,
  );

  return (
    <div className="fb-discover">
      <p className="fb-discover-intro">
        See how your Strata relate to each other through shared schemas, fields,
        tags, and provenance. Click a card to explore.
      </p>

      <div className="fb-discover-grid">
        {paginatedItems.map((item, i) => (
          <div
            key={`${item.type}-${item.id || i}`}
            className="fb-discover-card"
            onClick={() => handleCardClick(item)}
          >
            <div className={`fb-discover-icon fb-discover-icon--${item.type}`}>
              {item.type === "schema" && <BookOpen size={14} />}
              {item.type === "field" && <Database size={14} />}
              {item.type === "tag" && <Tag size={14} />}
              {item.type === "provenance" && <MapPin size={14} />}
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
      <Pagination
        totalItems={summaryItems.length}
        currentPage={page}
        onPageChange={setPage}
      />
    </div>
  );
}

// ── Field Values Tab ─────────────────────────────────────────────────────────
function FieldValuesTab({
  featureBank,
  relationships,
  search,
  selectedKey,
  onSelectKey,
  onOpenStratum,
  page,
  setPage,
  Pagination,
}) {
  const q = search.toLowerCase();
  const fieldKeys = Object.keys(featureBank?.fieldValues || {});

  const filteredKeys = fieldKeys.filter(
    (k) => !q || k.toLowerCase().includes(q),
  );

  const paginatedKeys = filteredKeys.slice(
    page * PAGE_SIZE,
    (page + 1) * PAGE_SIZE,
  );

  if (selectedKey) {
    const values = featureBank?.fieldValues?.[selectedKey] || [];
    const relatedStrata = relationships.byFieldKey?.[selectedKey]?.strata || [];

    const valuesGrouped = {};
    Object.entries(
      relationships.byFieldKey?.[selectedKey]?.values || {},
    ).forEach(([val, strs]) => {
      valuesGrouped[val] = strs;
    });

    return (
      <div className="fb-detail-view">
        <button
          className="fb-back-btn"
          onClick={() => {
            onSelectKey(null);
            setPage(0);
          }}
        >
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
                {v}
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
    <>
      <div className="fb-values-grid">
        {paginatedKeys.map((key) => {
          const vals = featureBank.fieldValues[key] || [];
          const relatedCount =
            relationships.byFieldKey?.[key]?.strata?.length || 0;
          return (
            <button
              key={key}
              className="fb-field-card"
              onClick={() => {
                onSelectKey(key);
                setPage(0);
              }}
            >
              <span className="fb-field-key">{key}</span>
              <span className="fb-field-stats">
                {vals.length} value{vals.length !== 1 ? "s" : ""} ·{" "}
                {relatedCount} Strata
              </span>
              <ChevronRight size={12} className="fb-field-arrow" />
            </button>
          );
        })}
      </div>
      <Pagination
        totalItems={filteredKeys.length}
        currentPage={page}
        onPageChange={setPage}
      />
    </>
  );
}

// ── Tags Relationship Tab ───────────────────────────────────────────────────
function TagsRelationshipTab({
  relationships,
  search,
  onOpenStratum,
  page,
  setPage,
  Pagination,
}) {
  const q = search.toLowerCase();
  const categories = relationships.byTagCategory || {};
  const categoryEntries = Object.entries(categories);

  // Simple pagination for categories for now
  const paginatedCategories = categoryEntries.slice(
    page * PAGE_SIZE,
    (page + 1) * PAGE_SIZE,
  );

  return (
    <>
      <div className="fb-tags-relations">
        {paginatedCategories.map(([cat, values]) => {
          if (q && !cat.toLowerCase().includes(q)) return null;
          const valueEntries = Object.entries(values);
          return (
            <div key={cat} className="fb-tag-category">
              <div className="fb-tag-cat-header">
                <Tag size={12} />
                <span className="fb-tag-cat-name">{cat}</span>
              </div>
              <div className="fb-tag-values">
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
      <Pagination
        totalItems={categoryEntries.length}
        currentPage={page}
        onPageChange={setPage}
      />
    </>
  );
}

// ── Provenance Relationship Tab ─────────────────────────────────────────────
function ProvenanceRelationshipTab({
  relationships,
  search,
  onOpenStratum,
  page,
  setPage,
  Pagination,
}) {
  const q = search.toLowerCase();
  const provKeys = relationships.byProvenanceKey || {};
  const provEntries = Object.entries(provKeys);

  const paginatedProvs = provEntries.slice(
    page * PAGE_SIZE,
    (page + 1) * PAGE_SIZE,
  );

  return (
    <>
      <div className="fb-prov-relations">
        {paginatedProvs.map(([key, values]) => {
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
                      <span className="fb-prov-count">
                        {strs.length} Strata
                      </span>
                    </button>
                  ))}
              </div>
            </div>
          );
        })}
      </div>
      <Pagination
        totalItems={provEntries.length}
        currentPage={page}
        onPageChange={setPage}
      />
    </>
  );
}

// ── Schema Relations Tab ────────────────────────────────────────────────────
function SchemaRelationsTab({
  relationships,
  schemeBank,
  search,
  onOpenStratum,
  page,
  setPage,
  Pagination,
}) {
  const q = search.toLowerCase();
  const byScheme = relationships.byScheme || {};
  const schemaEntries = Object.entries(byScheme);

  const paginatedSchemas = schemaEntries.slice(
    page * PAGE_SIZE,
    (page + 1) * PAGE_SIZE,
  );

  return (
    <>
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
        {paginatedSchemas.map(([id, arr]) => {
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
      <Pagination
        totalItems={schemaEntries.length}
        currentPage={page}
        onPageChange={setPage}
      />
    </>
  );
}
