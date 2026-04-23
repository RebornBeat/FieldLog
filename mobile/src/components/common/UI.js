import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, TouchableHighlight,
  StyleSheet, ActivityIndicator, ScrollView, Platform,
} from 'react-native';
import { Colors, Radius, Spacing, Fonts } from '../../constants/colors';

// ── Typography ────────────────────────────────────────────────────────────────
export function Heading({ children, style }) {
  return <Text style={[styles.heading, style]}>{children}</Text>;
}
export function Subheading({ children, style }) {
  return <Text style={[styles.subheading, style]}>{children}</Text>;
}
export function BodyText({ children, style }) {
  return <Text style={[styles.body, style]}>{children}</Text>;
}
export function Caption({ children, style }) {
  return <Text style={[styles.caption, style]}>{children}</Text>;
}
export function MonoText({ children, style }) {
  return <Text style={[styles.mono, style]}>{children}</Text>;
}

// ── Button ────────────────────────────────────────────────────────────────────
export function Button({ label, onPress, variant='primary', size='md', icon, loading, disabled, style }) {
  const btnStyle = [
    styles.btn,
    styles[`btn_${variant}`] || styles.btn_primary,
    styles[`btn_${size}`]    || styles.btn_md,
    disabled && styles.btn_disabled,
    style,
  ];
  const textStyle = [
    styles.btnText,
    styles[`btnText_${variant}`] || styles.btnText_primary,
    styles[`btnText_${size}`]    || styles.btnText_md,
  ];

  return (
    <TouchableOpacity
      style={btnStyle}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.75}
    >
      {loading
        ? <ActivityIndicator size="small" color={variant === 'primary' ? Colors.bg.base : Colors.amber.base} />
        : <Text style={textStyle}>{label}</Text>
      }
    </TouchableOpacity>
  );
}

// ── Icon Button ───────────────────────────────────────────────────────────────
export function IconButton({ onPress, children, variant='ghost', size=32, style }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.iconBtn, { width: size, height: size }, style]}
      activeOpacity={0.7}
    >
      {children}
    </TouchableOpacity>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────
export function Card({ children, style, onPress, accent }) {
  if (onPress) {
    return (
      <TouchableHighlight
        onPress={onPress}
        style={[styles.card, accent && styles.card_accent, style]}
        underlayColor={Colors.bg.hover}
      >
        <View>{children}</View>
      </TouchableHighlight>
    );
  }
  return <View style={[styles.card, accent && styles.card_accent, style]}>{children}</View>;
}

// ── Section Header ────────────────────────────────────────────────────────────
export function SectionHeader({ title }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{title}</Text>
    </View>
  );
}

// ── Divider ───────────────────────────────────────────────────────────────────
export function Divider({ style }) {
  return <View style={[styles.divider, style]} />;
}

// ── Field Input ───────────────────────────────────────────────────────────────
export function FieldInput({
  label, value, onChangeText, placeholder, multiline, numberOfLines=4,
  type='default', required, editable=true, hint, style,
}) {
  const [focused, setFocused] = useState(false);
  const inputProps = {
    value:           value || '',
    onChangeText,
    placeholder,
    placeholderTextColor: Colors.text.faint,
    editable,
    style: [
      styles.input,
      multiline && styles.inputMultiline,
      focused && styles.inputFocused,
      !editable && styles.inputDisabled,
    ],
    onFocus: () => setFocused(true),
    onBlur:  () => setFocused(false),
    keyboardType: type === 'number' ? 'decimal-pad' : 'default',
    keyboardAppearance: 'dark',
    returnKeyType: multiline ? 'default' : 'next',
    multiline: !!multiline,
    numberOfLines: multiline ? numberOfLines : 1,
    textAlignVertical: multiline ? 'top' : 'center',
  };

  return (
    <View style={[styles.fieldWrap, style]}>
      {label && (
        <Text style={styles.fieldLabel}>
          {label}{required && <Text style={styles.fieldRequired}> *</Text>}
        </Text>
      )}
      <TextInput {...inputProps} />
      {hint && <Text style={styles.fieldHint}>{hint}</Text>}
    </View>
  );
}

// ── Select (native picker) ─────────────────────────────────────────────────────
export function FieldSelect({ label, value, onValueChange, options=[], placeholder, required, style }) {
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find(o => (o.value||o) === value)?.label || options.find(o => (o.value||o) === value) || '';

  return (
    <View style={[styles.fieldWrap, style]}>
      {label && (
        <Text style={styles.fieldLabel}>
          {label}{required && <Text style={styles.fieldRequired}> *</Text>}
        </Text>
      )}
      <TouchableOpacity
        style={[styles.input, styles.selectBtn]}
        onPress={() => setOpen(true)}
        activeOpacity={0.8}
      >
        <Text style={value ? styles.selectValue : styles.selectPlaceholder}>
          {selectedLabel || placeholder || 'Select…'}
        </Text>
        <Text style={styles.selectArrow}>▾</Text>
      </TouchableOpacity>

      {open && (
        <View style={styles.selectDropdown}>
          <ScrollView style={{ maxHeight: 220 }} nestedScrollEnabled>
            {options.map((opt, i) => {
              const val = opt.value || opt;
              const lbl = opt.label || opt;
              return (
                <TouchableOpacity
                  key={i}
                  style={[styles.selectOption, val === value && styles.selectOptionActive]}
                  onPress={() => { onValueChange(val); setOpen(false); }}
                >
                  <Text style={[styles.selectOptionText, val === value && styles.selectOptionTextActive]}>
                    {lbl}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <TouchableOpacity style={styles.selectClose} onPress={() => setOpen(false)}>
            <Text style={styles.selectCloseText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ── Toggle Row ────────────────────────────────────────────────────────────────
export function ToggleRow({ label, value, onValueChange, hint }) {
  return (
    <View style={styles.toggleRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.toggleLabel}>{label}</Text>
        {hint && <Text style={styles.fieldHint}>{hint}</Text>}
      </View>
      <TouchableOpacity
        style={[styles.toggle, value && styles.toggleOn]}
        onPress={() => onValueChange(!value)}
        activeOpacity={0.8}
      >
        <View style={[styles.toggleThumb, value && styles.toggleThumbOn]} />
      </TouchableOpacity>
    </View>
  );
}

// ── Tags Input ────────────────────────────────────────────────────────────────
export function TagsInput({ label, value=[], onChange }) {
  const [inputVal, setInputVal] = useState('');

  const addTag = () => {
    const t = inputVal.trim();
    if (!t || value.includes(t)) return;
    onChange([...value, t]);
    setInputVal('');
  };

  const removeTag = (i) => onChange(value.filter((_, idx) => idx !== i));

  return (
    <View style={styles.fieldWrap}>
      {label && <Text style={styles.fieldLabel}>{label}</Text>}
      <View style={styles.tagsWrap}>
        {value.map((t, i) => (
          <TouchableOpacity key={i} style={styles.tagPill} onPress={() => removeTag(i)}>
            <Text style={styles.tagText}>{t} ×</Text>
          </TouchableOpacity>
        ))}
        <TextInput
          style={styles.tagInput}
          value={inputVal}
          onChangeText={setInputVal}
          placeholder="Add tag…"
          placeholderTextColor={Colors.text.faint}
          returnKeyType="done"
          onSubmitEditing={addTag}
          keyboardAppearance="dark"
        />
      </View>
    </View>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────────
export function Badge({ label, variant='amber', style }) {
  return (
    <View style={[styles.badge, styles[`badge_${variant}`] || styles.badge_amber, style]}>
      <Text style={[styles.badgeText, styles[`badgeText_${variant}`] || styles.badgeText_amber]}>
        {label}
      </Text>
    </View>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, subtitle, action }) {
  return (
    <View style={styles.emptyState}>
      {icon && <Text style={styles.emptyIcon}>{icon}</Text>}
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle && <Text style={styles.emptySub}>{subtitle}</Text>}
      {action}
    </View>
  );
}

// ── Loading Screen ────────────────────────────────────────────────────────────
export function LoadingScreen({ message }) {
  return (
    <View style={styles.loadingScreen}>
      <ActivityIndicator size="large" color={Colors.amber.base} />
      {message && <Text style={[styles.caption, { marginTop: 12 }]}>{message}</Text>}
    </View>
  );
}

// ── Notification Toast ────────────────────────────────────────────────────────
export function Toast({ notif, onDismiss }) {
  const borderColors = {
    success: 'rgba(77,132,96,0.4)',
    error:   'rgba(146,64,64,0.4)',
    warning: 'rgba(160,120,48,0.4)',
    info:    'rgba(58,106,142,0.4)',
  };
  return (
    <TouchableOpacity
      style={[styles.toast, { borderColor: borderColors[notif.type] || borderColors.info }]}
      onPress={onDismiss}
      activeOpacity={0.85}
    >
      <Text style={styles.toastText}>{notif.message}</Text>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // ── Typography ──
  heading:    { fontFamily: Fonts.display, fontSize: 22, fontWeight: '700', color: Colors.text.bright, fontStyle: 'italic', lineHeight: 28 },
  subheading: { fontSize: 16, fontWeight: '600', color: Colors.text.primary, lineHeight: 22 },
  body:       { fontSize: 14, color: Colors.text.secondary, lineHeight: 20 },
  caption:    { fontSize: 12, color: Colors.text.muted, lineHeight: 16 },
  mono:       { fontFamily: Fonts.mono, fontSize: 12, color: Colors.text.secondary },

  // ── Button ──
  btn:           { flexDirection:'row', alignItems:'center', justifyContent:'center', borderRadius: Radius.md, paddingHorizontal: 16 },
  btn_primary:   { backgroundColor: Colors.amber.base },
  btn_secondary: { backgroundColor: Colors.bg.elevated, borderWidth: 1, borderColor: Colors.border.subtle },
  btn_ghost:     { backgroundColor: 'transparent' },
  btn_danger:    { backgroundColor: Colors.dangerFaint, borderWidth: 1, borderColor: 'rgba(146,64,64,0.35)' },
  btn_sm:        { height: 30, paddingHorizontal: 12 },
  btn_md:        { height: 40, paddingHorizontal: 16 },
  btn_lg:        { height: 48, paddingHorizontal: 20 },
  btn_disabled:  { opacity: 0.4 },
  btnText:        { fontWeight: '600' },
  btnText_primary: { color: Colors.bg.base },
  btnText_secondary:{ color: Colors.text.primary },
  btnText_ghost:  { color: Colors.text.secondary },
  btnText_danger: { color: Colors.dangerBright },
  btnText_sm:     { fontSize: 12 },
  btnText_md:     { fontSize: 14 },
  btnText_lg:     { fontSize: 16 },

  // ── Icon Button ──
  iconBtn: { alignItems:'center', justifyContent:'center', borderRadius: Radius.md },

  // ── Card ──
  card: {
    backgroundColor: Colors.bg.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border.dim,
    padding: Spacing[4],
    overflow: 'hidden',
  },
  card_accent: { borderColor: Colors.amber.border, backgroundColor: Colors.amber.faint },

  // ── Section Header ──
  sectionHeader: { paddingHorizontal: Spacing[4], paddingTop: Spacing[5], paddingBottom: Spacing[2] },
  sectionHeaderText: { fontSize: 10.5, fontWeight: '700', color: Colors.text.faint, textTransform: 'uppercase', letterSpacing: 1.2 },

  // ── Divider ──
  divider: { height: 1, backgroundColor: Colors.border.dim },

  // ── Field ──
  fieldWrap:     { marginBottom: 14 },
  fieldLabel:    { fontSize: 11, fontWeight: '700', color: Colors.text.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 5 },
  fieldRequired: { color: Colors.amber.base },
  fieldHint:     { fontSize: 11, color: Colors.text.faint, marginTop: 3 },

  input: {
    backgroundColor: Colors.bg.overlay,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    borderRadius: Radius.md,
    color: Colors.text.primary,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    minHeight: 40,
  },
  inputMultiline: { minHeight: 88, paddingTop: 10 },
  inputFocused:   { borderColor: Colors.amber.base, backgroundColor: Colors.bg.elevated },
  inputDisabled:  { opacity: 0.5 },

  // ── Select ──
  selectBtn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectValue:       { color: Colors.text.primary, fontSize: 14, flex: 1 },
  selectPlaceholder: { color: Colors.text.faint, fontSize: 14, flex: 1 },
  selectArrow:       { color: Colors.text.muted, fontSize: 16, marginLeft: 4 },
  selectDropdown:    { position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 999, backgroundColor: Colors.bg.elevated, borderWidth: 1, borderColor: Colors.border.subtle, borderRadius: Radius.md, marginTop: 4, overflow: 'hidden' },
  selectOption:      { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border.faint },
  selectOptionActive:{ backgroundColor: Colors.amber.faint },
  selectOptionText:  { fontSize: 14, color: Colors.text.secondary },
  selectOptionTextActive: { color: Colors.amber.base, fontWeight: '600' },
  selectClose:       { padding: 14, alignItems: 'center', borderTopWidth: 1, borderTopColor: Colors.border.dim },
  selectCloseText:   { fontSize: 14, color: Colors.text.muted },

  // ── Toggle ──
  toggleRow:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  toggleLabel:   { fontSize: 14, color: Colors.text.primary, flex: 1 },
  toggle:        { width: 42, height: 24, borderRadius: 12, backgroundColor: Colors.bg.elevated, borderWidth: 1, borderColor: Colors.border.subtle, justifyContent: 'center', paddingHorizontal: 2 },
  toggleOn:      { backgroundColor: Colors.amber.faint, borderColor: Colors.amber.border },
  toggleThumb:   { width: 18, height: 18, borderRadius: 9, backgroundColor: Colors.text.muted },
  toggleThumbOn: { alignSelf: 'flex-end', backgroundColor: Colors.amber.base },

  // ── Tags ──
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, backgroundColor: Colors.bg.overlay, borderWidth: 1, borderColor: Colors.border.subtle, borderRadius: Radius.md, padding: 8, minHeight: 44 },
  tagPill:  { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bg.active, borderWidth: 1, borderColor: Colors.border.subtle, borderRadius: 100, paddingHorizontal: 8, paddingVertical: 3 },
  tagText:  { fontSize: 12, color: Colors.text.secondary },
  tagInput: { fontSize: 13, color: Colors.text.primary, minWidth: 80, flex: 1, paddingVertical: 2 },

  // ── Badge ──
  badge:              { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 100, borderWidth: 1 },
  badge_amber:        { backgroundColor: Colors.amber.faint, borderColor: Colors.amber.border },
  badge_green:        { backgroundColor: Colors.successFaint, borderColor: 'rgba(77,132,96,0.3)' },
  badge_red:          { backgroundColor: Colors.dangerFaint, borderColor: 'rgba(146,64,64,0.3)' },
  badgeText:          { fontSize: 10, fontWeight: '700' },
  badgeText_amber:    { color: Colors.amber.base },
  badgeText_green:    { color: Colors.successBright },
  badgeText_red:      { color: Colors.dangerBright },

  // ── Empty State ──
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 },
  emptyIcon:  { fontSize: 40, marginBottom: 8 },
  emptyTitle: { fontFamily: Fonts.display, fontSize: 20, fontWeight: '600', color: Colors.text.secondary, fontStyle: 'italic', textAlign: 'center' },
  emptySub:   { fontSize: 14, color: Colors.text.muted, textAlign: 'center', lineHeight: 20 },

  // ── Loading ──
  loadingScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bg.base },

  // ── Toast ──
  toast: { backgroundColor: Colors.bg.elevated, borderWidth: 1, borderRadius: Radius.md, padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
  toastText: { fontSize: 13, color: Colors.text.secondary, flex: 1 },
});
