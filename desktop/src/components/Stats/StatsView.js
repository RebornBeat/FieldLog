import React, { useMemo } from "react";
import { useApp } from "../../context/AppContext";
import { FORMAT_LABELS } from "../../constants";
import { getFeatureBankStats } from "../../utils/featureBank";
import "./StatsView.css";

export default function StatsView() {
  const { state } = useApp();
  const { strata, schemeBank, history, featureBank } = state;

  const stats = useMemo(() => {
    // ── Format distribution ─────────────────────────────────────────────
    const byFormat = {};
    strata.forEach((s) => {
      const fmt = s.manifest?.source_format || "unknown";
      byFormat[fmt] = (byFormat[fmt] || 0) + 1;
    });

    // ── Scheme usage (ALL schemes, ranked) ──────────────────────────────
    const schemeUsage = {};
    strata.forEach((s) => {
      const id = s.manifest?.applied_scheme_id;
      if (id) schemeUsage[id] = (schemeUsage[id] || 0) + 1;
    });
    const schemeRanking = Object.entries(schemeUsage)
      .sort((a, b) => b[1] - a[1])
      .map(([id, count]) => ({
        id,
        count,
        scheme: schemeBank.find((s) => s.id === id),
      }));

    // ── Stratum with/without scheme ─────────────────────────────────────
    const withScheme = strata.filter(
      (s) => s.manifest?.applied_scheme_id,
    ).length;
    const withoutScheme = strata.length - withScheme;

    // ── Total source size ───────────────────────────────────────────────
    const totalBytes = strata.reduce(
      (acc, s) => acc + (s.manifest?.source_size_bytes || 0),
      0,
    );

    // ── Activity: archives created per month (last 6 months) ────────────
    const now = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        label: d.toLocaleDateString(undefined, {
          month: "short",
          year: "2-digit",
        }),
        count: 0,
        key: `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`,
      });
    }
    strata.forEach((s) => {
      const ts = s.manifest?.created_at;
      if (!ts) return;
      const d = new Date(ts);
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
      const m = months.find((mo) => mo.key === key);
      if (m) m.count++;
    });

    // ── Feature Bank stats ──────────────────────────────────────────────
    const fbStats = getFeatureBankStats(featureBank);

    return {
      byFormat,
      schemeRanking,
      withScheme,
      withoutScheme,
      totalBytes,
      months,
      fbStats,
      totalStrata: strata.length,
    };
  }, [strata, schemeBank, history, featureBank]);

  const formatSize = (b) => {
    if (!b && b !== 0) return "0 B";
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    if (b < 1024 ** 3) return `${(b / (1024 * 1024)).toFixed(1)} MB`;
    return `${(b / 1024 ** 3).toFixed(2)} GB`;
  };

  const maxMonthCount = Math.max(...stats.months.map((m) => m.count), 1);

  // Calculate Pie Chart Data
  const totalFormats = Object.values(stats.byFormat).reduce((a, b) => a + b, 0);
  const formatEntries = Object.entries(stats.byFormat)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  // Generate Conic Gradient for Pie
  let cumulativePercent = 0;
  const gradientStops = formatEntries
    .map(([fmt, count], i) => {
      const percent = (count / totalFormats) * 100;
      const start = cumulativePercent;
      cumulativePercent += percent;
      return `var(--chart-color-${i + 1}) ${start}% ${cumulativePercent}%`;
    })
    .join(", ");

  const pieGradient = `conic-gradient(${gradientStops})`;

  return (
    <div className="view-page">
      <div className="view-page__header">
        <div>
          <h1 className="view-page__title">Collection Statistics</h1>
          <p className="view-page__subtitle">
            Shareable overview of your collection
          </p>
        </div>
      </div>

      <div className="view-page__body stats-page-body">
        {/* ── Hero Section ────────────────────────────────────────────── */}
        <div className="stats-hero">
          <div className="stats-hero-main">
            <div className="stats-big-number">{stats.totalStrata}</div>
            <div className="stats-big-label">Total Strata</div>
          </div>
          <div className="stats-hero-sub">
            <div className="stats-hero-item">
              <span className="stats-hero-val">{stats.withScheme}</span>
              <span>with Scheme</span>
            </div>
            <div className="stats-hero-item">
              <span className="stats-hero-val">
                {formatSize(stats.totalBytes)}
              </span>
              <span>Total Size</span>
            </div>
          </div>
        </div>

        <div className="stats-grid-charts">
          {/* ── Format Pie Chart ─────────────────────────────────────── */}
          <div className="stats-chart-card">
            <h3 className="stats-chart-title">Formats</h3>
            <div className="stats-donut-container">
              <div className="stats-donut" style={{ background: pieGradient }}>
                <div className="stats-donut-inner">
                  <span>{totalFormats}</span>
                </div>
              </div>
            </div>
            <div className="stats-donut-legend">
              {formatEntries.map(([fmt, count], i) => (
                <div key={fmt} className="stats-legend-item">
                  <div
                    className="stats-legend-color"
                    style={{ background: `var(--chart-color-${i + 1})` }}
                  />
                  <span className="stats-legend-label">
                    {FORMAT_LABELS[fmt] || fmt.toUpperCase()}
                  </span>
                  <span className="stats-legend-value">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Metadata Coverage ───────────────────────────────────── */}
          <div className="stats-chart-card">
            <h3 className="stats-chart-title">Metadata Coverage</h3>
            <div className="stats-progress-group">
              <div className="stats-progress-row">
                <span>Schemed</span>
                <div className="stats-progress-track">
                  <div
                    className="stats-progress-fill"
                    style={{
                      width: `${stats.totalStrata > 0 ? (stats.withScheme / stats.totalStrata) * 100 : 0}%`,
                    }}
                  ></div>
                </div>
                <span className="stats-progress-val">{stats.withScheme}</span>
              </div>
              <div className="stats-progress-row">
                <span>Feature Tags</span>
                <div className="stats-progress-track">
                  <div
                    className="stats-progress-fill"
                    style={{
                      width: `${stats.totalStrata > 0 ? Math.min(100, (stats.fbStats.catCount / stats.totalStrata) * 100) : 0}%`,
                    }}
                  ></div>
                </div>
                <span className="stats-progress-val">
                  {stats.fbStats.catCount}
                </span>
              </div>
              <div className="stats-progress-row">
                <span>No Scheme</span>
                <div className="stats-progress-track">
                  <div
                    className="stats-progress-fill stats-progress-fill--dim"
                    style={{
                      width: `${stats.totalStrata > 0 ? (stats.withoutScheme / stats.totalStrata) * 100 : 0}%`,
                    }}
                  ></div>
                </div>
                <span className="stats-progress-val">
                  {stats.withoutScheme}
                </span>
              </div>
            </div>

            {/* Activity Sparkline/Bars */}
            <h3 className="stats-chart-title" style={{ marginTop: 20 }}>
              Activity (6mo)
            </h3>
            <div className="stats-activity">
              {stats.months.map((m) => (
                <div key={m.key} className="stats-activity__month">
                  <div className="stats-activity__bar-wrap">
                    <div
                      className="stats-activity__bar"
                      style={{
                        height: `${(m.count / maxMonthCount) * 100}%`,
                      }}
                      title={`${m.count} archives`}
                    />
                  </div>
                  <span className="stats-activity__label">
                    {m.label.split(" ")[0]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Feature Memory ─────────────────────────────────────────── */}
        <div className="stats-section">
          <h2 className="stats-section-title">Feature Memory</h2>
          <div className="stats-highlight-grid">
            <div className="stats-highlight-card">
              <h4>Field Values</h4>
              <p>{stats.fbStats.totalValues}</p>
            </div>
            <div className="stats-highlight-card">
              <h4>Tags Defined</h4>
              <p>{stats.fbStats.catCount}</p>
            </div>
            <div className="stats-highlight-card">
              <h4>Fields Tracked</h4>
              <p>{stats.fbStats.fieldCount}</p>
            </div>
          </div>
        </div>

        {/* ── Scheme Usage List ─────────────────────────────────────── */}
        {stats.schemeRanking.length > 0 && (
          <div className="stats-section">
            <h2 className="stats-section-title">Scheme Usage</h2>
            <div className="stats-scheme-list">
              {stats.schemeRanking.slice(0, 5).map(({ id, count, scheme }) => (
                <div key={id} className="stats-scheme-row">
                  <span className="stats-scheme-name">
                    {scheme?.name || "Unknown"}
                    {scheme?.isBuiltIn && (
                      <span className="stats-scheme-badge">built-in</span>
                    )}
                  </span>
                  <div className="stats-scheme-bar-bg">
                    <div
                      className="stats-scheme-bar-fill"
                      style={{ width: `${(count / stats.totalStrata) * 100}%` }}
                    ></div>
                  </div>
                  <span className="stats-scheme-count">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No data state */}
        {strata.length === 0 && (
          <div className="stats-empty">
            <p>
              No archives in your collection yet. Create your first .stratum to
              see statistics here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
