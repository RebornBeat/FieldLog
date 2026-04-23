import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../src/context/AppContext';
import { Colors, Radius, Spacing, Fonts } from '../src/constants/colors';
import { FORMAT_LABELS } from '../src/constants';
import { suggestArchiveName, emptyMetadata, emptyProvenance, formatFileSize } from '../src/utils/stratumFormat';
import { FieldInput, Button, FieldSelect, Badge } from '../src/components/common/UI';

export default function NewStratumModal() {
  const insets = useSafeAreaInsets();
  const { state, createStratum } = useApp();
  const { schemeBank } = state;

  const [sourceFile,   setSourceFile]   = useState(null);   // { uri, name, size }
  const [archiveName,  setArchiveName]  = useState('');
  const [description,  setDescription] = useState('');
  const [selectedSchemeId, setSelectedScheme] = useState('');
  const [creating,     setCreating]     = useState(false);
  const [nameError,    setNameError]    = useState('');

  // Format detection
  const ext          = sourceFile?.name?.split('.').pop()?.toLowerCase() || '';
  const fmtLabel     = FORMAT_LABELS[ext] || (ext ? ext.toUpperCase() : null);

  // Scheme suggestions based on format
  const schemeSuggestions = schemeBank.filter(sc =>
    sc.forFormats && (sc.forFormats.includes(ext) || sc.forFormats.includes('*'))
  ).slice(0, 3);

  useEffect(() => {
    if (schemeSuggestions.length > 0 && !selectedSchemeId) {
      setSelectedScheme(schemeSuggestions[0].id);
    }
  }, [ext]);

  const handlePickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    setSourceFile({ uri: asset.uri, name: asset.name, size: asset.size });
    if (!archiveName) setArchiveName(suggestArchiveName(asset.name));
    setNameError('');
  };

  const handleCreate = async () => {
    if (!sourceFile) { Alert.alert('No file', 'Please select a source file first.'); return; }
    if (!archiveName.trim()) { setNameError('Archive name is required'); return; }

    setCreating(true);
    const sc       = schemeBank.find(s => s.id === selectedSchemeId) || null;
    const metadata = emptyMetadata(sc);
    const result   = await createStratum({
      sourceFileUri: sourceFile.uri,
      archiveName:   archiveName.trim(),
      metadata,
      provenance:    emptyProvenance(),
      tags:          [],
      appliedSchemeId: selectedSchemeId || null,
    });
    setCreating(false);

    if (result) {
      router.back();
      // Navigate to the new stratum for editing
      setTimeout(() => {
        router.push(`/stratum/${encodeURIComponent(result.fileUri)}`);
      }, 300);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.bg.surface }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View>
          <Text style={styles.title}>New Archive</Text>
          <Text style={styles.subtitle}>Create a .stratum from any file</Text>
        </View>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Ionicons name="close" size={20} color={Colors.text.muted} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 20 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* File picker */}
        <TouchableOpacity style={styles.filePicker} onPress={handlePickFile} activeOpacity={0.75}>
          {!sourceFile ? (
            <>
              <Ionicons name="cloud-upload-outline" size={32} color={Colors.text.faint} />
              <Text style={styles.filePickerLabel}>Tap to select a source file</Text>
              <Text style={styles.filePickerHint}>Any file type accepted</Text>
            </>
          ) : (
            <View style={styles.fileSelected}>
              <Ionicons name="document-outline" size={22} color={Colors.amber.base} />
              <View style={{ flex: 1 }}>
                <Text style={styles.fileSelectedName} numberOfLines={1}>{sourceFile.name}</Text>
                <View style={styles.fileSelectedMeta}>
                  {fmtLabel && <Badge label={fmtLabel} />}
                  {sourceFile.size && <Text style={styles.fileSelectedSize}>{formatFileSize(sourceFile.size)}</Text>}
                </View>
              </View>
              <TouchableOpacity onPress={handlePickFile} style={styles.changeFileBtn}>
                <Text style={styles.changeFileBtnText}>Change</Text>
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>

        {/* Archive name */}
        <FieldInput
          label="Archive Name"
          value={archiveName}
          onChangeText={v => { setArchiveName(v); setNameError(''); }}
          placeholder="e.g. SRR12345 MinION Run"
          required
        />
        {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}

        <FieldInput
          label="Description (optional)"
          value={description}
          onChangeText={setDescription}
          placeholder="What is this file?"
          multiline
          numberOfLines={2}
        />

        {/* Scheme selection */}
        <View style={styles.schemeSection}>
          <Text style={styles.schemeSectionLabel}>Apply Scheme (optional)</Text>

          {schemeSuggestions.length > 0 && (
            <View style={styles.suggestions}>
              <Text style={styles.suggestionsLabel}>
                {fmtLabel ? `Suggested for ${fmtLabel}:` : 'Recently used:'}
              </Text>
              {schemeSuggestions.map(sc => (
                <TouchableOpacity
                  key={sc.id}
                  style={[styles.schemeSugg, selectedSchemeId === sc.id && styles.schemeSuggActive]}
                  onPress={() => setSelectedScheme(selectedSchemeId === sc.id ? '' : sc.id)}
                >
                  <Text style={[styles.schemeSuggText, selectedSchemeId === sc.id && styles.schemeSuggTextActive]}>
                    {sc.name}
                  </Text>
                  {sc.isBuiltIn && <Badge label="built-in" variant="amber" style={{ marginLeft: 4 }} />}
                </TouchableOpacity>
              ))}
            </View>
          )}

          <FieldSelect
            value={selectedSchemeId}
            onValueChange={setSelectedScheme}
            options={[
              { value: '', label: '— No scheme —' },
              ...schemeBank.map(s => ({ value: s.id, label: `${s.name}${s.isBuiltIn ? ' ★' : ''}` })),
            ]}
            placeholder="Browse all schemes…"
          />
        </View>

        {/* Notice */}
        <View style={styles.notice}>
          <Ionicons name="shield-checkmark-outline" size={13} color={Colors.amber.dim} />
          <Text style={styles.noticeText}>
            Your original file is copied into the archive. The copy at its current location remains untouched. Everything stays on your device.
          </Text>
        </View>

        {/* Create button */}
        <Button
          label={creating ? 'Creating…' : 'Create .stratum'}
          onPress={handleCreate}
          loading={creating}
          disabled={!sourceFile || creating}
          size="lg"
          style={{ marginTop: 8 }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection:'row', alignItems:'flex-start', justifyContent:'space-between', padding:16, borderBottomWidth:1, borderBottomColor:Colors.border.dim },
  title: { fontFamily:Fonts.display, fontSize:20, fontWeight:'700', color:Colors.text.bright, fontStyle:'italic' },
  subtitle: { fontSize:12.5, color:Colors.text.muted, marginTop:2 },
  closeBtn: { width:32, height:32, alignItems:'center', justifyContent:'center', borderRadius:Radius.md, backgroundColor:Colors.bg.elevated },
  body: { padding:16, gap:0 },

  // File picker
  filePicker: { alignItems:'center', justifyContent:'center', gap:8, minHeight:100, borderWidth:2, borderColor:Colors.border.subtle, borderStyle:'dashed', borderRadius:Radius.lg, padding:20, marginBottom:16, backgroundColor:Colors.bg.overlay },
  filePickerLabel: { fontSize:14, color:Colors.text.secondary },
  filePickerHint: { fontSize:12, color:Colors.text.faint },
  fileSelected: { flexDirection:'row', alignItems:'center', gap:10, width:'100%' },
  fileSelectedName: { fontSize:13, fontWeight:'600', color:Colors.text.bright },
  fileSelectedMeta: { flexDirection:'row', alignItems:'center', gap:6, marginTop:3 },
  fileSelectedSize: { fontFamily:Fonts.mono, fontSize:10, color:Colors.text.faint },
  changeFileBtn: { paddingHorizontal:10, paddingVertical:5, borderRadius:Radius.sm, backgroundColor:Colors.bg.active },
  changeFileBtnText: { fontSize:12, color:Colors.text.secondary },

  errorText: { fontSize:12, color:Colors.dangerBright, marginTop:-10, marginBottom:8 },

  // Scheme section
  schemeSection: { marginBottom:16 },
  schemeSectionLabel: { fontSize:11, fontWeight:'700', color:Colors.text.muted, textTransform:'uppercase', letterSpacing:0.8, marginBottom:10 },
  suggestions: { marginBottom:8 },
  suggestionsLabel: { fontSize:10.5, color:Colors.text.faint, fontWeight:'600', textTransform:'uppercase', letterSpacing:0.6, marginBottom:6 },
  schemeSugg: { flexDirection:'row', alignItems:'center', padding:10, borderWidth:1, borderColor:Colors.border.subtle, borderRadius:Radius.sm, marginBottom:5, backgroundColor:Colors.bg.overlay },
  schemeSuggActive: { backgroundColor:Colors.amber.faint, borderColor:Colors.amber.border },
  schemeSuggText: { fontSize:13, color:Colors.text.secondary, flex:1 },
  schemeSuggTextActive: { color:Colors.amber.base, fontWeight:'600' },

  // Notice
  notice: { flexDirection:'row', alignItems:'flex-start', gap:8, backgroundColor:Colors.bg.overlay, borderLeftWidth:2, borderLeftColor:Colors.amber.dim, borderRadius:Radius.sm, padding:10, marginBottom:12 },
  noticeText: { fontSize:11.5, color:Colors.text.muted, lineHeight:16, flex:1 },
});
