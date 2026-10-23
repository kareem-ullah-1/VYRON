import type { Router } from "express";
import { router as attribute } from "./attribute";
import { router as auth } from "./auth";
import { router as category } from "./category";
import { router as customOrder } from "./customOrder";
import { router as customer } from "./customer";
import { router as dashboard } from "./dashboard";
import { router as product } from "./product";
import { router as purchase } from "./purchase";
import { router as rawMaterial } from "./rawMaterial";
import { router as report } from "./report";
import { router as sale } from "./sale";
import { router as supplier } from "./supplier";
import { router as user, rolesRouter } from "./user";

/** [URL segment under /api, router]. The segment names match the controller tag passed to `controller()`. */
export const controllers: [string, Router][] = [
  ["Auth", auth],
  ["User", user],
  ["Roles", rolesRouter],
  ["Category", category],
  ["Attributes", attribute],
  ["Product", product],
  ["Customer", customer],
  ["Sales", sale],
  ["Dashboard", dashboard],
  ["Supplier", supplier],
  ["RawMaterial", rawMaterial],
  ["Purchase", purchase],
  ["CustomOrder", customOrder],
  ["Report", report],
];
