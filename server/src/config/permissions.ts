export const ROLE_PERMISSIONS = {
  OWNER: [
    "read:products", "write:products", "delete:products",
    "create:order", "read:orders", "update:order",
    "read:customers", "write:customers", "manage:risk",
    "read:reports", "manage:team", "manage:business"
  ],
  MANAGER: [
    "read:products", "write:products",
    "create:order", "read:orders", "update:order",
    "read:customers", "write:customers", "manage:risk",
    "read:reports"
  ],
  STAFF: [
    "read:products",
    "create:order", "read:orders", "update:order",
    "read:customers", "write:customers"
  ]
};
