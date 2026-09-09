"use client";

import { useCallback, useEffect, useState } from "react";

export const ROLE_PERMISSIONS = {
  OWNER: ["read:products", "write:products", "delete:products", "create:order", "read:orders", "update:order", "read:customers", "write:customers", "manage:risk", "read:reports", "manage:team", "manage:business"],
  MANAGER: ["read:products", "write:products", "create:order", "read:orders", "update:order", "read:customers", "write:customers", "manage:risk", "read:reports"],
  STAFF: ["read:products", "create:order", "read:orders", "update:order", "read:customers", "write:customers"]
};

type Role = keyof typeof ROLE_PERMISSIONS;

type StoredUser = {
  role?: string;
};

export function usePermissions() {
  const [role, setRole] = useState<Role | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const rawUser = localStorage.getItem("user");

      if (rawUser) {
        try {
          const user = JSON.parse(rawUser) as StoredUser;
          const storedRole = user.role?.toUpperCase() as Role;

          if (storedRole in ROLE_PERMISSIONS) {
            setRole(storedRole);
          }
        } catch {
          setRole(null);
        }
      }

      setIsLoading(false);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const hasPermission = useCallback((permission: string): boolean => {
    return role ? ROLE_PERMISSIONS[role].includes(permission) : false;
  }, [role]);

  return { role, isLoading, hasPermission };
}
