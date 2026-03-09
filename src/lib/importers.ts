import type { Column, Entity, DataType } from '../types';
import { createId } from './id';
import { ENTITY_COLORS } from '../types';

// Map SQL types to our DataType
function mapSqlType(sqlType: string): DataType {
  const t = sqlType.toLowerCase().trim();
  if (t.startsWith('uuid')) return 'uuid';
  if (t.startsWith('varchar') || t.startsWith('character varying')) return 'varchar';
  if (t.startsWith('char')) return 'char';
  if (t.startsWith('text') || t === 'longtext' || t === 'mediumtext' || t === 'tinytext') return 'text';
  if (t.startsWith('int') || t === 'integer' || t === 'int4' || t === 'int2') return 'integer';
  if (t.startsWith('bigint') || t === 'int8') return 'bigint';
  if (t.startsWith('smallint')) return 'smallint';
  if (t.startsWith('float') || t.startsWith('real') || t.startsWith('double')) return 'float';
  if (t.startsWith('decimal') || t.startsWith('numeric') || t.startsWith('money')) return 'decimal';
  if (t === 'bool' || t === 'boolean') return 'boolean';
  if (t.startsWith('timestamp')) return t.includes('with time zone') || t === 'timestamptz' ? 'timestamptz' : 'timestamp';
  if (t === 'date') return 'date';
  if (t === 'time') return 'time';
  if (t === 'datetime') return 'datetime';
  if (t === 'jsonb') return 'jsonb';
  if (t.startsWith('json')) return 'json';
  if (t.startsWith('enum')) return 'enum';
  if (t.startsWith('bytea') || t.startsWith('blob') || t.startsWith('binary')) return 'bytea';
  if (t.startsWith('serial') || t.startsWith('bigserial')) return 'integer';
  return 'string';
}

interface ParseError {
  message: string;
}

interface ParseResult {
  entities: Omit<Entity, 'id' | 'createdAt'>[];
  errors: ParseError[];
}

export function parseSql(sql: string): ParseResult {
  const entities: Omit<Entity, 'id' | 'createdAt'>[] = [];
  const errors: ParseError[] = [];

  // Normalize: remove comments
  let normalized = sql
    .replace(/--[^\n]*/g, '') // single line comments
    .replace(/\/\*[\s\S]*?\*\//g, '') // multi-line comments
    .replace(/\r\n/g, '\n')
    .trim();

  // Find all CREATE TABLE blocks
  const tableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:`|")?(\w+)(?:`|")?\s*\(([^;]*)\)/gi;

  let match: RegExpExecArray | null;
  let colorIdx = 0;

  while ((match = tableRegex.exec(normalized)) !== null) {
    const tableName = match[1];
    const body = match[2];

    const columns: Column[] = [];
    const pkColumns = new Set<string>();

    // Split on commas but respect nested parens
    const parts = splitByComma(body);

    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;

      const upper = trimmed.toUpperCase();

      // Table-level PRIMARY KEY constraint
      if (upper.startsWith('PRIMARY KEY')) {
        const pkMatch = trimmed.match(/PRIMARY\s+KEY\s*\(([^)]+)\)/i);
        if (pkMatch) {
          pkMatch[1].split(',').forEach((col) => {
            pkColumns.add(col.trim().replace(/[`"]/g, ''));
          });
        }
        continue;
      }

      // Table-level UNIQUE constraint
      if (upper.startsWith('UNIQUE') || upper.startsWith('KEY') || upper.startsWith('INDEX') ||
          upper.startsWith('CONSTRAINT') || upper.startsWith('FOREIGN KEY') || upper.startsWith('CHECK')) {
        continue;
      }

      // Column definition: name type [modifiers]
      const colMatch = trimmed.match(/^(?:`|")?(\w+)(?:`|")?\s+(.+)$/i);
      if (!colMatch) continue;

      const colName = colMatch[1];
      const rest = colMatch[2];

      // Extract type (first word(s) before space or constraint keywords)
      const typeMatch = rest.match(/^([^\s(]+(?:\s*\([^)]+\))?)/i);
      const rawType = typeMatch ? typeMatch[0] : rest.split(/\s/)[0];
      const dataType = mapSqlType(rawType);

      // Extract enum values from ENUM('a','b','c') syntax
      let enumValues = '';
      if (dataType === 'enum') {
        const evM = rawType.match(/^enum\s*\((.+)\)$/i);
        if (evM) {
          enumValues = evM[1].split(',').map((v) => v.trim().replace(/^['"`]|['"`]$/g, '')).filter(Boolean).join(', ');
        }
      }

      const restUpper = rest.toUpperCase();
      const nullable = !restUpper.includes('NOT NULL');
      const primaryKey = restUpper.includes('PRIMARY KEY');
      const unique = restUpper.includes('UNIQUE');
      const indexed = false;

      // Extract default
      const defaultMatch = rest.match(/DEFAULT\s+([^\s,]+)/i);
      const defaultValue = defaultMatch ? defaultMatch[1].replace(/['"]/g, '') : '';

      // Extract comment/note
      const commentMatch = rest.match(/COMMENT\s+'([^']+)'/i);
      const note = commentMatch ? commentMatch[1] : '';

      if (primaryKey) pkColumns.add(colName);

      columns.push({
        id: createId(),
        name: colName,
        dataType,
        nullable,
        primaryKey,
        unique,
        indexed,
        defaultValue,
        enumValues,
        check: '',
        references: null,
        note,
        order: columns.length,
      });
    }

    // Apply table-level PK
    pkColumns.forEach((colName) => {
      const col = columns.find((c) => c.name === colName);
      if (col) col.primaryKey = true;
    });

    entities.push({
      name: tableName,
      description: '',
      color: ENTITY_COLORS[colorIdx % ENTITY_COLORS.length],
      collapsed: false,
      updatedAt: Date.now(),
      tags: [],
      columns,
      updatedAt: Date.now(),
      tags: [],
    });

    colorIdx++;
  }

  if (entities.length === 0 && normalized.trim()) {
    errors.push({ message: 'No CREATE TABLE statements found. Make sure your SQL is valid.' });
  }

  return { entities, errors };
}

// --- JSON to Entity importer ---

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATETIME_RE = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function inferJsonType(value: unknown): DataType {
  if (value === null || value === undefined) return 'string';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'float';
  if (typeof value === 'string') {
    if (UUID_RE.test(value)) return 'uuid';
    if (ISO_DATETIME_RE.test(value)) return 'timestamp';
    if (ISO_DATE_RE.test(value)) return 'date';
    return value.length > 255 ? 'text' : 'varchar';
  }
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'object') return 'json';
  return 'string';
}

/** Merge type inference from multiple sample values (from array of records) */
function mergeTypes(types: DataType[]): DataType {
  const unique = [...new Set(types.filter(Boolean))];
  if (unique.length === 0) return 'string';
  if (unique.length === 1) return unique[0];
  // If integer + float => float
  if (unique.every((t) => t === 'integer' || t === 'float')) return 'float';
  // If mix includes string types => pick text over varchar
  if (unique.includes('text')) return 'text';
  if (unique.includes('varchar')) return 'varchar';
  return 'string';
}

export interface JsonImportResult {
  entity: Omit<Entity, 'id' | 'createdAt'> | null;
  error: string | null;
  /** Number of sample records used */
  sampleCount: number;
}

export function parseJsonToEntity(json: string, entityName: string, colorIndex = 0): JsonImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json.trim());
  } catch {
    return { entity: null, error: 'Invalid JSON — could not parse.', sampleCount: 0 };
  }

  // Accept an object or an array of objects
  const samples: Record<string, unknown>[] = [];
  if (Array.isArray(parsed)) {
    const objs = parsed.filter((v) => typeof v === 'object' && v !== null && !Array.isArray(v));
    if (objs.length === 0) return { entity: null, error: 'Array does not contain any objects.', sampleCount: 0 };
    samples.push(...(objs as Record<string, unknown>[]).slice(0, 20));
  } else if (typeof parsed === 'object' && parsed !== null) {
    samples.push(parsed as Record<string, unknown>);
  } else {
    return { entity: null, error: 'Expected a JSON object or array of objects.', sampleCount: 0 };
  }

  // Collect all keys and their types across samples
  const keyTypes = new Map<string, DataType[]>();
  const keyNullable = new Map<string, boolean>();
  const keyOrder = new Map<string, number>();

  samples.forEach((sample) => {
    Object.keys(sample).forEach((key) => {
      if (!keyOrder.has(key)) keyOrder.set(key, keyOrder.size);
      if (!keyTypes.has(key)) keyTypes.set(key, []);
      const val = sample[key];
      if (val === null || val === undefined) {
        keyNullable.set(key, true);
      } else {
        keyTypes.get(key)!.push(inferJsonType(val));
      }
    });
  });

  const name = entityName.trim() || 'imported';
  const columns: Column[] = [...keyOrder.entries()]
    .sort((a, b) => a[1] - b[1])
    .map(([key], i) => {
      const types = keyTypes.get(key) ?? [];
      const dataType = mergeTypes(types);
      const nullable = keyNullable.get(key) ?? false;
      const isPK = (key === 'id' || key === '_id' || key === `${name.toLowerCase()}_id`) && i === 0;
      return {
        id: createId(),
        name: key,
        dataType,
        nullable: isPK ? false : nullable,
        primaryKey: isPK,
        unique: isPK,
        indexed: false,
        defaultValue: '',
        enumValues: '',
        check: '',
        references: null,
        note: '',
        order: i,
      };
    });

  return {
    entity: {
      name,
      description: '',
      color: ENTITY_COLORS[colorIndex % ENTITY_COLORS.length],
      collapsed: false,
      updatedAt: Date.now(),
      tags: [],
      columns,
      updatedAt: Date.now(),
      tags: [],
    },
    error: null,
    sampleCount: samples.length,
  };
}

// --- CSV to Entity importer ---

/** Parse a single CSV/TSV row, handling double-quote escaping */
function parseCsvRow(line: string, delim: string): string[] {
  const cells: string[] = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuote = !inQuote;
    } else if (ch === delim && !inQuote) {
      cells.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  cells.push(cur.trim());
  return cells;
}

export function parseCsvToEntity(csv: string, entityName: string, colorIndex = 0): JsonImportResult {
  const lines = csv.trim().split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return { entity: null, error: 'No data found.', sampleCount: 0 };

  // Detect delimiter: prefer tab, then comma, then semicolon
  const firstLine = lines[0];
  const delim = firstLine.includes('\t') ? '\t' : firstLine.includes(';') ? ';' : ',';

  const headers = parseCsvRow(firstLine, delim).map((h) => h.replace(/^["']|["']$/g, ''));
  if (headers.length === 0) return { entity: null, error: 'No headers found in first row.', sampleCount: 0 };

  // Use data rows (if any) for type inference
  const dataRows = lines.slice(1, 21).map((l) => parseCsvRow(l, delim));
  const sampleCount = dataRows.length;

  const columns: Column[] = headers.map((header, i) => {
    const name = header.trim();
    const values = dataRows.map((row) => row[i] ?? '').filter((v) => v !== '' && v !== 'null' && v !== 'NULL');
    let dataType: DataType = 'varchar';
    if (values.length > 0) {
      const inferred = values.map((v) => inferCsvValueType(v));
      dataType = mergeTypes(inferred);
    }
    const nullable = dataRows.some((row) => !row[i] || row[i] === '' || row[i] === 'null' || row[i] === 'NULL');
    const isPK = name === 'id' || name === `${entityName}_id`;
    return {
      id: createId(),
      name,
      dataType,
      nullable: isPK ? false : nullable,
      primaryKey: isPK,
      unique: isPK,
      indexed: false,
      defaultValue: '',
      enumValues: '',
      check: '',
      references: null,
      note: '',
      order: i,
    };
  });

  return {
    entity: {
      name: entityName || 'imported',
      description: '',
      color: ENTITY_COLORS[colorIndex % ENTITY_COLORS.length],
      collapsed: false,
      updatedAt: Date.now(),
      tags: [],
      columns,
      updatedAt: Date.now(),
      tags: [],
    },
    error: null,
    sampleCount,
  };
}

function inferCsvValueType(v: string): DataType {
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)) return 'uuid';
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(v)) return 'timestamp';
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return 'date';
  if (v === 'true' || v === 'false' || v === '1' || v === '0') {
    // '1'/'0' could also be integers; prefer boolean only for true/false
    if (v === 'true' || v === 'false') return 'boolean';
  }
  if (/^-?\d+$/.test(v)) return 'integer';
  if (/^-?\d+\.\d+$/.test(v)) return 'float';
  if (v.length > 255) return 'text';
  return 'varchar';
}

// Split by comma, respecting nested parentheses
function splitByComma(str: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';

  for (const char of str) {
    if (char === '(') depth++;
    else if (char === ')') depth--;
    else if (char === ',' && depth === 0) {
      parts.push(current);
      current = '';
      continue;
    }
    current += char;
  }

  if (current.trim()) parts.push(current);
  return parts;
}
