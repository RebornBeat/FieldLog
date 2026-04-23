import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  ActivityIndicator, ScrollView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../src/context/AppContext';
import { Colors, Radius, Fonts } from '../../src/constants/colors';
import { readStratumAsBase64, saveTransferredStratum } from '../../src/utils/stratumFormat';
import { Button } from '../../src/components/common/UI';

// ── Transfer state machine ────────────────────────────────────────────────────
// idle → scanning → confirming → transferring → done | error
const S = { IDLE:'idle', SCANNING:'scanning', CONFIRMING:'confirming', TRANSFERRING:'transferring', DONE:'done', ERROR:'error' };

export default function TransferScreen() {
  const insets = useSafeAreaInsets();
  const { state, notify, rescan } = useApp();
  const [mode,        setMode]        = useState(null);   // 'send' | 'receive'
  const [step,        setStep]        = useState(S.IDLE);
  const [sessionInfo, setSessionInfo] = useState(null);  // from /handshake
  const [selectedUri, setSelectedUri] = useState(null);  // file to send
  const [errorMsg,    setErrorMsg]    = useState('');
  const [permission,  requestPermission] = useCameraPermissions();
  const scannedRef = useRef(false);

  const reset = () => {
    setMode(null); setStep(S.IDLE); setSessionInfo(null);
    setSelectedUri(null); setErrorMsg(''); scannedRef.current = false;
  };

  // ── QR scan handler ─────────────────────────────────────────────────────
  const handleScan = useCallback(async ({ data }) => {
    if (scannedRef.current || step !== S.SCANNING) return;
    scannedRef.current = true;

    // Parse metastrata:// QR
    let params;
    try {
      const url = new URL(data);
      if (url.protocol !== 'metastrata:') throw new Error('Not a MetaStrata QR code');
      params = Object.fromEntries(url.searchParams.entries());
    } catch (e) {
      setErrorMsg('Invalid QR code. Please scan a MetaStrata transfer QR.');
      setStep(S.ERROR);
      return;
    }

    const { ip, port, token, transferMode } = params;
    if (!ip || !port || !token) { setErrorMsg('Incomplete QR data.'); setStep(S.ERROR); return; }

    setStep(S.CONFIRMING);

    // Handshake
    try {
      const resp = await fetch(`http://${ip}:${port}/handshake?token=${token}`, { timeout: 8000 });
      if (!resp.ok) throw new Error(`Server responded ${resp.status}`);
      const info = await resp.json();
      if (info.app !== 'MetaStrata') throw new Error('Not a MetaStrata receiver');
      setSessionInfo({ ...info, ip, port, token });
    } catch (e) {
      setErrorMsg(`Could not reach desktop: ${e.message}`);
      setStep(S.ERROR);
    }
  }, [step]);

  // ── Send file to desktop (after confirm) ────────────────────────────────
  const handleSendToDesktop = useCallback(async () => {
    if (!sessionInfo || !selectedUri) return;
    const { ip, port, token } = sessionInfo;
    setStep(S.TRANSFERRING);

    try {
      const b64result = await readStratumAsBase64(selectedUri);
      if (!b64result.success) throw new Error(b64result.error);

      const filename = selectedUri.split('/').pop();
      const body     = JSON.stringify({ filename, data: b64result.base64 });

      const resp = await fetch(`http://${ip}:${port}/upload`, {
        method: 'POST',
        headers: {
          'Content-Type':      'application/json',
          'X-Transfer-Token':  token,
        },
        body,
      });

      if (!resp.ok) throw new Error(`Upload failed: ${resp.status}`);
      await resp.json();
      setStep(S.DONE);
      notify('success', 'Archive sent to desktop');
    } catch (e) {
      setErrorMsg(`Transfer failed: ${e.message}`);
      setStep(S.ERROR);
    }
  }, [sessionInfo, selectedUri, notify]);

  // ── Receive file from desktop (after confirm) ────────────────────────────
  const handleReceiveFromDesktop = useCallback(async () => {
    if (!sessionInfo) return;
    const { ip, port, token, filename } = sessionInfo;
    setStep(S.TRANSFERRING);

    try {
      const resp = await fetch(`http://${ip}:${port}/download?token=${token}`);
      if (!resp.ok) throw new Error(`Download failed: ${resp.status}`);

      // Read as blob → base64
      const blob   = await resp.blob();
      const reader = new FileReader();
      const base64 = await new Promise((res, rej) => {
        reader.onload = () => res(reader.result.split(',')[1]);
        reader.onerror = rej;
        reader.readAsDataURL(blob);
      });

      const result = await saveTransferredStratum(base64, filename || `received-${Date.now()}.stratum`, state.collectionDir);
      if (!result.success) throw new Error(result.error);

      await rescan();
      setStep(S.DONE);
      notify('success', `"${filename}" received from desktop`);
    } catch (e) {
      setErrorMsg(`Receive failed: ${e.message}`);
      setStep(S.ERROR);
    }
  }, [sessionInfo, state.collectionDir, rescan, notify]);

  // ── Send: select file first, then show camera ─────────────────────────
  const startSendFlow = async () => {
    const { default: DocumentPicker } = await import('expo-document-picker');
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: false });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    if (!asset.uri.endsWith('.stratum')) {
      Alert.alert('Select a .stratum file', 'Only .stratum archives can be sent to desktop.');
      return;
    }
    setSelectedUri(asset.uri);
    setMode('send');
    if (!permission?.granted) { const r = await requestPermission(); if (!r.granted) { Alert.alert('Camera permission required'); return; } }
    setStep(S.SCANNING);
  };

  // ── Receive: show camera to scan desktop QR ──────────────────────────
  const startReceiveFlow = async () => {
    if (!permission?.granted) { const r = await requestPermission(); if (!r.granted) { Alert.alert('Camera permission required'); return; } }
    setMode('receive');
    setStep(S.SCANNING);
  };

  // ── Auto-trigger transfer after confirm ──────────────────────────────
  useEffect(() => {
    if (step === S.CONFIRMING && sessionInfo) {
      // Just show confirmation UI — user presses button
    }
  }, [step, sessionInfo]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Transfer</Text>
        {step !== S.IDLE && (
          <TouchableOpacity onPress={reset} style={styles.resetBtn}>
            <Text style={styles.resetBtnText}>Start over</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 20 }]}>

        {/* ── IDLE: choose mode ──────────────────────────────────────── */}
        {step === S.IDLE && (
          <>
            <Text style={styles.intro}>
              Move .stratum files between your phone and desktop without any cloud or internet connection.
              Both devices must be on the same WiFi.
            </Text>

            <TouchableOpacity style={styles.modeCard} onPress={startSendFlow} activeOpacity={0.75}>
              <View style={[styles.modeIcon, { backgroundColor:'rgba(200,147,58,0.12)' }]}>
                <Ionicons name="arrow-up-circle-outline" size={28} color={Colors.amber.base} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modeTitle}>Send to Desktop</Text>
                <Text style={styles.modeDesc}>
                  Select a .stratum file on this phone and send it to MetaStrata on your computer.
                  Scan the QR shown on the desktop.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.text.faint} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.modeCard} onPress={startReceiveFlow} activeOpacity={0.75}>
              <View style={[styles.modeIcon, { backgroundColor:'rgba(77,132,96,0.12)' }]}>
                <Ionicons name="arrow-down-circle-outline" size={28} color={Colors.successBright} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modeTitle}>Receive from Desktop</Text>
                <Text style={styles.modeDesc}>
                  Scan the QR shown on the desktop to download a .stratum archive to this device.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.text.faint} />
            </TouchableOpacity>

            <View style={styles.howToBox}>
              <Text style={styles.howToTitle}>How to start a transfer on Desktop</Text>
              <Text style={styles.howToStep}>
                <Text style={styles.howToNum}>Send to phone: </Text>
                Right-click a .stratum in MetaStrata → "Send to Mobile" → QR appears on screen.
              </Text>
              <Text style={styles.howToStep}>
                <Text style={styles.howToNum}>Receive from phone: </Text>
                In MetaStrata, go to any screen → File menu → "Receive from Mobile" → QR appears.
              </Text>
              <Text style={styles.howToStep}>
                <Text style={styles.howToNum}>Both: </Text>
                Scan the desktop QR with this screen. Session closes automatically after transfer.
              </Text>
            </View>

            <View style={styles.altSection}>
              <Text style={styles.altTitle}>Other ways to move files</Text>
              <Text style={styles.altText}>
                Any method that moves files works: AirDrop, email attachment, WhatsApp, Google Drive, USB. Open a .stratum file on this phone and tap "Open in MetaStrata" to import it directly.
              </Text>
            </View>
          </>
        )}

        {/* ── SCANNING: Camera ──────────────────────────────────────────── */}
        {step === S.SCANNING && (
          <View style={styles.scanSection}>
            <Text style={styles.scanTitle}>
              {mode === 'send' ? 'Scan QR from desktop' : 'Scan QR from desktop'}
            </Text>
            <Text style={styles.scanSub}>
              {mode === 'send'
                ? 'On your desktop: File → Receive from Mobile. A QR code will appear.'
                : 'On your desktop: right-click a .stratum → Send to Mobile. A QR code will appear.'}
            </Text>

            <View style={styles.cameraWrap}>
              <CameraView
                style={styles.camera}
                facing="back"
                onBarcodeScanned={handleScan}
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              />
              <View style={styles.scanOverlay}>
                <View style={styles.scanCorner} />
              </View>
            </View>

            {mode === 'send' && selectedUri && (
              <View style={styles.selectedFile}>
                <Ionicons name="document-outline" size={14} color={Colors.amber.base} />
                <Text style={styles.selectedFileName} numberOfLines={1}>
                  {selectedUri.split('/').pop()}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ── CONFIRMING: show session info ─────────────────────────────── */}
        {step === S.CONFIRMING && sessionInfo && (
          <View style={styles.confirmSection}>
            <View style={styles.confirmIcon}>
              <Ionicons name="checkmark-circle" size={48} color={Colors.success} />
            </View>
            <Text style={styles.confirmTitle}>Desktop Found</Text>
            <View style={styles.confirmCard}>
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>Device</Text>
                <Text style={styles.confirmValue}>MetaStrata Desktop</Text>
              </View>
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>Session Code</Text>
                <Text style={[styles.confirmValue, styles.confirmCode]}>{sessionInfo.session_code}</Text>
              </View>
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>Version</Text>
                <Text style={styles.confirmValue}>v{sessionInfo.version}</Text>
              </View>
              {mode === 'receive' && sessionInfo.filename && (
                <View style={styles.confirmRow}>
                  <Text style={styles.confirmLabel}>File</Text>
                  <Text style={styles.confirmValue}>{sessionInfo.filename}</Text>
                </View>
              )}
            </View>

            <Text style={styles.confirmNote}>
              Verify the Session Code matches the code shown on your desktop before proceeding.
            </Text>

            <View style={styles.confirmActions}>
              <Button label="Cancel" variant="secondary" onPress={reset} style={{ flex: 1 }} />
              <Button
                label={mode === 'send' ? 'Send Archive' : 'Receive Archive'}
                onPress={mode === 'send' ? handleSendToDesktop : handleReceiveFromDesktop}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        )}

        {/* ── TRANSFERRING ─────────────────────────────────────────────── */}
        {step === S.TRANSFERRING && (
          <View style={styles.stateSection}>
            <ActivityIndicator size="large" color={Colors.amber.base} />
            <Text style={styles.stateTitle}>
              {mode === 'send' ? 'Sending archive…' : 'Receiving archive…'}
            </Text>
            <Text style={styles.stateSub}>Do not close this screen.</Text>
          </View>
        )}

        {/* ── DONE ─────────────────────────────────────────────────────── */}
        {step === S.DONE && (
          <View style={styles.stateSection}>
            <View style={styles.doneIcon}>
              <Ionicons name="checkmark-circle" size={64} color={Colors.success} />
            </View>
            <Text style={styles.stateTitle}>
              {mode === 'send' ? 'Archive sent!' : 'Archive received!'}
            </Text>
            <Text style={styles.stateSub}>
              {mode === 'receive' ? 'The archive is now in your collection.' : 'The archive is now on your desktop.'}
            </Text>
            <Button label="Done" onPress={reset} style={{ marginTop: 16 }} />
          </View>
        )}

        {/* ── ERROR ────────────────────────────────────────────────────── */}
        {step === S.ERROR && (
          <View style={styles.stateSection}>
            <Ionicons name="alert-circle" size={56} color={Colors.dangerBright} />
            <Text style={[styles.stateTitle, { color: Colors.dangerBright }]}>Transfer Failed</Text>
            <Text style={styles.stateSub}>{errorMsg}</Text>
            <View style={styles.confirmActions}>
              <Button label="Try Again" variant="secondary" onPress={() => { scannedRef.current = false; setStep(S.SCANNING); setErrorMsg(''); }} style={{ flex: 1 }} />
              <Button label="Start Over" onPress={reset} style={{ flex: 1 }} />
            </View>
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, backgroundColor:Colors.bg.base },

  header: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', padding:16, borderBottomWidth:1, borderBottomColor:Colors.border.dim },
  headerTitle: { fontFamily:Fonts.display, fontSize:20, fontWeight:'700', color:Colors.text.bright, fontStyle:'italic' },
  resetBtn: { paddingHorizontal:12, paddingVertical:6, backgroundColor:Colors.bg.elevated, borderRadius:Radius.sm },
  resetBtnText: { fontSize:12.5, color:Colors.text.secondary },

  body: { padding:16, gap:12 },

  intro: { fontSize:13.5, color:Colors.text.muted, lineHeight:20, marginBottom:4 },

  // Mode cards
  modeCard: { flexDirection:'row', alignItems:'center', gap:12, padding:14, backgroundColor:Colors.bg.surface, borderWidth:1, borderColor:Colors.border.dim, borderRadius:Radius.lg },
  modeIcon: { width:48, height:48, borderRadius:Radius.md, alignItems:'center', justifyContent:'center' },
  modeTitle: { fontSize:15, fontWeight:'600', color:Colors.text.primary, marginBottom:3 },
  modeDesc: { fontSize:12.5, color:Colors.text.muted, lineHeight:17 },

  // How to box
  howToBox: { backgroundColor:Colors.bg.overlay, borderRadius:Radius.lg, padding:14, gap:6 },
  howToTitle: { fontSize:11.5, fontWeight:'700', color:Colors.text.muted, textTransform:'uppercase', letterSpacing:0.8, marginBottom:4 },
  howToStep: { fontSize:12.5, color:Colors.text.muted, lineHeight:18 },
  howToNum: { color:Colors.amber.base, fontWeight:'600' },

  // Alt section
  altSection: { backgroundColor:Colors.bg.surface, borderWidth:1, borderColor:Colors.border.dim, borderRadius:Radius.lg, padding:14 },
  altTitle: { fontSize:13, fontWeight:'600', color:Colors.text.secondary, marginBottom:5 },
  altText: { fontSize:12.5, color:Colors.text.muted, lineHeight:18 },

  // Scan
  scanSection: { gap:10 },
  scanTitle: { fontFamily:Fonts.display, fontSize:19, fontWeight:'700', color:Colors.text.bright, fontStyle:'italic' },
  scanSub: { fontSize:13, color:Colors.text.muted, lineHeight:18 },
  cameraWrap: { height:280, borderRadius:Radius.lg, overflow:'hidden', position:'relative', borderWidth:1, borderColor:Colors.border.subtle },
  camera: { flex:1 },
  scanOverlay: { position:'absolute', inset:0, alignItems:'center', justifyContent:'center' },
  scanCorner: { width:180, height:180, borderRadius:8, borderWidth:2, borderColor:'rgba(200,147,58,0.6)' },
  selectedFile: { flexDirection:'row', alignItems:'center', gap:6, padding:10, backgroundColor:Colors.bg.overlay, borderRadius:Radius.sm },
  selectedFileName: { fontSize:12.5, color:Colors.amber.base, flex:1, fontFamily:Fonts.mono },

  // Confirm
  confirmSection: { gap:14, alignItems:'center' },
  confirmIcon: {},
  confirmTitle: { fontFamily:Fonts.display, fontSize:22, fontWeight:'700', color:Colors.text.bright, fontStyle:'italic' },
  confirmCard: { width:'100%', backgroundColor:Colors.bg.surface, borderWidth:1, borderColor:Colors.border.dim, borderRadius:Radius.lg, overflow:'hidden' },
  confirmRow: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', padding:12, borderBottomWidth:1, borderBottomColor:Colors.border.faint },
  confirmLabel: { fontSize:12, color:Colors.text.muted, fontWeight:'600' },
  confirmValue: { fontSize:13, color:Colors.text.primary, fontWeight:'500' },
  confirmCode: { fontFamily:Fonts.mono, fontSize:16, fontWeight:'700', color:Colors.amber.bright, letterSpacing:2 },
  confirmNote: { fontSize:12, color:Colors.text.faint, textAlign:'center', lineHeight:17 },
  confirmActions: { flexDirection:'row', gap:10, width:'100%' },

  // State
  stateSection: { gap:12, alignItems:'center', paddingTop:40 },
  doneIcon: {},
  stateTitle: { fontFamily:Fonts.display, fontSize:22, fontWeight:'700', color:Colors.text.bright, fontStyle:'italic', textAlign:'center' },
  stateSub: { fontSize:13.5, color:Colors.text.muted, textAlign:'center', lineHeight:19 },
});
