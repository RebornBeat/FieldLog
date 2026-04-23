import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  TextInput, RefreshControl, Platform, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../src/context/AppContext';
import { Colors, Radius, Spacing, Fonts } from '../../src/constants/colors';
import { FORMAT_LABELS } from '../../src/constants';
import { formatFileSize } from '../../src/utils/stratumFormat';
import { Badge, EmptyState, Button, LoadingScreen } from '../../src/components/common/UI';

function StratumCard({ item, index, onPress, onLongPress }) {
  const m    = item.manifest || {};
  const name = m.archive_name || item.filename?.replace('.stratum', '') || `Archive ${index + 1}`;
  const fmt  = m.source_format ? (FORMAT_LABELS[m.source_format] || m.source_format.toUpperCase()) : '?';
  const date = m.updated_at ? new Date(m.updated_at).toLocaleDateString() : '—';
  const size = formatFileSize(m.source_size_bytes);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.75}
    >
      {/* Top accent bar */}
      <View style={styles.cardAccentBar} />

      <View style={styles.cardHeader}>
        <View style={styles.fmtBadge}>
          <Text style={styles.fmtText}>{fmt}</Text>
        </View>
        <Text style={styles.cardIndex}>#{index + 1}</Text>
      </View>

      <Text style={styles.cardName} numberOfLines={2}>{name}</Text>
      <Text style={styles.cardFile} numberOfLines={1}>{m.source_filename || '—'}</Text>

      <View style={styles.cardFooter}>
        <Text style={styles.cardMeta}>{size}</Text>
        <Text style={styles.cardMeta}>{date}</Text>
      </View>

      {m.applied_scheme_id && (
        <View style={styles.schemeDot} />
      )}
    </TouchableOpacity>
  );
}

export default function CollectionScreen() {
  const insets = useSafeAreaInsets();
  const { state, dispatch, filteredStrata, rescan, importStratum } = useApp();
  const { searchQuery, loadingStrata, booted } = state;
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await rescan();
    setRefreshing(false);
  }, [rescan]);

  const handleOpenStratum = useCallback(async (item) => {
    router.push(`/stratum/${encodeURIComponent(item.fileUri)}`);
  }, []);

  const handleLongPress = useCallback((item) => {
    Alert.alert(
      item.manifest?.archive_name || item.filename,
      item.manifest?.source_filename || '',
      [
        { text: 'Open', onPress: () => handleOpenStratum(item) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }, [handleOpenStratum]);

  const handleImport = useCallback(async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    if (!asset.uri.endsWith('.stratum') && !asset.name?.endsWith('.stratum')) {
      Alert.alert('Invalid file', 'Please select a .stratum file.');
      return;
    }
    await importStratum(asset.uri);
  }, [importStratum]);

  if (!booted) return <LoadingScreen message="Loading collection…" />;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <StratumMark />
          <Text style={styles.headerTitle}>MetaStrata</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={handleImport}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="folder-open-outline" size={20} color={Colors.text.secondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerBtn, styles.headerBtnPrimary]}
            onPress={() => router.push('/new-stratum')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="add" size={22} color={Colors.bg.base} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={15} color={Colors.text.faint} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={t => dispatch({ type: 'SET_SEARCH', payload: t })}
            placeholder="Search archives…"
            placeholderTextColor={Colors.text.faint}
            clearButtonMode="while-editing"
            keyboardAppearance="dark"
          />
        </View>
      </View>

      {/* Count */}
      <View style={styles.countRow}>
        <Text style={styles.countText}>
          {filteredStrata.length} archive{filteredStrata.length !== 1 ? 's' : ''}
          {searchQuery ? ' found' : ' in collection'}
        </Text>
      </View>

      {/* Grid */}
      {loadingStrata && filteredStrata.length === 0 ? (
        <LoadingScreen message="Scanning collection…" />
      ) : filteredStrata.length === 0 ? (
        <EmptyState
          icon={searchQuery ? '🔍' : '📂'}
          title={searchQuery ? 'No results' : 'No archives yet'}
          subtitle={
            searchQuery
              ? `Nothing matching "${searchQuery}"`
              : 'Tap + to create your first .stratum archive, or import an existing one.'
          }
          action={
            !searchQuery && (
              <Button
                label="New Archive"
                onPress={() => router.push('/new-stratum')}
                style={{ marginTop: 8 }}
              />
            )
          }
        />
      ) : (
        <FlatList
          data={filteredStrata}
          keyExtractor={item => item.fileUri}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={[styles.gridContent, { paddingBottom: insets.bottom + 20 }]}
          renderItem={({ item, index }) => (
            <StratumCard
              item={item}
              index={index}
              onPress={() => handleOpenStratum(item)}
              onLongPress={() => handleLongPress(item)}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.amber.base}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

function StratumMark() {
  return (
    <View style={styles.stratumMark}>
      {[1, 0.7, 0.4].map((op, i) => (
        <View
          key={i}
          style={[
            styles.stratumBar,
            { opacity: op, height: 5 - i, marginBottom: i < 2 ? 2 : 0 },
          ]}
        />
      ))}
    </View>
  );
}

const CARD_W = '48%';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.base },

  // Header
  header:           { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingVertical:12, borderBottomWidth:1, borderBottomColor:Colors.border.dim },
  headerLeft:       { flexDirection:'row', alignItems:'center', gap:8 },
  headerTitle:      { fontFamily:Fonts.display, fontSize:18, fontWeight:'700', color:Colors.amber.bright, fontStyle:'italic' },
  headerActions:    { flexDirection:'row', alignItems:'center', gap:8 },
  headerBtn:        { width:34, height:34, borderRadius:Radius.md, alignItems:'center', justifyContent:'center', backgroundColor:Colors.bg.elevated, borderWidth:1, borderColor:Colors.border.subtle },
  headerBtnPrimary: { backgroundColor:Colors.amber.base, borderColor:Colors.amber.base },

  // Stratum mark
  stratumMark: { width:20, justifyContent:'center' },
  stratumBar:  { width:20, backgroundColor:Colors.amber.base, borderRadius:1.5 },

  // Search
  searchRow:  { paddingHorizontal:16, paddingVertical:10 },
  searchWrap: { flexDirection:'row', alignItems:'center', backgroundColor:Colors.bg.overlay, borderWidth:1, borderColor:Colors.border.subtle, borderRadius:Radius.md, height:38 },
  searchIcon: { marginLeft:10 },
  searchInput:{ flex:1, color:Colors.text.primary, fontSize:14, paddingHorizontal:8 },

  // Count
  countRow:  { paddingHorizontal:16, paddingBottom:6 },
  countText: { fontSize:11, color:Colors.text.faint, fontWeight:'600', textTransform:'uppercase', letterSpacing:0.8 },

  // Grid
  gridContent: { paddingHorizontal:12, paddingTop:4 },
  gridRow:     { justifyContent:'space-between', marginBottom:10 },

  // Card
  card: {
    width:           CARD_W,
    backgroundColor: Colors.bg.surface,
    borderRadius:    Radius.md,
    borderWidth:     1,
    borderColor:     Colors.border.dim,
    padding:         12,
    overflow:        'hidden',
    position:        'relative',
    minHeight:       130,
  },
  cardAccentBar: { position:'absolute', top:0, left:0, right:0, height:2, backgroundColor:Colors.amber.base, opacity:0 },
  cardHeader:    { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:8 },
  fmtBadge:      { backgroundColor:Colors.amber.faint, borderWidth:1, borderColor:Colors.amber.border, borderRadius:Radius.xs, paddingHorizontal:5, paddingVertical:2 },
  fmtText:       { fontFamily:Fonts.mono, fontSize:9, fontWeight:'700', color:Colors.amber.base, letterSpacing:0.5 },
  cardIndex:     { fontFamily:Fonts.mono, fontSize:10, color:Colors.text.faint },
  cardName:      { fontSize:13, fontWeight:'600', color:Colors.text.bright, lineHeight:18, marginBottom:3 },
  cardFile:      { fontFamily:Fonts.mono, fontSize:10, color:Colors.text.faint, marginBottom:8 },
  cardFooter:    { flexDirection:'row', justifyContent:'space-between', marginTop:'auto', paddingTop:6, borderTopWidth:1, borderTopColor:Colors.border.faint },
  cardMeta:      { fontFamily:Fonts.mono, fontSize:9.5, color:Colors.text.faint },
  schemeDot:     { position:'absolute', top:8, right:8, width:6, height:6, borderRadius:3, backgroundColor:Colors.success },
});
