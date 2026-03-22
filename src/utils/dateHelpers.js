export function formatDate(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString(undefined,{ year:'numeric', month:'short', day:'numeric' }); }
  catch { return '—'; }
}
export function formatDateTime(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString(undefined,{ year:'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' }); }
  catch { return '—'; }
}
