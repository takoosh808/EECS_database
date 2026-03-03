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
  categoryId: string;
  labId: string;
  serialNumber: string;
  checkedOut: boolean;
  checkedOutTo: string | null;
};

const REQUIRED_HEADERS = ["name", "category_id", "lab_id", "serial_number"] as const;
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

  const allowedHeaders = new Set<string>([...REQUIRED_HEADERS, ...OPTIONAL_HEADERS]);
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
    const categoryId = cellValue(cells, headerMap, "category_id");
    const labId = cellValue(cells, headerMap, "lab_id");
    const serialNumber = cellValue(cells, headerMap, "serial_number");
    const checkedOutRaw = cellValue(cells, headerMap, "checked_out");
    const checkedOutToRaw = cellValue(cells, headerMap, "checked_out_to");

    if (!name) {
      errors.push({ row: rowNumber, field: "name", message: "name is required." });
    }

    if (!categoryId) {
      errors.push({ row: rowNumber, field: "category_id", message: "category_id is required." });
    }

    if (!labId) {
      errors.push({ row: rowNumber, field: "lab_id", message: "lab_id is required." });
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
      categoryId,
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

async function validateForeignKeys(rows: AssetIngestRow[]): Promise<IngestionError[]> {
  const errors: IngestionError[] = [];

  const categoryIds = [...new Set(rows.map((row) => row.categoryId))];
  const labIds = [...new Set(rows.map((row) => row.labId))];

  const categoryRows: { id: string }[] =
    categoryIds.length === 0
      ? []
      : (
          await pool.query<{ id: string }>(
            "SELECT id::text AS id FROM categories WHERE id = ANY($1::uuid[])",
            [categoryIds]
          )
        ).rows;

  const labRows: { id: string }[] =
    labIds.length === 0
      ? []
      : (
          await pool.query<{ id: string }>(
            "SELECT id::text AS id FROM labs WHERE id = ANY($1::uuid[])",
            [labIds]
          )
        ).rows;

  const validCategoryIds = new Set<string>(categoryRows.map((row: { id: string }) => row.id));
  const validLabIds = new Set<string>(labRows.map((row: { id: string }) => row.id));

  for (const row of rows) {
    if (!validCategoryIds.has(row.categoryId)) {
      errors.push({
        row: row.rowNumber,
        field: "category_id",
        message: `category_id does not exist: ${row.categoryId}`,
      });
    }

    if (!validLabIds.has(row.labId)) {
      errors.push({
        row: row.rowNumber,
        field: "lab_id",
        message: `lab_id does not exist: ${row.labId}`,
      });
    }
  }

  return errors;
}

async function ingestRows(rows: AssetIngestRow[]): Promise<{ inserted: number; updated: number }> {
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

    const foreignKeyErrors = await validateForeignKeys(rowValidation.rows);
    if (foreignKeyErrors.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          message: "Foreign key validation failed. No rows were imported.",
          totalRows: rowValidation.rows.length,
          errorCount: foreignKeyErrors.length,
          errors: foreignKeyErrors,
        },
        { status: 400 }
      );
    }

    const result = await ingestRows(rowValidation.rows);

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
