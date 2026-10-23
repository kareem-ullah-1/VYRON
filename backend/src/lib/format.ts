import { Prisma } from "./prisma";

export const dec = (v: Prisma.Decimal | string | number) => new Prisma.Decimal(v);
export const num = (v: Prisma.Decimal | null | undefined): number => (v ? v.toNumber() : 0);
export const iso = (d: Date | null | undefined): string | null => (d ? d.toISOString() : null);

/** Round to 2 dp the way money is stored. */
export const money = (v: Prisma.Decimal) => v.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
