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
  categoryName: string | null;
  categoryId: string | null;
  labName: string | null;
  labId: string | null;
  serialNumber: string;
  checkedOut: boolean;
  checkedOutTo: string | null;
};

type ResolvedAssetIngestRow = AssetIngestRow & {
  categoryName: string;
  categoryId: string;
  labName: string;
  labId: string;
};

const REQUIRED_HEADERS = ["name", "serial_number"] as const;
const CATEGORY_REFERENCE_HEADERS = ["category_name", "category_id"] as const;
const LAB_REFERENCE_HEADERS = ["lab_name", "lab_id"] as const;
const OPTIONAL_HEADERS = ["checked_out", "checked_out_to"] as const;

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

function parseBoolean(value: string | undefined): boolean | null {
  if (value === undefined) {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "") {
    return false;
  }

  if (["true", "t", "1", "yes", "y"].includes(normalized)) {
    return true;
  }

  if (["false", "f", "0", "no", "n"].includes(normalized)) {
    return false;
  }

  return null;
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

  const hasCategoryNameHeader = headerMap.has("category_name");
  const hasCategoryIdHeader = headerMap.has("category_id");
  if (!hasCategoryNameHeader && !hasCategoryIdHeader) {
    return {
      rows: [],
      errors: [
        {
          row: 1,
          field: "headers",
          message: "Missing required header: provide category_name or category_id.",
        },
      ],
    };
  }

  const hasLabNameHeader = headerMap.has("lab_name");
  const hasLabIdHeader = headerMap.has("lab_id");
  if (!hasLabNameHeader && !hasLabIdHeader) {
    return {
      rows: [],
      errors: [
        {
          row: 1,
          field: "headers",
          message: "Missing required header: provide lab_name or lab_id.",
        },
      ],
    };
  }

  const allowedHeaders = new Set<string>([
    ...REQUIRED_HEADERS,
    ...CATEGORY_REFERENCE_HEADERS,
    ...LAB_REFERENCE_HEADERS,
    ...OPTIONAL_HEADERS,
  ]);
  const invalidHeaders = headerRow.filter((header) => header && !allowedHeaders.has(header));
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
    const categoryNameRaw = cellValue(cells, headerMap, "category_name");
    const categoryIdRaw = cellValue(cells, headerMap, "category_id");
    const labNameRaw = cellValue(cells, headerMap, "lab_name");
    const labIdRaw = cellValue(cells, headerMap, "lab_id");
    const serialNumber = cellValue(cells, headerMap, "serial_number");
    const checkedOutRaw = cellValue(cells, headerMap, "checked_out");
    const checkedOutToRaw = cellValue(cells, headerMap, "checked_out_to");

    const categoryName = categoryNameRaw === "" ? null : categoryNameRaw;
    const categoryId = categoryIdRaw === "" ? null : categoryIdRaw;
    const labName = labNameRaw === "" ? null : labNameRaw;
    const labId = labIdRaw === "" ? null : labIdRaw;

    if (!name) {
      errors.push({ row: rowNumber, field: "name", message: "name is required." });
    }

    if (!categoryName && !categoryId) {
      errors.push({
        row: rowNumber,
        field: "category_name/category_id",
        message: "Provide category_name or category_id.",
      });
    }

    if (!labName && !labId) {
      errors.push({
        row: rowNumber,
        field: "lab_name/lab_id",
        message: "Provide lab_name or lab_id.",
      });
    }

    if (!serialNumber) {
      errors.push({ row: rowNumber, field: "serial_number", message: "serial_number is required." });
    }

    if (serialNumber) {
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

    const checkedOut = parseBoolean(checkedOutRaw);
    if (checkedOut === null) {
      errors.push({
        row: rowNumber,
        field: "checked_out",
        message: `Invalid boolean value: ${checkedOutRaw}. Use true/false.`,
      });
      continue;
    }

    const checkedOutTo = checkedOutToRaw === "" ? null : checkedOutToRaw;

    if (!checkedOut && checkedOutTo !== null) {
      errors.push({
        row: rowNumber,
        field: "checked_out_to",
        message: "checked_out_to must be empty when checked_out is false.",
      });
    }

    if (checkedOut && checkedOutTo === null) {
      errors.push({
        row: rowNumber,
        field: "checked_out_to",
        message: "checked_out_to is required when checked_out is true.",
      });
    }

    parsedRows.push({
      rowNumber,
      name,
      categoryName,
      categoryId,
      labName,
      labId,
      serialNumber,
      checkedOut,
      checkedOutTo,
    });
  }

  return {
    rows: parsedRows,
    errors,
  };
}

async function resolveForeignKeys(
  rows: AssetIngestRow[]
): Promise<{ resolvedRows: ResolvedAssetIngestRow[]; errors: IngestionError[] }> {
  const errors: IngestionError[] = [];

  const categoryNames = [
    ...new Set(rows.map((row) => row.categoryName).filter((value): value is string => value !== null)),
  ];
  const categoryIds = [
    ...new Set(rows.map((row) => row.categoryId).filter((value): value is string => value !== null)),
  ];
  const labNames = [...new Set(rows.map((row) => row.labName).filter((value): value is string => value !== null))];
  const labIds = [...new Set(rows.map((row) => row.labId).filter((value): value is string => value !== null))];

  const categoryRows: { id: string; name: string }[] =
    categoryNames.length === 0 && categoryIds.length === 0
      ? []
      : (
          await pool.query<{ id: string; name: string }>(
            `SELECT id::text AS id, name
             FROM categories
             WHERE ($1::text[] IS NOT NULL AND name = ANY($1::text[]))
                OR ($2::text[] IS NOT NULL AND id::text = ANY($2::text[]))`,
            [categoryNames.length > 0 ? categoryNames : null, categoryIds.length > 0 ? categoryIds : null]
          )
        ).rows;

  const labRows: { id: string; name: string }[] =
    labNames.length === 0 && labIds.length === 0
      ? []
      : (
          await pool.query<{ id: string; name: string }>(
            `SELECT id::text AS id, name
             FROM labs
             WHERE ($1::text[] IS NOT NULL AND name = ANY($1::text[]))
                OR ($2::text[] IS NOT NULL AND id::text = ANY($2::text[]))`,
            [labNames.length > 0 ? labNames : null, labIds.length > 0 ? labIds : null]
          )
        ).rows;

  const categoryNameToId = new Map<string, string>();
  const categoryIdToName = new Map<string, string>();
  for (const row of categoryRows) {
    categoryNameToId.set(row.name, row.id);
    categoryIdToName.set(row.id, row.name);
  }

  const labNameToId = new Map<string, string>();
  const labIdToName = new Map<string, string>();
  for (const row of labRows) {
    labNameToId.set(row.name, row.id);
    labIdToName.set(row.id, row.name);
  }

  const resolvedRows: ResolvedAssetIngestRow[] = [];

  for (const row of rows) {
    const resolvedCategoryByName = row.categoryName ? categoryNameToId.get(row.categoryName) : undefined;
    const resolvedCategoryByIdName = row.categoryId ? categoryIdToName.get(row.categoryId) : undefined;
    const categoryId = row.categoryId ?? resolvedCategoryByName;
    const categoryName = row.categoryName ?? resolvedCategoryByIdName;

    if (!categoryId || !categoryName) {
      errors.push({
        row: row.rowNumber,
        field: row.categoryId ? "category_id" : "category_name",
        message: row.categoryId
          ? `category_id does not exist: ${row.categoryId}`
          : `category_name does not exist: ${row.categoryName}`,
      });
    }

    if (
      row.categoryId &&
      row.categoryName &&
      resolvedCategoryByIdName &&
      row.categoryName !== resolvedCategoryByIdName
    ) {
      errors.push({
        row: row.rowNumber,
        field: "category_name",
        message: `category_name does not match category_id. Expected ${resolvedCategoryByIdName}.`,
      });
    }

    const resolvedLabByName = row.labName ? labNameToId.get(row.labName) : undefined;
    const resolvedLabByIdName = row.labId ? labIdToName.get(row.labId) : undefined;
    const labId = row.labId ?? resolvedLabByName;
    const labName = row.labName ?? resolvedLabByIdName;

    if (!labId || !labName) {
      errors.push({
        row: row.rowNumber,
        field: row.labId ? "lab_id" : "lab_name",
        message: row.labId ? `lab_id does not exist: ${row.labId}` : `lab_name does not exist: ${row.labName}`,
      });
    }

    if (row.labId && row.labName && resolvedLabByIdName && row.labName !== resolvedLabByIdName) {
      errors.push({
        row: row.rowNumber,
        field: "lab_name",
        message: `lab_name does not match lab_id. Expected ${resolvedLabByIdName}.`,
      });
    }

    if (categoryId && categoryName && labId && labName) {
      resolvedRows.push({
        ...row,
        categoryName,
        categoryId,
        labName,
        labId,
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
               lab_id = $3::uuid,
               checked_out_to = $4,
               checked_out = $5
           WHERE serial_number = $6`,
          [row.name, row.categoryId, row.labId, row.checkedOutTo, row.checkedOut, row.serialNumber]
        );
        updated += 1;
      } else {
        await client.query(
          `INSERT INTO assets (name, category_id, lab_id, serial_number, checked_out_to, checked_out)
           VALUES ($1, $2::uuid, $3::uuid, $4, $5, $6)`,
          [row.name, row.categoryId, row.labId, row.serialNumber, row.checkedOutTo, row.checkedOut]
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

    const resolved = await resolveForeignKeys(rowValidation.rows);
    if (resolved.errors.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          message: "Foreign key validation failed. No rows were imported.",
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
