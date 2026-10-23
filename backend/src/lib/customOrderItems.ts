import { z } from "zod";

const blocksSchema = z.array(z.object({ Items: z.array(z.object({ Name: z.string(), Qty: z.number(), Price: z.number() })) }));

export interface FlatCustomOrderItem {
  Name: string;
  Qty: number;
  Price: number;
}

/**
 * Flattens a CustomOrder's `blocks` JSON (array of Custom/Notebook/Diary blocks, each with
 * free-text Items) into a single flat item list. Returns [] if the JSON doesn't match the
 * expected shape, rather than throwing — `blocks` is already-validated/stored data by the
 * time it's read back, so a parse failure here should degrade gracefully, not break a report.
 */
export function flattenCustomOrderBlocks(blocks: unknown): FlatCustomOrderItem[] {
  const parsed = blocksSchema.safeParse(blocks);
  return parsed.success ? parsed.data.flatMap((b) => b.Items) : [];
}
