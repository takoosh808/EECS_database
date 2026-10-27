import { randomBytes, scryptSync } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

export const runtime = "nodejs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const USER_HEADERS = [
  "user_id",
  "name",
  "email",
  "role",
  "password_hash",
  "created_at",
  "updated_at",
] as const;
const ALLOWED_ROLES = new Set(["user", "admin"]);
const HASH_PATTERN = /^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/i;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type IngestionError = {
  row: number;
  field: string;
  message: string;
};

type CsvUser = {
  rowNumber: number;
  userId: string;
  name: string;
  email: string;
  role: "user" | "admin";
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
};

function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let currentField = "";
  let currentRow: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];
    const nextCharacter = content[index + 1];

    if (character === '"') {
      if (inQuotes && nextCharacter === '"') {
        currentField += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (character === "," && !inQuotes) {
      currentRow.push(currentField);
      currentField = "";
    } else if ((character === "\n" || character === "\r") && !inQuotes) {
      if (character === "\r" && nextCharacter === "\n") index += 1;
      currentRow.push(currentField);
      if (currentRow.some((cell) => cell.trim())) rows.push(currentRow);
      currentField = "";
      currentRow = [];
    } else {
      currentField += character;
    }
  }

  if (currentField.length || currentRow.length) {
    currentRow.push(currentField);
    if (currentRow.some((cell) => cell.trim())) rows.push(currentRow);
  }

  return rows;
}

function generateTemporaryPassword(): string {
  const alphabet =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const values = new Uint32Array(16);
  randomBytes(values.length * 4).copy(Buffer.from(values.buffer));
  return Array.from(values, (value) => alphabet[value % alphabet.length]).join(
    "",
  );
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, Buffer.from(salt, "hex"), 64).toString(
    "hex",
  );
  return `scrypt$${salt}$${hash}`;
}

async function getRole(request: NextRequest): Promise<string | null> {
  const userId = request.cookies.get("auth_user")?.value;
  if (!userId) return null;

  const result = await pool.query<{ role: string }>(
    "SELECT role FROM users WHERE user_id::text = $1 LIMIT 1",
    [userId],
  );
  return result.rows[0]?.role ?? null;
}

function validateCsv(csvRows: string[][]): {
  rows: CsvUser[];
  errors: IngestionError[];
} {
  const errors: IngestionError[] = [];
  if (csvRows.length === 0) {
    return { rows: [], errors: [{ row: 1, field: "file", message: "CSV is empty." }] };
  }

  const headers = csvRows[0].map((header) =>
    header.replace(/^\uFEFF/, "").trim().toLowerCase(),
  );
  const duplicateHeaders = headers.filter(
    (header, index) => headers.indexOf(header) !== index,
  );
  const missingHeaders = USER_HEADERS.filter((header) => !headers.includes(header));
  const unsupportedHeaders = headers.filter(
    (header) => header && !USER_HEADERS.includes(header as (typeof USER_HEADERS)[number]),
  );

  if (duplicateHeaders.length || missingHeaders.length || unsupportedHeaders.length) {
    return {
      rows: [],
      errors: [
        {
          row: 1,
          field: "headers",
          message: [
            missingHeaders.length ? `Missing: ${missingHeaders.join(", ")}` : "",
            unsupportedHeaders.length
              ? `Unsupported: ${[...new Set(unsupportedHeaders)].join(", ")}`
              : "",
            duplicateHeaders.length
              ? `Duplicate: ${[...new Set(duplicateHeaders)].join(", ")}`
              : "",
          ]
            .filter(Boolean)
            .join(". "),
        },
      ],
    };
  }

  const headerMap = new Map(headers.map((header, index) => [header, index]));
  const values = (cells: string[], header: (typeof USER_HEADERS)[number]) =>
    (cells[headerMap.get(header)!] ?? "").trim();
  const rows: CsvUser[] = [];
  const seenEmails = new Set<string>();
  const seenIds = new Set<string>();

  for (let index = 1; index < csvRows.length; index += 1) {
    const cells = csvRows[index];
    const rowNumber = index + 1;
    if (cells.every((cell) => !cell.trim())) continue;

    if (cells.slice(USER_HEADERS.length).some((cell) => cell.trim())) {
      errors.push({ row: rowNumber, field: "row", message: "Too many CSV values." });
      continue;
    }

    const userId = values(cells, "user_id");
    const name = values(cells, "name");
    const email = values(cells, "email").toLowerCase();
    const roleValue = values(cells, "role").toLowerCase() || "user";
    const passwordHash = values(cells, "password_hash");
    const createdAt = values(cells, "created_at");
    const updatedAt = values(cells, "updated_at");
    let rowIsValid = true;

    if (!name) {
      errors.push({ row: rowNumber, field: "name", message: "name is required." });
      rowIsValid = false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push({ row: rowNumber, field: "email", message: "A valid email is required." });
      rowIsValid = false;
    } else if (seenEmails.has(email)) {
      errors.push({ row: rowNumber, field: "email", message: `Duplicate email in file: ${email}.` });
      rowIsValid = false;
    } else {
      seenEmails.add(email);
    }
    if (!ALLOWED_ROLES.has(roleValue)) {
      errors.push({ row: rowNumber, field: "role", message: "role must be user or admin." });
      rowIsValid = false;
    }
    if (userId && !UUID_PATTERN.test(userId)) {
      errors.push({ row: rowNumber, field: "user_id", message: "user_id must be a UUID or blank." });
      rowIsValid = false;
    } else if (userId && seenIds.has(userId.toLowerCase())) {
      errors.push({ row: rowNumber, field: "user_id", message: `Duplicate user_id in file: ${userId}.` });
      rowIsValid = false;
    } else if (userId) {
      seenIds.add(userId.toLowerCase());
    }
    if (passwordHash && !HASH_PATTERN.test(passwordHash)) {
      errors.push({
        row: rowNumber,
        field: "password_hash",
        message: "Provide a valid scrypt hash or leave blank to generate a temporary password.",
      });
      rowIsValid = false;
    }
    for (const [field, value] of [
      ["created_at", createdAt],
      ["updated_at", updatedAt],
    ]) {
      if (value && Number.isNaN(Date.parse(value))) {
        errors.push({ row: rowNumber, field, message: `${field} must be a valid timestamp or blank.` });
        rowIsValid = false;
      }
    }

    if (rowIsValid) {
      rows.push({
        rowNumber,
        userId,
        name,
        email,
        role: roleValue as "user" | "admin",
        passwordHash,
        createdAt,
        updatedAt,
      });
    }
  }

  return { rows, errors };
}

export async function POST(request: NextRequest) {
  let client;
  try {
    if ((await getRole(request)) !== "admin") {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "CSV file is required." }, { status: 400 });
    }

    const csvRows = parseCsv(await file.text());
    const validated = validateCsv(csvRows);
    if (validated.errors.length) {
      return NextResponse.json(
        {
          ok: false,
          message: "CSV validation failed. No users were imported.",
          totalRows: Math.max(0, csvRows.length - 1),
          rejected: validated.errors.length,
          errorCount: validated.errors.length,
          errors: validated.errors,
        },
        { status: 400 },
      );
    }

    client = await pool.connect();
    await client.query("BEGIN");
    const generatedCredentials: { email: string; temporaryPassword: string }[] = [];

    for (const user of validated.rows) {
      const temporaryPassword = user.passwordHash
        ? null
        : generateTemporaryPassword();
      const passwordHash = user.passwordHash || hashPassword(temporaryPassword!);

      await client.query(
        `INSERT INTO users (user_id, name, email, role, password_hash, created_at, updated_at)
         VALUES (
           COALESCE($1::uuid, gen_random_uuid()), $2, $3, $4, $5,
           COALESCE($6::timestamptz, NOW()), COALESCE($7::timestamptz, NOW())
         )`,
        [
          user.userId || null,
          user.name,
          user.email,
          user.role,
          passwordHash,
          user.createdAt || null,
          user.updatedAt || null,
        ],
      );

      if (temporaryPassword) {
        generatedCredentials.push({ email: user.email, temporaryPassword });
      }
    }

    await client.query("COMMIT");
    return NextResponse.json({
      ok: true,
      message: "User CSV import completed.",
      totalRows: validated.rows.length,
      inserted: validated.rows.length,
      updated: 0,
      rejected: 0,
      generatedCredentials,
    });
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(() => undefined);
    const code = (error as { code?: string }).code;
    return NextResponse.json(
      {
        ok: false,
        message: code === "23505" ? "A user ID or email already exists." : "User CSV import failed.",
        error: (error as Error).message,
      },
      { status: code === "23505" ? 409 : 500 },
    );
  } finally {
    client?.release();
  }
}