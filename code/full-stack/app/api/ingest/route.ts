import { NextResponse } from "next/server";
import { Pool } from "pg";

export const runtime = "nodejs";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

type IngestionError = {
  row: number;
  field: string;
  message: string;
};

type AssetIngestRow = {
  rowNumber: number;
  name: string;
  categoryName: string;
  labName: string;
  serialNumber: string;
};

type ResolvedAssetIngestRow = AssetIngestRow & {
  categoryId: string;
  labId: string;
};

const REQUIRED_HEADERS = ["name", "category_name", "lab_name", "serial_number"] as const;
const ALLOWED_HEADERS = new Set<string>(REQUIRED_HEADERS);

function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let currentField = "";
  let currentRow: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const nextChar = content[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      currentRow.push(currentField);
      currentField = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }
      currentRow.push(currentField);
      currentField = "";
      if (currentRow.some((cell) => cell.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      continue;
    }

    currentField += char;
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.some((cell) => cell.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase();
}

function cellValue(cells: string[], headerMap: Map<string, number>, header: string): string {
  const position = headerMap.get(header);
  if (position === undefined) {
    return "";
  }

  return (cells[position] ?? "").trim();
}

function validateRows(csvRows: string[][]): {
  rows: AssetIngestRow[];
  errors: IngestionError[];
} {
  const errors: IngestionError[] = [];

  if (csvRows.length === 0) {
    return {
      rows: [],
      errors: [{ row: 1, field: "file", message: "CSV is empty." }],
    };
  }

  const headerRow = csvRows[0].map(normalizeHeader);
  const headerMap = new Map<string, number>();
  headerRow.forEach((header, index) => {
    if (!headerMap.has(header)) {
      headerMap.set(header, index);
    }
  });

  const missingHeaders = REQUIRED_HEADERS.filter((header) => !headerMap.has(header));
  if (missingHeaders.length > 0) {
    return {
      rows: [],
      errors: [
        {
          row: 1,
          field: "headers",
          message: `Missing required header(s): ${missingHeaders.join(", ")}`,
        },
      ],
    };
  }

  const invalidHeaders = headerRow.filter((header) => header && !ALLOWED_HEADERS.has(header));
  if (invalidHeaders.length > 0) {
    return {
      rows: [],
      errors: [
        {
          row: 1,
          field: "headers",
          message: `Unsupported header(s): ${[...new Set(invalidHeaders)].join(", ")}`,
        },
      ],
    };
  }

  const parsedRows: AssetIngestRow[] = [];
  const serialToRow = new Map<string, number>();

  for (let index = 1; index < csvRows.length; index += 1) {
    const rowNumber = index + 1;
    const cells = csvRows[index];

    if (cells.every((cell) => cell.trim() === "")) {
      continue;
    }

    const name = cellValue(cells, headerMap, "name");
    const categoryName = cellValue(cells, headerMap, "category_name");
    const labName = cellValue(cells, headerMap, "lab_name");
    const serialNumber = cellValue(cells, headerMap, "serial_number");

    if (!name) {
      errors.push({ row: rowNumber, field: "name", message: "name is required." });
    }

    if (!categoryName) {
      errors.push({ row: rowNumber, field: "category_name", message: "category_name is required." });
    }

    if (!labName) {
      errors.push({ row: rowNumber, field: "lab_name", message: "lab_name is required." });
    }

    if (!serialNumber) {
      errors.push({ row: rowNumber, field: "serial_number", message: "serial_number is required." });
    } else {
      const previousRow = serialToRow.get(serialNumber);
      if (previousRow !== undefined) {
        errors.push({
          row: rowNumber,
          field: "serial_number",
          message: `Duplicate serial_number in file: ${serialNumber}. First seen at row ${previousRow}.`,
        });
      } else {
        serialToRow.set(serialNumber, rowNumber);
      }
    }

    parsedRows.push({
      rowNumber,
      name,
      categoryName,
      labName,
      serialNumber,
    });
  }

  return {
    rows: parsedRows,
    errors,
  };
}

async function getOrCreateCategory(name: string): Promise<{ id: string; name: string }> {
  const existing = await pool.query<{ id: string; name: string }>(
    `SELECT id::text AS id, name
     FROM categories
     WHERE name = $1
     LIMIT 1`,
    [name]
  );

  if (existing.rows[0]) {
    return existing.rows[0];
  }

  const inserted = await pool.query<{ id: string; name: string }>(
    `INSERT INTO categories (name)
     VALUES ($1)
     RETURNING id::text AS id, name`,
    [name]
  );

  return inserted.rows[0];
}

async function getOrCreateLab(name: string): Promise<{ id: string; name: string }> {
  const existing = await pool.query<{ id: string; name: string }>(
    `SELECT id::text AS id, name
     FROM labs
     WHERE name = $1
     LIMIT 1`,
    [name]
  );

  if (existing.rows[0]) {
    return existing.rows[0];
  }

  const inserted = await pool.query<{ id: string; name: string }>(
    `INSERT INTO labs (name)
     VALUES ($1)
     ON CONFLICT (name) DO NOTHING
     RETURNING id::text AS id, name`,
    [name]
  );

  if (inserted.rows[0]) {
    return inserted.rows[0];
  }

  const fallback = await pool.query<{ id: string; name: string }>(
    `SELECT id::text AS id, name
     FROM labs
     WHERE name = $1
     LIMIT 1`,
    [name]
  );

  if (!fallback.rows[0]) {
    throw new Error(`Unable to resolve lab: ${name}`);
  }

  return fallback.rows[0];
}

async function resolveRows(rows: AssetIngestRow[]): Promise<{ resolvedRows: ResolvedAssetIngestRow[]; errors: IngestionError[] }> {
  const resolvedRows: ResolvedAssetIngestRow[] = [];
  const errors: IngestionError[] = [];
  const categoryCache = new Map<string, { id: string; name: string }>();
  const labCache = new Map<string, { id: string; name: string }>();

  for (const row of rows) {
    try {
      let category = categoryCache.get(row.categoryName);
      if (!category) {
        category = await getOrCreateCategory(row.categoryName);
        categoryCache.set(row.categoryName, category);
      }

      let lab = labCache.get(row.labName);
      if (!lab) {
        lab = await getOrCreateLab(row.labName);
        labCache.set(row.labName, lab);
      }

      resolvedRows.push({
        ...row,
        categoryId: category.id,
        labId: lab.id,
      });
    } catch (error) {
      errors.push({
        row: row.rowNumber,
        field: "category_name/lab_name",
        message: (error as Error).message,
      });
    }
  }

  return { resolvedRows, errors };
}

async function ingestRows(rows: ResolvedAssetIngestRow[]): Promise<{ inserted: number; updated: number }> {
  const client = await pool.connect();
  let inserted = 0;
  let updated = 0;

  try {
    await client.query("BEGIN");

    for (const row of rows) {
      const existing = await client.query<{ id: string }>(
        "SELECT id::text AS id FROM assets WHERE serial_number = $1",
        [row.serialNumber]
      );

      if (existing.rowCount && existing.rowCount > 0) {
        await client.query(
          `UPDATE assets
           SET name = $1,
               category_id = $2::uuid,
               lab_id = $3::uuid
           WHERE serial_number = $4`,
          [row.name, row.categoryId, row.labId, row.serialNumber]
        );
        updated += 1;
      } else {
        await client.query(
          `INSERT INTO assets (name, category_id, lab_id, serial_number)
           VALUES ($1, $2::uuid, $3::uuid, $4)`,
          [row.name, row.categoryId, row.labId, row.serialNumber]
        );
        inserted += 1;
      }
    }

    await client.query("COMMIT");
    return { inserted, updated };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          ok: false,
          message: "file is required as multipart/form-data field 'file'.",
        },
        { status: 400 }
      );
    }

    const content = await file.text();
    const csvRows = parseCsv(content);
    const rowValidation = validateRows(csvRows);

    if (rowValidation.errors.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          message: "CSV validation failed. No rows were imported.",
          totalRows: Math.max(0, csvRows.length - 1),
          errorCount: rowValidation.errors.length,
          errors: rowValidation.errors,
        },
        { status: 400 }
      );
    }

    const resolved = await resolveRows(rowValidation.rows);
    if (resolved.errors.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          message: "CSV lookup failed. No rows were imported.",
          totalRows: rowValidation.rows.length,
          errorCount: resolved.errors.length,
          errors: resolved.errors,
        },
        { status: 400 }
      );
    }

    const result = await ingestRows(resolved.resolvedRows);

    return NextResponse.json({
      ok: true,
      message: "CSV ingestion completed.",
      totalRows: rowValidation.rows.length,
      inserted: result.inserted,
      updated: result.updated,
      rejected: 0,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: "CSV ingestion failed.",
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
