import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert, Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../src/context/AppContext';
import { Colors, Radius, Spacing, Fonts } from '../../src/constants/colors';
import { FORMAT_LABELS, PROVENANCE_FIELDS } from '../../src/constants';
import { formatFileSize, emptyMetadata } from '../../src/utils/stratumFormat';
import { suggestFieldValues, suggestCategories } from '../../src/utils/featureBank';
import {
  FieldInput, FieldSelect, TagsInput, ToggleRow,
  Button, Badge, Divider, SectionHeader, LoadingScreen, Caption,
} from '../../src/components/common/UI';

const TABS = [
  { id:'metadata',   label:'Metadata',   icon:'document-text-outline' },
  { id:'provenance', label:'Provenance', icon:'location-outline' },
  { id:'tags',       label:'Tags',       icon:'pricetag-outline' },
];

export default function StratumDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id }  = useLocalSearchParams();
  const fileUri = id ? decodeURIComponent(id) : null;

  const {
    state, dispatch,
    openStratum: openStratumFn, saveOpenStratum, deleteStratum,
    applySchemeToOpenStratum,
  } = useApp();

  const { openStratum, openStratumUri, schemeBank, featureBank } = state;
  const [loading,    setLoading]    = useState(true);
  const [activeTab,  setActiveTab]  = useState('metadata');
  const saveTimerRef = useRef(null);

  // Load stratum on mount
  useEffect(() => {
    if (!fileUri) return;
    (async () => {
      setLoading(true);
      await openStratumFn(fileUri);
      setLoading(false);
    })();
    return () => { clearTimeout(saveTimerRef.current); };
  }, [fileUri]);

  // Auto-save on unmount if dirty
  useEffect(() => {
    return () => {
      if (state.openStratum?.isDirty) saveOpenStratum();
    };
  }, [state.openStratum?.isDirty]);

  const handleMetaChange = useCallback((key, val) => {
    if (!key) return;
    dispatch({ type:'UPDATE_META', payload:{ [key]: val } });
    // Debounced auto-save
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveOpenStratum(), 2000);
  }, [dispatch, saveOpenStratum]);

  const handleProvChange = useCallback((key, val) => {
    dispatch({ type:'UPDATE_PROV', payload:{ [key]: val } });
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveOpenStratum(), 2000);
  }, [dispatch, saveOpenStratum]);

  const handleTagsChange = useCallback((tags) => {
    dispatch({ type:'UPDATE_TAGS', payload: tags });
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveOpenStratum(), 2000);
  }, [dispatch, saveOpenStratum]);

  const handleSchemeChange = useCallback((schemeId) => {
    applySchemeToOpenStratum(schemeId || null);
  }, [applySchemeToOpenStratum]);

  const handleSave = useCallback(async () => {
    clearTimeout(saveTimerRef.current);
    await saveOpenStratum();
  }, [saveOpenStratum]);

  const handleShare = useCallback(async () => {
    if (!fileUri) return;
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/octet-stream',
        dialogTitle: 'Share .stratum archive',
      });
    }
  }, [fileUri]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Delete Archive',
      'Delete this .stratum archive? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteStratum(fileUri);
            router.back();
          },
        },
      ]
    );
  }, [fileUri, deleteStratum]);

  if (loading) return <LoadingScreen message="Opening archive…" />;
  if (!openStratum) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.backRow} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={Colors.text.secondary} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <View style={styles.errorState}>
          <Text style={styles.errorText}>Could not open this archive.</Text>
        </View>
      </View>
    );
  }

  const m             = openStratum.manifest || {};
  const appliedScheme = schemeBank.find(sc => sc.id === m.applied_scheme_id) || null;
  const displayName   = m.archive_name || fileUri?.split('/').pop()?.replace('.stratum', '') || '—';
  const fmt           = m.source_format ? (FORMAT_LABELS[m.source_format] || m.source_format.toUpperCase()) : '?';

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.bg.base }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => { handleSave(); router.back(); }} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color={Colors.text.secondary} />
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <Text style={styles.headerName} numberOfLines={1}>{displayName}</Text>
          <View style={styles.headerMeta}>
            <View style={styles.fmtBadge}><Text style={styles.fmtText}>{fmt}</Text></View>
            <Text style={styles.headerFile} numberOfLines={1}>{m.source_filename}</Text>
            <Text style={styles.headerSize}>{formatFileSize(m.source_size_bytes)}</Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          {openStratum.isDirty && (
            <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
              <Text style={styles.saveBtnText}>Save</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleShare} style={styles.iconBtn}>
            <Ionicons name="share-outline" size={18} color={Colors.text.secondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={styles.iconBtn}>
            <Ionicons name="trash-outline" size={18} color={Colors.dangerBright} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Scheme selector */}
      <View style={styles.schemeRow}>
        <Ionicons name="book-outline" size={13} color={Colors.text.muted} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
          <View style={styles.schemeOptions}>
            <TouchableOpacity
              style={[styles.schemeChip, !m.applied_scheme_id && styles.schemeChipActive]}
              onPress={() => handleSchemeChange(null)}
            >
              <Text style={[styles.schemeChipText, !m.applied_scheme_id && styles.schemeChipTextActive]}>
                None
              </Text>
            </TouchableOpacity>
            {schemeBank.map(sc => (
              <TouchableOpacity
                key={sc.id}
                style={[styles.schemeChip, m.applied_scheme_id === sc.id && styles.schemeChipActive]}
                onPress={() => handleSchemeChange(sc.id)}
              >
                <Text style={[styles.schemeChipText, m.applied_scheme_id === sc.id && styles.schemeChipTextActive]}>
                  {sc.name}
                  {sc.isBuiltIn ? ' ★' : ''}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Ionicons
              name={tab.icon}
              size={14}
              color={activeTab === tab.id ? Colors.amber.base : Colors.text.muted}
            />
            <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab content */}
      <ScrollView
        style={styles.body}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 20 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'metadata' && (
          <MetadataTab
            scheme={appliedScheme}
            metadata={openStratum.metadata || {}}
            featureBank={featureBank}
            onChange={handleMetaChange}
          />
        )}
        {activeTab === 'provenance' && (
          <ProvenanceTab
            provenance={openStratum.provenance || {}}
            onChange={handleProvChange}
          />
        )}
        {activeTab === 'tags' && (
          <TagsTab
            tags={openStratum.tags?.feature_tags || []}
            featureBank={featureBank}
            onChange={handleTagsChange}
          />
        )}
      </ScrollView>

      {/* Footer: manifest info */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        {m.source_sha256 && (
          <Text style={styles.footerText}>SHA-256: {m.source_sha256.slice(0,12)}…</Text>
        )}
        <Text style={styles.footerText}>
          {m.created_at ? `Created ${new Date(m.created_at).toLocaleDateString()}` : ''}
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

// ── MetadataTab ───────────────────────────────────────────────────────────────
function MetadataTab({ scheme, metadata, featureBank, onChange }) {
  if (!scheme || !scheme.fields.length) {
    return (
      <View style={styles.emptyTab}>
        <Ionicons name="book-outline" size={28} color={Colors.text.faint} />
        <Text style={styles.emptyTabTitle}>No scheme applied</Text>
        <Text style={styles.emptyTabSub}>
          Select a scheme from the bar above to add structured metadata fields.
        </Text>
      </View>
    );
  }

  return (
    <View>
      {[...scheme.fields].sort((a,b) => a.order - b.order).map(field => {
        if (!field.key) return null;
        return (
          <MetadataField
            key={field.id}
            field={field}
            value={metadata[field.key]}
            featureBank={featureBank}
            onChange={val => onChange(field.key, val)}
          />
        );
      })}
    </View>
  );
}

function MetadataField({ field, value, featureBank, onChange }) {
  const strVal     = typeof value === 'string' ? value : '';
  const suggestions = suggestFieldValues(featureBank, field.key, strVal);

  if (field.type === 'select') {
    return (
      <FieldSelect
        label={field.label}
        value={strVal}
        onValueChange={onChange}
        options={(field.options || []).map(o => ({ value: o, label: o }))}
        placeholder={`Select ${field.label}…`}
        required={field.required}
      />
    );
  }
  if (field.type === 'tags') {
    return (
      <TagsInput
        label={field.label}
        value={Array.isArray(value) ? value : []}
        onChange={onChange}
      />
    );
  }
  if (field.type === 'boolean') {
    return <ToggleRow label={field.label} value={!!value} onValueChange={onChange} />;
  }
  if (field.type === 'textarea') {
    return (
      <FieldInput
        label={field.label}
        value={strVal}
        onChangeText={onChange}
        placeholder={field.placeholder}
        multiline
        numberOfLines={4}
        required={field.required}
      />
    );
  }

  // Text / number / date / url / gps — all as text input with suggestions
  return (
    <FieldInputWithSuggestions
      label={field.label}
      value={strVal}
      onChange={onChange}
      placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}…`}
      suggestions={suggestions}
      type={field.type === 'number' ? 'number' : 'default'}
      required={field.required}
    />
  );
}

function FieldInputWithSuggestions({ label, value, onChange, placeholder, suggestions, type, required }) {
  const [showSugg, setShowSugg] = useState(false);

  return (
    <View style={{ marginBottom: 14 }}>
      {label && <Text style={styles.fieldLabel}>{label}{required && <Text style={{ color: Colors.amber.base }}> *</Text>}</Text>}
      <View style={[styles.inputWrap, showSugg && suggestions.length > 0 && styles.inputWrapOpen]}>
        <FieldInput
          value={value}
          onChangeText={v => { onChange(v); setShowSugg(v.length > 0); }}
          placeholder={placeholder}
          type={type}
          style={{ marginBottom: 0 }}
        />
        {showSugg && suggestions.length > 0 && (
          <View style={styles.suggDropdown}>
            {suggestions.map((s, i) => (
              <TouchableOpacity
                key={i}
                style={styles.suggItem}
                onPress={() => { onChange(s); setShowSugg(false); }}
              >
                <Text style={styles.suggText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

// ── ProvenanceTab ─────────────────────────────────────────────────────────────
function ProvenanceTab({ provenance, onChange }) {
  return (
    <View>
      <Text style={styles.sectionNote}>
        Collection context — always stored on every archive, regardless of scheme.
      </Text>
      {PROVENANCE_FIELDS.map(f => {
        const val = provenance[f.key] ?? '';
        return (
          <FieldInput
            key={f.key}
            label={f.label}
            value={val}
            onChangeText={v => onChange(f.key, v)}
            multiline={f.type === 'textarea'}
            numberOfLines={f.type === 'textarea' ? 4 : 1}
            type={f.type === 'number' ? 'number' : f.type === 'date' ? 'default' : 'default'}
            placeholder={f.type === 'date' ? 'YYYY-MM-DD' : undefined}
          />
        );
      })}
    </View>
  );
}

// ── TagsTab ───────────────────────────────────────────────────────────────────
function TagsTab({ tags, featureBank, onChange }) {
  const [newCat, setNewCat] = useState('');
  const [newVal, setNewVal] = useState('');
  const [catSugg, setCatSugg] = useState([]);
  const [valSugg, setValSugg] = useState([]);

  return (
    <View>
      <Text style={styles.sectionNote}>
        Free-form category → value annotations. Stored separately from scheme metadata.
      </Text>

      {tags.length === 0 && (
        <Text style={styles.emptyTags}>No tags yet. Add one below.</Text>
      )}

      {tags.map((t, i) => (
        <View key={i} style={styles.tagRow}>
          <Text style={styles.tagCat}>{t.category}</Text>
          <Ionicons name="arrow-forward" size={12} color={Colors.text.faint} />
          <Text style={styles.tagVal}>{t.value}</Text>
          <TouchableOpacity onPress={() => onChange(tags.filter((_, idx) => idx !== i))} style={styles.tagRemove}>
            <Ionicons name="close" size={14} color={Colors.text.muted} />
          </TouchableOpacity>
        </View>
      ))}

      <View style={styles.tagAddRow}>
        <View style={{ flex: 1 }}>
          <FieldInputWithSuggestions
            label="Category"
            value={newCat}
            onChange={v => { setNewCat(v); setCatSugg(suggestCategories(featureBank, v)); }}
            placeholder="e.g. habitat"
            suggestions={catSugg}
          />
        </View>
        <View style={{ flex: 1 }}>
          <FieldInputWithSuggestions
            label="Value"
            value={newVal}
            onChange={v => { setNewVal(v); setValSugg(suggestFieldValues(featureBank, `tag_${newCat}`, v)); }}
            placeholder="e.g. decaying wood"
            suggestions={valSugg}
          />
        </View>
      </View>
      <Button
        label="Add Tag"
        variant="secondary"
        onPress={() => {
          const c = newCat.trim(); const v = newVal.trim();
          if (!c || !v) return;
          onChange([...tags, { category: c, value: v }]);
          setNewCat(''); setNewVal(''); setCatSugg([]); setValSugg([]);
        }}
        style={{ marginTop: 4 }}
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex:1, backgroundColor:Colors.bg.base },

  header: { flexDirection:'row', alignItems:'center', paddingHorizontal:12, paddingBottom:10, backgroundColor:Colors.bg.base, borderBottomWidth:1, borderBottomColor:Colors.border.dim, gap:8 },
  backBtn: { padding:6, borderRadius:Radius.sm },
  headerInfo: { flex:1, minWidth:0 },
  headerName: { fontFamily:Fonts.display, fontSize:16, fontWeight:'700', color:Colors.text.bright, fontStyle:'italic', marginBottom:2 },
  headerMeta: { flexDirection:'row', alignItems:'center', gap:6 },
  fmtBadge:   { backgroundColor:Colors.amber.faint, borderWidth:1, borderColor:Colors.amber.border, borderRadius:Radius.xs, paddingHorizontal:5, paddingVertical:1 },
  fmtText:    { fontFamily:Fonts.mono, fontSize:9, fontWeight:'700', color:Colors.amber.base },
  headerFile: { fontFamily:Fonts.mono, fontSize:10, color:Colors.text.faint, flex:1 },
  headerSize: { fontFamily:Fonts.mono, fontSize:10, color:Colors.text.faint },
  headerActions: { flexDirection:'row', alignItems:'center', gap:4 },
  saveBtn:     { backgroundColor:Colors.amber.base, borderRadius:Radius.sm, paddingHorizontal:10, paddingVertical:5 },
  saveBtnText: { fontSize:12, fontWeight:'700', color:Colors.bg.base },
  iconBtn:     { width:32, height:32, alignItems:'center', justifyContent:'center', borderRadius:Radius.sm },

  // Scheme selector
  schemeRow: { flexDirection:'row', alignItems:'center', paddingLeft:12, paddingVertical:8, borderBottomWidth:1, borderBottomColor:Colors.border.dim, gap:6 },
  schemeOptions: { flexDirection:'row', gap:6, paddingRight:12 },
  schemeChip: { paddingHorizontal:10, paddingVertical:4, borderRadius:100, backgroundColor:Colors.bg.elevated, borderWidth:1, borderColor:Colors.border.subtle },
  schemeChipActive: { backgroundColor:Colors.amber.faint, borderColor:Colors.amber.border },
  schemeChipText: { fontSize:11.5, color:Colors.text.muted, fontWeight:'500' },
  schemeChipTextActive: { color:Colors.amber.base, fontWeight:'600' },

  // Tabs
  tabs:        { flexDirection:'row', borderBottomWidth:1, borderBottomColor:Colors.border.dim, backgroundColor:Colors.bg.base },
  tab:         { flex:1, flexDirection:'row', alignItems:'center', justifyContent:'center', gap:5, paddingVertical:10, borderBottomWidth:2, borderBottomColor:'transparent' },
  tabActive:   { borderBottomColor:Colors.amber.base },
  tabText:     { fontSize:12.5, color:Colors.text.muted, fontWeight:'500' },
  tabTextActive: { color:Colors.amber.base },

  body: { flex:1 },

  // Footer
  footer: { flexDirection:'row', justifyContent:'space-between', paddingHorizontal:16, paddingTop:6, borderTopWidth:1, borderTopColor:Colors.border.faint, backgroundColor:Colors.bg.void },
  footerText: { fontFamily:Fonts.mono, fontSize:9.5, color:Colors.text.faint },

  // Empty tab
  emptyTab: { alignItems:'center', gap:10, paddingVertical:50 },
  emptyTabTitle: { fontFamily:Fonts.display, fontSize:17, fontWeight:'600', color:Colors.text.secondary, fontStyle:'italic' },
  emptyTabSub: { fontSize:13, color:Colors.text.muted, textAlign:'center', lineHeight:19 },

  // Section note
  sectionNote: { fontSize:12, color:Colors.text.muted, fontStyle:'italic', backgroundColor:Colors.bg.overlay, borderLeftWidth:2, borderLeftColor:Colors.amber.dim, padding:10, borderRadius:Radius.sm, marginBottom:14, lineHeight:17 },

  // Field label
  fieldLabel: { fontSize:11, fontWeight:'700', color:Colors.text.muted, textTransform:'uppercase', letterSpacing:0.8, marginBottom:5 },

  // Suggestions
  inputWrap: { position:'relative' },
  inputWrapOpen: {},
  suggDropdown: { backgroundColor:Colors.bg.elevated, borderWidth:1, borderColor:Colors.border.subtle, borderRadius:Radius.md, marginTop:3, overflow:'hidden', zIndex:999 },
  suggItem: { paddingHorizontal:12, paddingVertical:10, borderBottomWidth:1, borderBottomColor:Colors.border.faint },
  suggText: { fontSize:13, color:Colors.text.secondary },

  // Tags
  emptyTags: { fontSize:12.5, color:Colors.text.faint, fontStyle:'italic', textAlign:'center', padding:16, backgroundColor:Colors.bg.overlay, borderRadius:Radius.md, marginBottom:12 },
  tagRow: { flexDirection:'row', alignItems:'center', gap:8, padding:9, backgroundColor:Colors.bg.surface, borderWidth:1, borderColor:Colors.border.dim, borderRadius:Radius.sm, marginBottom:5 },
  tagCat: { fontSize:12, fontWeight:'600', color:Colors.text.muted },
  tagVal: { fontSize:12.5, color:Colors.text.primary, flex:1 },
  tagRemove: { padding:2 },
  tagAddRow: { flexDirection:'row', gap:10 },

  // Error
  backRow: { flexDirection:'row', alignItems:'center', gap:6, padding:16 },
  backText: { fontSize:14, color:Colors.text.secondary },
  errorState: { flex:1, alignItems:'center', justifyContent:'center' },
  errorText: { fontSize:14, color:Colors.text.muted },
});
