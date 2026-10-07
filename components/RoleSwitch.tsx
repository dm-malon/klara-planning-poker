"use client";

import type { Role } from "@/lib/identity";
import { Segmented } from "./Segmented";

export function RoleSwitch({
  value,
  onChange,
  labelledBy,
  wide,
}: {
  value: Role;
  onChange: (role: Role) => void;
  labelledBy?: string;
  wide?: boolean;
}) {
  return (
    <Segmented
      value={value}
      onChange={onChange}
      labelledBy={labelledBy}
      ariaLabel={labelledBy ? undefined : "Role"}
      wide={wide}
      options={[
        { value: "voter", label: "Voter", icon: "🃏" },
        { value: "spectator", label: "Spectator", icon: "👁" },
      ]}
    />
  );
}
