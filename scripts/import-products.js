#!/usr/bin/env node
/**
 * Import products from a CSV file into the Supabase `products` table.
 *
 * Usage:
 *   node scripts/import-products.js <path-to-csv>
 *
 * - Uses the same admin credentials as lib/supabase-admin.js
 *   (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local).
 *   Never hardcode keys.
 * - UPSERTs on `external_id` so re-running updates instead of duplicating.
 * - Skips rows missing any required field and lists them at the end.
 * - Warns (does not skip) for rows missing packshot_url.
 */
const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");
const { createClient } = require("@supabase/supabase-js");

// Load env from .env.local (same file Next.js uses), fall back to .env
require("dotenv").config({ path: path.resolve(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "Missing Supabase admin env vars. Check .env.local for NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
  );
  process.exit(1);
}

// Server-side admin client (bypasses RLS) - never expose in the browser.
const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Fields that MUST be present on every row (union of DB NOT NULL + business rule).
// gender is required here by business rule even though it is nullable in the DB.
const REQUIRED = [
  "external_id",
  "source",
  "merchant",
  "name",
  "brand",
  "category",
  "price",
  "image_url",
  "affiliate_url",
  "gender",
];

// All columns we allow importing (auto-generated id/created_at/last_checked_at excluded).
const TEXT_FIELDS = [
  "external_id",
  "source",
  "merchant",
  "name",
  "brand",
  "description",
  "category",
  "subcategory",
  "currency",
  "color",
  "image_url",
  "affiliate_url",
  "gender",
  "packshot_url",
];

function emptyToNull(v) {
  if (v === undefined || v === null) return null;
  const t = String(v).trim();
  return t === "" ? null : t;
}

function main() {
  const csvPath = process.argv[2];
  if (!csvPath) {
    console.error("Usage: node scripts/import-products.js <path-to-csv>");
    process.exit(1);
  }
  if (!fs.existsSync(csvPath)) {
    console.error(`CSV file not found: ${csvPath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(csvPath, "utf8");
  let records;
  try {
    records = parse(raw, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
    });
  } catch (err) {
    console.error("Failed to parse CSV:", err.message);
    process.exit(1);
  }

  const valid = [];
  const skipped = []; // { line, external_id, reason }
  const missingPackshot = []; // external_id list

  records.forEach((row, i) => {
    const line = i + 2; // +1 header, +1 to be 1-based
    const extId = emptyToNull(row.external_id) || `(line ${line})`;

    // Validate required fields.
    const missing = REQUIRED.filter((f) => emptyToNull(row[f]) === null);
    if (missing.length > 0) {
      skipped.push({
        line,
        external_id: extId,
        reason: `missing required: ${missing.join(", ")}`,
      });
      return;
    }

    // price must be a valid number.
    const priceNum = Number(String(row.price).replace(",", "."));
    if (Number.isNaN(priceNum)) {
      skipped.push({
        line,
        external_id: extId,
        reason: `invalid price: "${row.price}"`,
      });
      return;
    }

    // Build the record using only known columns.
    const record = {};
    for (const f of TEXT_FIELDS) {
      record[f] = emptyToNull(row[f]);
    }
    record.price = priceNum;

    // tags: optional, comma/pipe separated -> text[]; empty -> [] (DB default).
    const tagsRaw = emptyToNull(row.tags);
    if (tagsRaw !== null) {
      record.tags = tagsRaw
        .split(/[|,]/)
        .map((t) => t.trim())
        .filter(Boolean);
    }

    // in_stock: optional boolean; empty -> leave DB default (true).
    const stockRaw = emptyToNull(row.in_stock);
    if (stockRaw !== null) {
      record.in_stock = /^(true|1|yes|y)$/i.test(stockRaw);
    }

    // Warn (do not skip) when packshot_url is absent.
    if (record.packshot_url === null) {
      missingPackshot.push(record.external_id);
    }

    valid.push(record);
  });

  run(valid, skipped, missingPackshot);
}

async function run(valid, skipped, missingPackshot) {
  let inserted = 0;
  let updated = 0;
  const failed = []; // { external_id, reason }

  for (const record of valid) {
    // Detect insert vs update: check if the external_id already exists.
    const { data: existing, error: selErr } = await supabaseAdmin
      .from("products")
      .select("id")
      .eq("external_id", record.external_id)
      .maybeSingle();

    if (selErr) {
      failed.push({ external_id: record.external_id, reason: selErr.message });
      continue;
    }

    const { error: upErr } = await supabaseAdmin
      .from("products")
      .upsert(record, { onConflict: "external_id" });

    if (upErr) {
      failed.push({ external_id: record.external_id, reason: upErr.message });
      continue;
    }

    if (existing) updated += 1;
    else inserted += 1;
  }

  // ---- Summary ----
  console.log("\n===== IMPORT SUMMARY =====");
  console.log(`Inserted: ${inserted}`);
  console.log(`Updated:  ${updated}`);
  console.log(`Skipped:  ${skipped.length}`);
  console.log(`Failed:   ${failed.length}`);

  if (skipped.length > 0) {
    console.log("\n--- Skipped rows (not imported) ---");
    skipped.forEach((s) =>
      console.log(`  line ${s.line} [${s.external_id}]: ${s.reason}`)
    );
  }

  if (failed.length > 0) {
    console.log("\n--- Failed upserts (DB error) ---");
    failed.forEach((f) =>
      console.log(`  [${f.external_id}]: ${f.reason}`)
    );
  }

  if (missingPackshot.length > 0) {
    console.log(
      `\n[WARNING] ${missingPackshot.length} product(s) imported WITHOUT packshot_url ` +
        `(will use on-model image in the grid):`
    );
    missingPackshot.forEach((id) => console.log(`  - ${id}`));
  }

  console.log("\nDone.");
  // Non-zero exit if nothing was imported but rows existed.
  if (inserted + updated === 0 && (skipped.length > 0 || failed.length > 0)) {
    process.exit(1);
  }
}

main();
