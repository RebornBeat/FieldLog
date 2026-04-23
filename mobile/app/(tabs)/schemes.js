import React, { useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Alert, ScrollView, TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../src/context/AppContext';
import { Colors, Radius, Fonts, Spacing } from '../../src/constants/colors';
import { FIELD_TYPES } from '../../src/constants';
import { v4 as uuidv4 } from 'uuid';
import { FieldInput, FieldSelect, ToggleRow, Button, Badge, Divider } from '../../src/components/common/UI';

export default function SchemesScreen() {
  const insets = useSafeAreaInsets();
  const { state, addScheme, updateScheme, deleteScheme } = useApp();
  const [editing, setEditing] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const userSchemes    = state.schemeBank.filter(s => !s.isBuiltIn);
  const builtinSchemes = state.schemeBank.filter(s => s.isBuiltIn);

  const startNew = () => setEditing({ id: uuidv4(), name: '', description: '', fields: [], isBuiltIn: false });

  const duplicate = (scheme) => {
    const s = { ...scheme, id: uuidv4(), name: `${scheme.name} (copy)`, isBuiltIn: false };
    addScheme(s);
    setEditing({ ...s });
  };

  const handleExport = async (scheme) => {
    try {
      const json = JSON.stringify({ metastrata_schema: 'scheme_v1', ...scheme }, null, 2);
      const path = `${FileSystem.cacheDirectory}${scheme.name.replace(/\s+/g,'_')}.metascheme`;
      await FileSystem.writeAsStringAsync(path, json);
      const available = await Sharing.isAvailableAsync();
      if (available) await Sharing.shareAsync(path, { mimeType: 'application/json' });
    } catch (e) {
      Alert.alert('Export failed', e.message);
    }
  };

  const handleImport = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    if (!asset.name?.endsWith('.metascheme')) { Alert.alert('Invalid file', 'Please select a .metascheme file.'); return; }
    try {
      const json = await FileSystem.readAsStringAsync(asset.uri);
      const data = JSON.parse(json);
      const s = {
        ...data,
        id: uuidv4(),
        isBuiltIn: false,
        imported: true,
        // Ensure all fields have key
        fields: (data.fields || []).map((f,i) => ({ ...f, key: f.key || f.id || `field_${i}`, order: f.order ?? i })),
      };
      addScheme(s);
    } catch (e) {
      Alert.alert('Import failed', e.message);
    }
  };

  if (editing) {
    return (
      <SchemeEditorScreen
        scheme={editing}
        onSave={(s) => {
          if (state.schemeBank.find(sc => sc.id === s.id)) updateScheme(s);
          else addScheme(s);
          setEditing(null);
        }}
        onCancel={() => setEditing(null)}
      />
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Scheme Bank</Text>
          <Text style={styles.headerSub}>{userSchemes.length} custom · {builtinSchemes.length} built-in</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleImport} style={styles.iconBtn}>
            <Ionicons name="cloud-download-outline" size={18} color={Colors.text.secondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={startNew} style={[styles.iconBtn, styles.iconBtnPrimary]}>
            <Ionicons name="add" size={20} color={Colors.bg.base} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={[
          ...(userSchemes.length > 0 ? [{ type:'header', title:'Your Schemes' }, ...userSchemes] : []),
          { type:'header', title:'Built-in Starter Schemes', hint:'Duplicate to customise' },
          ...builtinSchemes,
        ]}
        keyExtractor={(item, i) => item.id || `header-${i}`}
        contentContainerStyle={{ padding:12, paddingBottom: insets.bottom + 20 }}
        renderItem={({ item }) => {
          if (item.type === 'header') {
            return (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{item.title}</Text>
                {item.hint && <Text style={styles.sectionHint}>{item.hint}</Text>}
              </View>
            );
          }
          return (
            <SchemeCard
              scheme={item}
              expanded={expandedId === item.id}
              onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
              onEdit={() => setEditing({ ...item })}
              onDuplicate={() => duplicate(item)}
              onDelete={() => {
                Alert.alert('Delete Scheme', `Delete "${item.name}"?`, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: () => deleteScheme(item.id) },
                ]);
              }}
              onExport={() => handleExport(item)}
            />
          );
        }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

function SchemeCard({ scheme, expanded, onToggle, onEdit, onDuplicate, onDelete, onExport }) {
  return (
    <View style={styles.schemeCard}>
      <TouchableOpacity style={styles.schemeCardHeader} onPress={onToggle} activeOpacity={0.7}>
        <View style={styles.schemeCardLeft}>
          <Ionicons name={scheme.isBuiltIn ? 'lock-closed-outline' : 'star-outline'} size={14} color={scheme.isBuiltIn ? Colors.text.faint : Colors.amber.dim} />
          <View>
            <Text style={styles.schemeName}>{scheme.name}</Text>
            {scheme.description ? <Text style={styles.schemeDesc} numberOfLines={1}>{scheme.description}</Text> : null}
          </View>
        </View>
        <View style={styles.schemeCardRight}>
          <Text style={styles.schemeCount}>{scheme.fields.length}</Text>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={Colors.text.faint} />
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.schemeExpanded}>
          {/* Actions */}
          <View style={styles.schemeActions}>
            <TouchableOpacity style={styles.schemAction} onPress={onDuplicate}>
              <Ionicons name="copy-outline" size={14} color={Colors.text.secondary} />
              <Text style={styles.schemActionText}>Duplicate</Text>
            </TouchableOpacity>
            {!scheme.isBuiltIn && (
              <TouchableOpacity style={styles.schemAction} onPress={onEdit}>
                <Ionicons name="pencil-outline" size={14} color={Colors.text.secondary} />
                <Text style={styles.schemActionText}>Edit</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.schemAction} onPress={onExport}>
              <Ionicons name="share-outline" size={14} color={Colors.text.secondary} />
              <Text style={styles.schemActionText}>Export</Text>
            </TouchableOpacity>
            {!scheme.isBuiltIn && (
              <TouchableOpacity style={[styles.schemAction, styles.schemActionDanger]} onPress={onDelete}>
                <Ionicons name="trash-outline" size={14} color={Colors.dangerBright} />
                <Text style={[styles.schemActionText, { color: Colors.dangerBright }]}>Delete</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Fields preview */}
          {scheme.fields.length === 0
            ? <Text style={styles.noFields}>No fields defined.</Text>
            : scheme.fields.map(f => (
                <View key={f.id} style={styles.fieldPreview}>
                  <Text style={styles.fieldPreviewLabel}>{f.label}</Text>
                  <Badge label={f.type} variant="amber" />
                  {f.required && <Badge label="req" variant="amber" />}
                </View>
              ))
          }
        </View>
      )}
    </View>
  );
}

// ── Scheme Editor ─────────────────────────────────────────────────────────────
function SchemeEditorScreen({ scheme: initial, onSave, onCancel }) {
  const insets = useSafeAreaInsets();
  const [scheme, setScheme] = useState(initial);
  const [expandedField, setExpandedField] = useState(null);

  const patch       = (k, v) => setScheme(s => ({ ...s, [k]: v }));
  const addField    = () => {
    const id  = uuidv4();
    const key = `field_${scheme.fields.length + 1}`;
    const f   = { id, key, label:'New Field', type:'text', required:false, placeholder:'', options:[], order: scheme.fields.length };
    setScheme(s => ({ ...s, fields: [...s.fields, f] }));
    setExpandedField(id);
  };
  const patchField  = (id, u) => setScheme(s => ({ ...s, fields: s.fields.map(f => f.id===id ? {...f,...u} : f) }));
  const removeField = (id)    => { setScheme(s => ({ ...s, fields: s.fields.filter(f => f.id!==id) })); if(expandedField===id) setExpandedField(null); };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{scheme.name || 'New Scheme'}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconBtn} onPress={onCancel}><Text style={{ color:Colors.text.secondary, fontSize:13 }}>Cancel</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.iconBtn, styles.iconBtnPrimary]} onPress={() => onSave(scheme)}>
            <Text style={{ color:Colors.bg.base, fontSize:13, fontWeight:'700' }}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={{ flex:1 }}
        contentContainerStyle={{ padding:16, paddingBottom: insets.bottom + 20 }}
        keyboardShouldPersistTaps="handled"
      >
        <FieldInput label="Scheme Name" value={scheme.name} onChangeText={v => patch('name', v)} required />
        <FieldInput label="Description" value={scheme.description||''} onChangeText={v => patch('description',v)} multiline numberOfLines={2} />

        <View style={styles.fieldsSectionHeader}>
          <Text style={styles.fieldsSectionTitle}>Fields ({scheme.fields.length})</Text>
          <TouchableOpacity style={styles.addFieldBtn} onPress={addField}>
            <Ionicons name="add" size={14} color={Colors.amber.base} />
            <Text style={styles.addFieldText}>Add Field</Text>
          </TouchableOpacity>
        </View>

        {scheme.fields.length === 0 && (
          <View style={styles.noFieldsBox}>
            <Text style={styles.noFieldsText}>No fields yet. Tap "Add Field" above.</Text>
          </View>
        )}

        {[...scheme.fields].sort((a,b)=>a.order-b.order).map((field, idx) => (
          <View key={field.id} style={styles.editField}>
            <TouchableOpacity style={styles.editFieldHeader} onPress={() => setExpandedField(expandedField===field.id?null:field.id)}>
              <Ionicons name="reorder-three-outline" size={18} color={Colors.text.faint} />
              <Text style={styles.editFieldName}>{field.label || 'Unnamed'}</Text>
              <Badge label={field.type} />
              {field.required && <Badge label="req" variant="green" />}
              <TouchableOpacity onPress={() => removeField(field.id)} hitSlop={{top:8,bottom:8,left:8,right:8}}>
                <Ionicons name="trash-outline" size={14} color={Colors.dangerBright} />
              </TouchableOpacity>
              <Ionicons name={expandedField===field.id?'chevron-up':'chevron-down'} size={14} color={Colors.text.faint} />
            </TouchableOpacity>

            {expandedField===field.id && (
              <View style={styles.editFieldBody}>
                <FieldInput label="Label" value={field.label} onChangeText={v => { patchField(field.id,{label:v, key:v.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'')||field.key}); }} />
                <FieldSelect label="Type" value={field.type} onValueChange={v=>patchField(field.id,{type:v})} options={FIELD_TYPES} />
                <FieldInput label="Placeholder" value={field.placeholder||''} onChangeText={v=>patchField(field.id,{placeholder:v})} />
                {field.type==='select' && (
                  <FieldInput label="Options (one per line)" value={(field.options||[]).join('\n')} onChangeText={v=>patchField(field.id,{options:v.split('\n').map(s=>s.trim()).filter(Boolean)})} multiline numberOfLines={4} />
                )}
                <ToggleRow label="Required field" value={field.required} onValueChange={v=>patchField(field.id,{required:v})} />
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex:1, backgroundColor:Colors.bg.base },
  header:      { flexDirection:'row', alignItems:'center', justifyContent:'space-between', padding:16, borderBottomWidth:1, borderBottomColor:Colors.border.dim },
  headerTitle: { fontFamily:Fonts.display, fontSize:20, fontWeight:'700', color:Colors.text.bright, fontStyle:'italic' },
  headerSub:   { fontSize:11.5, color:Colors.text.muted, marginTop:2 },
  headerActions: { flexDirection:'row', gap:8 },
  iconBtn:        { height:34, paddingHorizontal:12, borderRadius:Radius.md, alignItems:'center', justifyContent:'center', backgroundColor:Colors.bg.elevated, borderWidth:1, borderColor:Colors.border.subtle },
  iconBtnPrimary: { backgroundColor:Colors.amber.base, borderColor:Colors.amber.base },

  sectionHeader: { paddingTop:16, paddingBottom:8 },
  sectionTitle: { fontSize:10.5, fontWeight:'700', color:Colors.text.faint, textTransform:'uppercase', letterSpacing:1 },
  sectionHint:  { fontSize:10.5, color:Colors.text.faint, marginTop:2 },

  schemeCard: { backgroundColor:Colors.bg.surface, borderWidth:1, borderColor:Colors.border.dim, borderRadius:Radius.lg, marginBottom:8, overflow:'hidden' },
  schemeCardHeader: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', padding:12 },
  schemeCardLeft: { flexDirection:'row', alignItems:'center', gap:8, flex:1, minWidth:0 },
  schemeName: { fontSize:14, fontWeight:'600', color:Colors.text.primary },
  schemeDesc: { fontSize:11.5, color:Colors.text.muted, marginTop:1 },
  schemeCardRight: { flexDirection:'row', alignItems:'center', gap:6 },
  schemeCount: { fontFamily:Fonts.mono, fontSize:11, color:Colors.text.faint },

  schemeExpanded: { borderTopWidth:1, borderTopColor:Colors.border.dim, padding:12 },
  schemeActions:  { flexDirection:'row', flexWrap:'wrap', gap:6, marginBottom:10 },
  schemAction:        { flexDirection:'row', alignItems:'center', gap:4, paddingHorizontal:8, paddingVertical:5, backgroundColor:Colors.bg.elevated, borderRadius:Radius.sm, borderWidth:1, borderColor:Colors.border.subtle },
  schemActionText:    { fontSize:12, color:Colors.text.secondary },
  schemActionDanger:  { borderColor:'rgba(146,64,64,0.3)', backgroundColor:Colors.dangerFaint },
  noFields:           { fontSize:12.5, color:Colors.text.faint, fontStyle:'italic' },
  fieldPreview:       { flexDirection:'row', alignItems:'center', gap:6, paddingVertical:5, borderBottomWidth:1, borderBottomColor:Colors.border.faint },
  fieldPreviewLabel:  { fontSize:12.5, color:Colors.text.secondary, flex:1 },

  // Editor
  fieldsSectionHeader: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:8, marginTop:4 },
  fieldsSectionTitle:  { fontSize:12, fontWeight:'700', color:Colors.text.secondary, textTransform:'uppercase', letterSpacing:0.8 },
  addFieldBtn:         { flexDirection:'row', alignItems:'center', gap:4, paddingHorizontal:10, paddingVertical:5, backgroundColor:Colors.amber.faint, borderRadius:Radius.sm, borderWidth:1, borderColor:Colors.amber.border },
  addFieldText:        { fontSize:12, color:Colors.amber.base, fontWeight:'600' },
  noFieldsBox:         { padding:16, backgroundColor:Colors.bg.overlay, borderRadius:Radius.md, borderWidth:1, borderStyle:'dashed', borderColor:Colors.border.subtle, alignItems:'center', marginBottom:12 },
  noFieldsText:        { fontSize:12.5, color:Colors.text.faint, fontStyle:'italic' },

  editField: { backgroundColor:Colors.bg.overlay, borderWidth:1, borderColor:Colors.border.dim, borderRadius:Radius.md, marginBottom:8, overflow:'hidden' },
  editFieldHeader: { flexDirection:'row', alignItems:'center', gap:8, padding:12 },
  editFieldName: { flex:1, fontSize:13.5, color:Colors.text.primary, fontWeight:'500' },
  editFieldBody: { borderTopWidth:1, borderTopColor:Colors.border.dim, padding:12 },
});
