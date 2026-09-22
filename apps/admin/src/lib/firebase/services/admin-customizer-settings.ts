export interface CustomizerSettings {
  selectedTheme?: string;
  selectedTweakcnTheme?: string;
  selectedRadius?: string;
  mode?: 'light' | 'dark' | 'system';
  brandColors?: Record<string, string>;
  importedTheme?: any | null;
  sidebarConfig?: { variant?: string; collapsible?: string; side?: string };
  updatedAt?: string;
}

// Theme customizer is intentionally browser-local. The admin application already
// uses the ArtCanvas Worker as the secure API boundary; direct Firestore reads here
// caused "Missing or insufficient permissions" whenever the Firebase client rules
// did not grant adminUsers/adminCustomizerSettings access.
// Keeping these UI preferences in localStorage also makes the dashboard usable
// without changing the project's Firestore security rules.
function key(adminId: string) { return `artcanvas-admin-theme-settings-${adminId}` }

function read(adminId: string): CustomizerSettings | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(key(adminId))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function write(adminId: string, settings: CustomizerSettings) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key(adminId), JSON.stringify(settings))
  } catch {
    // Storage can be unavailable in private/restricted browser contexts.
  }
}

export async function getCustomizerSettings(adminId: string): Promise<CustomizerSettings | null> {
  return read(adminId)
}

export async function saveCustomizerSettings(
  adminId: string,
  settings: Partial<CustomizerSettings>
): Promise<{ success: boolean; error?: string }> {
  try {
    const current = read(adminId) || {}
    write(adminId, { ...current, ...settings, updatedAt: new Date().toISOString() })
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error?.message || 'Failed to save customizer settings' }
  }
}

export async function resetCustomizerSettings(adminId: string): Promise<{ success: boolean; error?: string }> {
  try {
    write(adminId, {
      selectedTheme: 'default',
      selectedTweakcnTheme: '',
      selectedRadius: '0.5rem',
      mode: 'system',
      brandColors: {},
      importedTheme: null,
      sidebarConfig: { variant: 'inset', collapsible: 'offcanvas', side: 'left' },
      updatedAt: new Date().toISOString(),
    })
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error?.message || 'Failed to reset customizer settings' }
  }
}
