export const PERMISSION_LABELS = {
  viewDashboard: 'Dashboard',
  manageProducts: 'Products',
  manageCategories: 'Categories & Sub-categories',
  manageOrders: 'Orders',
  manageMessages: 'Messages / Customer support',
  managePayments: 'Payment verification',
  manageHomepage: 'Homepage / content',
  manageAdmins: 'Admins & roles',
  viewAuditLogs: 'Audit logs',
  manageSettings: 'System settings',
  manageCirculation: 'Circulation / loans / returns / shipment',
  manageMembership: 'Membership / plans / offers',
  manageContact: 'Contact / complaints / feedback',
} as const

export type PermissionKey = keyof typeof PERMISSION_LABELS

export const ALL_PERMISSIONS: PermissionKey[] = Object.keys(PERMISSION_LABELS) as PermissionKey[]

export const ROLE_DEFAULTS: Record<'Admin'|'Moderator'|'Seller', Record<PermissionKey, boolean>> = {
  Admin: Object.fromEntries(ALL_PERMISSIONS.map((p) => [p, true])) as Record<PermissionKey, boolean>,
  Moderator: Object.fromEntries(ALL_PERMISSIONS.map((p) => [p, ['viewDashboard','manageProducts','manageCategories','manageOrders','manageMessages','managePayments','manageHomepage','manageCirculation','manageMembership','manageContact'].includes(p)])) as Record<PermissionKey, boolean>,
  Seller: Object.fromEntries(ALL_PERMISSIONS.map((p) => [p, ['viewDashboard','manageProducts','manageOrders'].includes(p)])) as Record<PermissionKey, boolean>,
}

export function effectivePermissions(admin: any): Record<PermissionKey, boolean> {
  // Backward compatibility: the original ArtCanvas administrator was
  // identified by the Firebase custom claim `admin: true` and did not have an
  // adminUsers profile document. Treat that account as owner-level Admin until
  // the profile is created.
  if (admin?.admin === true && !admin?.role) {
    return Object.fromEntries(ALL_PERMISSIONS.map((p) => [p, true])) as Record<PermissionKey, boolean>
  }
  const role = (admin?.role || 'Seller') as keyof typeof ROLE_DEFAULTS
  const defaults = ROLE_DEFAULTS[role] || ROLE_DEFAULTS.Seller
  return Object.fromEntries(ALL_PERMISSIONS.map((p) => [p, typeof admin?.permissions?.[p] === 'boolean' ? admin.permissions[p] : defaults[p]])) as Record<PermissionKey, boolean>
}
