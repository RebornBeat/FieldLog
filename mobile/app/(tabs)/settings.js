import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../src/context/AppContext';
import { Colors, Radius, Fonts, Spacing } from '../../src/constants/colors';
import { APP_VERSION } from '../../src/constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { state, setCollectionDir, rescan, dispatch } = useApp();
  const [scanning, setScanning] = useState(false);

  const handleRescan = async () => {
    setScanning(true);
    await rescan();
    setScanning(false);
  };

  const handleClearFeatureBank = () => {
    Alert.alert(
      'Clear Feature Bank',
      'This will erase all your field value history and suggestions. Your archives are not affected.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            const empty = { fieldValues:{}, categories:[], fieldNames:[] };
            dispatch({ type:'SET_FEATURE_BANK', payload: empty });
            await AsyncStorage.setItem('metastrata_feature_bank', JSON.stringify(empty));
          },
        },
      ]
    );
  };

  const handleClearHistory = () => {
    Alert.alert('Clear History', 'Clear all action history?', [
      { text:'Cancel', style:'cancel' },
      { text:'Clear', style:'destructive', onPress: async () => {
        dispatch({ type:'SET_HISTORY', payload:[] });
        await AsyncStorage.setItem('metastrata_history', JSON.stringify([]));
      }},
    ]);
  };

  const rows = [
    {
      section: 'Collection',
      items: [
        {
          icon: 'folder-outline',
          label: 'Collection Folder',
          value: state.collectionDir?.replace(FileSystem.documentDirectory || '', '~/') || 'Not set',
          onPress: () => {
            Alert.alert(
              'Collection Folder',
              'The collection folder is automatically set to the app documents directory. On iOS and Android, apps have isolated storage. Your archives are at:\n\n' + state.collectionDir,
              [{ text: 'OK' }]
            );
          },
        },
        {
          icon: 'refresh-outline',
          label: 'Rescan Collection',
          value: `${state.strata.length} archives`,
          onPress: handleRescan,
          loading: scanning,
        },
      ],
    },
    {
      section: 'Data',
      items: [
        {
          icon: 'layers-outline',
          label: 'Feature Bank',
          value: `${Object.keys(state.featureBank?.fieldValues || {}).length} fields`,
          onPress: handleClearFeatureBank,
          danger: true,
          dangerLabel: 'Clear',
        },
        {
          icon: 'time-outline',
          label: 'Action History',
          value: `${state.history.length} events`,
          onPress: handleClearHistory,
          danger: true,
          dangerLabel: 'Clear',
        },
      ],
    },
    {
      section: 'About',
      items: [
        {
          icon: 'information-circle-outline',
          label: 'MetaStrata Mobile',
          value: `v${APP_VERSION}`,
        },
        {
          icon: 'code-slash-outline',
          label: 'View on GitHub',
          onPress: () => Linking.openURL('https://github.com/RebornBeat/Metastrata'),
        },
        {
          icon: 'chatbubble-outline',
          label: 'Join Discord',
          onPress: () => Linking.openURL('https://discord.gg/metastrata'),
        },
        {
          icon: 'shield-checkmark-outline',
          label: 'Nagoya Protocol Notice',
          onPress: () => Alert.alert(
            'Nagoya Protocol Notice',
            'MetaStrata is a general-purpose data organization tool. It does not collect, transmit, or process file contents. All archives stay on your device.\n\nUsers who collect biological samples regulated under the Nagoya Protocol are solely responsible for compliance with applicable Access and Benefit-Sharing legislation.\n\nFor more info: cbd.int/abs',
            [{ text: 'Close' }]
          ),
        },
      ],
    },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding:12, paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
      >
        {rows.map(({ section, items }) => (
          <View key={section} style={styles.section}>
            <Text style={styles.sectionTitle}>{section}</Text>
            <View style={styles.sectionCard}>
              {items.map((item, i) => (
                <React.Fragment key={item.label}>
                  <TouchableOpacity
                    style={styles.row}
                    onPress={item.onPress}
                    disabled={!item.onPress}
                    activeOpacity={item.onPress ? 0.7 : 1}
                  >
                    <View style={styles.rowLeft}>
                      <View style={[styles.rowIcon, item.danger && styles.rowIconDanger]}>
                        <Ionicons
                          name={item.loading ? 'sync-outline' : item.icon}
                          size={16}
                          color={item.danger ? Colors.dangerBright : Colors.text.secondary}
                        />
                      </View>
                      <View>
                        <Text style={styles.rowLabel}>{item.label}</Text>
                        {item.value && (
                          <Text style={styles.rowValue} numberOfLines={1}>{item.value}</Text>
                        )}
                      </View>
                    </View>
                    {item.danger && item.dangerLabel ? (
                      <Text style={styles.dangerAction}>{item.dangerLabel}</Text>
                    ) : item.onPress ? (
                      <Ionicons name="chevron-forward" size={14} color={Colors.text.faint} />
                    ) : null}
                  </TouchableOpacity>
                  {i < items.length - 1 && <View style={styles.rowDivider} />}
                </React.Fragment>
              ))}
            </View>
          </View>
        ))}

        {/* Legal footer */}
        <Text style={styles.legal}>
          MetaStrata is free, open-source software released under the MIT License. It does not transmit data, require accounts, or connect to any remote server.
          {'\n\n'}
          © {new Date().getFullYear()} UngatedMinds
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex:1, backgroundColor:Colors.bg.base },
  header:      { padding:16, borderBottomWidth:1, borderBottomColor:Colors.border.dim },
  headerTitle: { fontFamily:Fonts.display, fontSize:20, fontWeight:'700', color:Colors.text.bright, fontStyle:'italic' },

  section:      { marginBottom:16 },
  sectionTitle: { fontSize:10.5, fontWeight:'700', color:Colors.text.faint, textTransform:'uppercase', letterSpacing:1, marginBottom:6, paddingHorizontal:4 },
  sectionCard:  { backgroundColor:Colors.bg.surface, borderRadius:Radius.lg, borderWidth:1, borderColor:Colors.border.dim, overflow:'hidden' },

  row:          { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:14, paddingVertical:12 },
  rowLeft:      { flexDirection:'row', alignItems:'center', gap:10, flex:1, minWidth:0 },
  rowIcon:      { width:30, height:30, borderRadius:Radius.sm, backgroundColor:Colors.bg.elevated, alignItems:'center', justifyContent:'center' },
  rowIconDanger:{ backgroundColor:Colors.dangerFaint },
  rowLabel:     { fontSize:14, color:Colors.text.primary, fontWeight:'500' },
  rowValue:     { fontSize:11.5, color:Colors.text.muted, marginTop:1 },
  rowDivider:   { height:1, backgroundColor:Colors.border.faint, marginLeft:54 },
  dangerAction: { fontSize:12.5, color:Colors.dangerBright, fontWeight:'600' },

  legal: { fontSize:11, color:Colors.text.faint, textAlign:'center', lineHeight:16, paddingHorizontal:8, paddingTop:8 },
});
