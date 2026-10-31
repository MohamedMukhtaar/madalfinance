/**
 * Canonical permission catalog (Spatie-style names: "<action> <module>").
 * Seeded into PostgreSQL `permissions` and assigned to roles from the UI.
 */
export const PERMISSION_MODULES = [
  { module: 'dashboard', label: 'Dashboard', actions: ['view'] },
  { module: 'customers', label: 'Customers', actions: ['view', 'create', 'edit', 'delete'] },
  { module: 'members', label: 'Members', actions: ['view', 'create', 'edit', 'delete'] },
  { module: 'contributions', label: 'Contributions', actions: ['view', 'create', 'edit', 'delete'] },
  { module: 'projects', label: 'Projects', actions: ['view', 'create', 'edit', 'delete'] },
  { module: 'invoices', label: 'Invoices', actions: ['view', 'create', 'edit', 'delete'] },
  { module: 'payments', label: 'Payments', actions: ['view', 'create', 'edit', 'delete'] },
  { module: 'income', label: 'Other income', actions: ['view', 'create', 'edit', 'delete'] },
  { module: 'expenses', label: 'Expenses', actions: ['view', 'create', 'edit', 'delete'] },
  { module: 'accounts', label: 'Accounts', actions: ['view', 'create', 'edit', 'delete'] },
  { module: 'employees', label: 'Employees', actions: ['view', 'create', 'edit', 'delete'] },
  { module: 'salary', label: 'Salary', actions: ['view', 'create', 'edit', 'delete'] },
  { module: 'tasks', label: 'Performance tasks', actions: ['view', 'create', 'edit', 'delete'] },
  { module: 'transactions', label: 'Transactions', actions: ['view'] },
  { module: 'reports', label: 'Reports', actions: ['view'] },
  { module: 'users', label: 'Users', actions: ['view', 'create', 'edit', 'delete'] },
  { module: 'roles', label: 'Roles', actions: ['view', 'create', 'edit', 'delete'] },
  { module: 'organizations', label: 'Organization', actions: ['view', 'edit'] },
  { module: 'settings', label: 'Settings', actions: ['manage'] },
  { module: 'logs', label: 'Logs', actions: ['view'] },
  { module: 'trash items', label: 'Trash', actions: ['view', 'restore'] },
];

const nameFor = (action, module) => `${action} ${module}`;

export const ALL_PERMISSIONS = PERMISSION_MODULES.flatMap(({ module, actions }) =>
  actions.map((action) => ({
    name: nameFor(action, module),
    module,
    action,
  }))
);

export const ALL_PERMISSION_NAMES = ALL_PERMISSIONS.map((p) => p.name);

/** Permissions withheld from the built-in Admin role (Super Admin keeps everything). */
export const ADMIN_EXCLUDED_PERMISSIONS = new Set([
  'view users',
  'create users',
  'edit users',
  'delete users',
  'view roles',
  'create roles',
  'edit roles',
  'delete roles',
  'edit organizations',
  'manage settings',
  'view logs',
  'view trash items',
  'restore trash items',
]);

export const adminPermissionNames = () =>
  ALL_PERMISSION_NAMES.filter((name) => !ADMIN_EXCLUDED_PERMISSIONS.has(name));

export const permissionCatalog = () =>
  PERMISSION_MODULES.map(({ module, label, actions }) => ({
    module,
    label,
    actions: actions.map((action) => ({ action, name: nameFor(action, module) })),
  }));

export default {
  PERMISSION_MODULES,
  ALL_PERMISSIONS,
  ALL_PERMISSION_NAMES,
  ADMIN_EXCLUDED_PERMISSIONS,
  adminPermissionNames,
  permissionCatalog,
};
