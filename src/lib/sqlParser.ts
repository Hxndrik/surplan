import type { DataType } from '../types';

export interface ParsedColumn {
  name: string;
  dataType: DataType;
  nullable: boolean;
  primaryKey: boolean;
  unique: boolean;
  defaultValue: string;
  enumValues: string;
  check: string;
  note: string;
}

export interface ParsedTable {
  name: string;
  columns: ParsedColumn[];
}

/** Extract comma-separated enum values from ENUM('a','b','c') or similar */
function extractEnumValues(sqlType: string): string {
  const m = sqlType.match(/^enum\s*\((.+)\)$/i);
  if (!m) return '';
  return m[1]
    .split(',')
    .map((v) => v.trim().replace(/^['"`]|['"`]$/g, ''))
    .filter(Boolean)
    .join(', ');
}

function mapSqlType(sqlType: string): DataType {
  const base = sqlType.toLowerCase().replace(/\s*\(.*\)$/, '').trim();
  const map: Record<string, DataType> = {
    uuid: 'uuid',
    varchar: 'varchar', 'character varying': 'varchar',
    char: 'char', character: 'char', bpchar: 'char',
    text: 'text', tinytext: 'text', mediumtext: 'text', longtext: 'text',
    int: 'integer', integer: 'integer', int4: 'integer', serial: 'integer',
    bigint: 'bigint', int8: 'bigint', bigserial: 'bigint',
    smallint: 'smallint', int2: 'smallint', tinyint: 'smallint',
    float: 'float', float4: 'float', float8: 'float', real: 'float',
    'double precision': 'float', double: 'float',
    decimal: 'decimal', numeric: 'numeric', money: 'decimal',
    boolean: 'boolean', bool: 'boolean',
    date: 'date',
    timestamp: 'timestamp', 'timestamp without time zone': 'timestamp', datetime: 'datetime',
    timestamptz: 'timestamptz', 'timestamp with time zone': 'timestamptz',
    time: 'time',
    json: 'json', jsonb: 'jsonb',
    bytea: 'bytea', blob: 'blob', binary: 'bytea', varbinary: 'bytea',
    enum: 'enum',
    array: 'array',
  };
  // Handle array suffix like text[], integer[]
  if (base.endsWith('[]')) return 'array';
  return map[base] ?? 'string';
}

function splitTopLevel(s: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of s) {
    if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth--;
    if (ch === ',' && depth === 0) {
      parts.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts;
}

export function parseSqlCreateTable(sql: string): ParsedTable[] {
  const tables: ParsedTable[] = [];

  // Strip comments
  const cleaned = sql
    .replace(/--[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');

  const tableRegex =
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:["'`]?\w+["'`]?\.)?["'`]?(\w+)["'`]?\s*\(/gi;
  let tableMatch: RegExpExecArray | null;

  while ((tableMatch = tableRegex.exec(cleaned)) !== null) {
    const tableName = tableMatch[1];
    const openIdx = tableMatch.index + tableMatch[0].length - 1;

    // Find matching close paren
    let depth = 0;
    let closeIdx = openIdx;
    for (let i = openIdx; i < cleaned.length; i++) {
      if (cleaned[i] === '(') depth++;
      else if (cleaned[i] === ')') {
        depth--;
        if (depth === 0) { closeIdx = i; break; }
      }
    }

    const body = cleaned.slice(openIdx + 1, closeIdx);
    const lines = splitTopLevel(body);

    const pkCols = new Set<string>();
    const uniqueCols = new Set<string>();

    // Collect table-level constraints
    for (const line of lines) {
      if (/^(?:CONSTRAINT\s+\w+\s+)?PRIMARY\s+KEY/i.test(line.trim())) {
        const m = line.match(/PRIMARY\s+KEY\s*\(([^)]+)\)/i);
        if (m) m[1].split(',').forEach((c) => pkCols.add(c.trim().replace(/["'`]/g, '').toLowerCase()));
      }
      if (/^(?:CONSTRAINT\s+\w+\s+)?UNIQUE\s*\(/i.test(line.trim())) {
        const m = line.match(/UNIQUE\s*\(([^)]+)\)/i);
        if (m) m[1].split(',').forEach((c) => uniqueCols.add(c.trim().replace(/["'`]/g, '').toLowerCase()));
      }
    }

    const columns: ParsedColumn[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      // Skip constraint-only lines
      if (/^(?:CONSTRAINT|PRIMARY\s+KEY|FOREIGN\s+KEY|UNIQUE\s*\(|CHECK\s*\(|INDEX|KEY\s+\w|FULLTEXT|SPATIAL)/i.test(trimmed)) continue;

      // column_name type [constraints]
      const nameMatch = trimmed.match(/^["'`]?(\w+)["'`]?\s+(.+)$/s);
      if (!nameMatch) continue;
      const colName = nameMatch[1];
      const rest = nameMatch[2];

      // Extract type (stops at constraint keywords)
      const typeEnd = rest.search(/\s+(?:NOT\s+NULL|NULL\b|PRIMARY|UNIQUE|DEFAULT|REFERENCES|CHECK|GENERATED|CONSTRAINT|AUTO_INCREMENT)/i);
      const typeStr = (typeEnd === -1 ? rest : rest.slice(0, typeEnd)).trim();

      const isPK = /PRIMARY\s+KEY/i.test(rest) || pkCols.has(colName.toLowerCase());
      const isNotNull = /NOT\s+NULL/i.test(rest);
      const isUnique = /\bUNIQUE\b/i.test(rest) || uniqueCols.has(colName.toLowerCase());

      let defaultValue = '';
      const defM = rest.match(/DEFAULT\s+(.+?)(?:\s+(?:NOT\s+NULL|NULL\b|PRIMARY|UNIQUE|REFERENCES|CHECK|GENERATED|CONSTRAINT|AUTO_INCREMENT)|$)/i);
      if (defM) {
        defaultValue = defM[1].trim().replace(/::[\w\s[\]]+$/, '').trim(); // strip postgres casts
      }

      // Extract inline CHECK constraint
      let check = '';
      const checkM = rest.match(/CHECK\s*\(([^)]+)\)/i);
      if (checkM) check = checkM[1].trim();

      const dataType = mapSqlType(typeStr);
      columns.push({
        name: colName,
        dataType,
        nullable: isPK ? false : !isNotNull,
        primaryKey: isPK,
        unique: isUnique && !isPK,
        defaultValue,
        enumValues: dataType === 'enum' ? extractEnumValues(typeStr) : '',
        check,
        note: '',
      });
    }

    if (columns.length > 0) {
      tables.push({ name: tableName, columns });
    }
  }

  return tables;
}

// --- Prisma schema parser ---

function mapPrismaType(prismaType: string): DataType {
  const base = prismaType.replace(/\?$/, '').replace(/\[\]$/, '');
  if (prismaType.endsWith('[]')) return 'array';
  const map: Record<string, DataType> = {
    String: 'text', Int: 'integer', BigInt: 'bigint', Float: 'float',
    Decimal: 'decimal', Boolean: 'boolean', DateTime: 'timestamp',
    Json: 'jsonb', Bytes: 'bytea',
  };
  return map[base] ?? 'string';
}

export function parsePrismaSchema(schema: string): ParsedTable[] {
  const tables: ParsedTable[] = [];

  // Strip comments
  const cleaned = schema.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');

  // Collect enum declarations: enum Name { VAL1 VAL2 ... }
  const enumMap = new Map<string, string>(); // enumName -> "VAL1, VAL2, ..."
  const enumRegex = /enum\s+(\w+)\s*\{([^}]+)\}/g;
  let em: RegExpExecArray | null;
  while ((em = enumRegex.exec(cleaned)) !== null) {
    const enumName = em[1];
    const vals = em[2].split(/\s+/).map((v) => v.trim()).filter(Boolean);
    enumMap.set(enumName, vals.join(', '));
  }

  // Match model blocks
  const modelRegex = /model\s+(\w+)\s*\{([^}]+)\}/g;
  let m: RegExpExecArray | null;

  while ((m = modelRegex.exec(cleaned)) !== null) {
    const modelName = m[1];
    const body = m[2];
    const lines = body.split('\n').map((l) => l.trim()).filter(Boolean);

    const columns: ParsedColumn[] = [];

    for (const line of lines) {
      // Skip directives like @@id, @@unique, @@index, @@map
      if (line.startsWith('@@') || line.startsWith('//')) continue;

      // field_name  Type  [?]  [@attributes...]
      const fieldMatch = line.match(/^(\w+)\s+(\w+)(\?|\[\])?(\s+.+)?$/);
      if (!fieldMatch) continue;

      const fieldName = fieldMatch[1];
      const rawType = fieldMatch[2];
      const modifier = (fieldMatch[3] ?? '').trim(); // '?' = optional/nullable, '[]' = array
      const attrs = fieldMatch[4] ?? '';

      const scalarTypes = new Set(['String', 'Int', 'BigInt', 'Float', 'Decimal', 'Boolean', 'DateTime', 'Json', 'Bytes']);
      const isEnum = enumMap.has(rawType);

      // Skip relation fields (type starts with uppercase, is not a scalar type, and not a known enum)
      if (!scalarTypes.has(rawType) && !isEnum && rawType[0] === rawType[0].toUpperCase()) continue;

      const isNullable = modifier === '?';
      const isArray = modifier === '[]';
      const isPK = /@id\b/.test(attrs);
      const isUnique = /@unique\b/.test(attrs);

      let defaultValue = '';
      const defM = attrs.match(/@default\(([^)]+)\)/);
      if (defM) defaultValue = defM[1].trim();

      columns.push({
        name: fieldName,
        dataType: isArray ? 'array' : (isEnum ? 'enum' : mapPrismaType(rawType)),
        nullable: isNullable,
        primaryKey: isPK,
        unique: isUnique && !isPK,
        defaultValue,
        enumValues: isEnum ? (enumMap.get(rawType) ?? '') : '',
        check: '',
        note: '',
      });
    }

    if (columns.length > 0) {
      tables.push({ name: modelName, columns });
    }
  }

  return tables;
}

// --- TypeScript interface parser ---

function mapTSType(tsType: string): { dataType: DataType; nullable: boolean } {
  const nullable = /\bnull\b/.test(tsType) || /\bundefined\b/.test(tsType);
  const base = tsType
    .replace(/\s*\|\s*null\b/g, '')
    .replace(/\s*\|\s*undefined\b/g, '')
    .trim();

  if (base === 'string') return { dataType: 'varchar', nullable };
  if (base === 'number') return { dataType: 'float', nullable };
  if (base === 'boolean') return { dataType: 'boolean', nullable };
  if (base === 'Date') return { dataType: 'timestamp', nullable };
  if (base === 'bigint') return { dataType: 'bigint', nullable };
  if (base.endsWith('[]') || base.startsWith('Array<')) return { dataType: 'array', nullable };
  if (base.startsWith('Record<') || base === 'object' || (base.startsWith('{') && base.endsWith('}'))) {
    return { dataType: 'json', nullable };
  }
  // string literal union → enum
  if (/^['"][^'"]+['"](\s*\|\s*['"][^'"]+['"])+$/.test(base)) {
    return { dataType: 'enum', nullable };
  }
  // Any other named type → json
  return { dataType: 'json', nullable };
}

function extractTSEnumValues(tsType: string): string {
  const vals: string[] = [];
  const re = /['"]([^'"]+)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(tsType)) !== null) vals.push(m[1]);
  return vals.join(', ');
}

export function parseTSInterfaces(schema: string): ParsedTable[] {
  const tables: ParsedTable[] = [];
  // Strip comments
  const cleaned = schema
    .replace(/\/\/[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');

  // Match `interface Foo { ... }` and `type Foo = { ... }`
  const blockRegex = /(?:(?:export\s+)?interface\s+(\w+)|(?:export\s+)?type\s+(\w+)\s*=)\s*\{([^}]*)\}/g;
  let m: RegExpExecArray | null;

  while ((m = blockRegex.exec(cleaned)) !== null) {
    const name = m[1] || m[2];
    const body = m[3];
    const lines = body.split('\n').map((l) => l.trim()).filter(Boolean);
    const columns: ParsedColumn[] = [];

    for (const line of lines) {
      // Skip index signatures: [key: string]: value
      if (/^\[/.test(line)) continue;

      // Match: fieldName[?]: type[;,]
      const fieldMatch = line.match(/^(\w+)(\?)?:\s*(.+?)[;,]?\s*$/);
      if (!fieldMatch) continue;

      const fieldName = fieldMatch[1];
      const optional = !!fieldMatch[2];
      const rawType = fieldMatch[3].trim();

      const { dataType, nullable } = mapTSType(rawType);
      const isPK = (fieldName === 'id' || fieldName === '_id') && columns.length === 0;

      columns.push({
        name: fieldName,
        dataType: isPK ? 'uuid' : dataType,
        nullable: isPK ? false : (optional || nullable),
        primaryKey: isPK,
        unique: isPK,
        defaultValue: '',
        enumValues: dataType === 'enum' ? extractTSEnumValues(rawType) : '',
        check: '',
        note: '',
      });
    }

    if (columns.length > 0) {
      tables.push({ name, columns });
    }
  }

  return tables;
}

/** Auto-detect format and parse accordingly */
export function parseSchemaAuto(input: string): { tables: ParsedTable[]; format: 'sql' | 'prisma' | 'typescript' | 'unknown' } {
  const trimmed = input.trim();
  if (/model\s+\w+\s*\{/.test(trimmed)) {
    return { tables: parsePrismaSchema(trimmed), format: 'prisma' };
  }
  if (/CREATE\s+TABLE/i.test(trimmed)) {
    return { tables: parseSqlCreateTable(trimmed), format: 'sql' };
  }
  if (/(?:export\s+)?(?:interface|type)\s+\w+/.test(trimmed)) {
    return { tables: parseTSInterfaces(trimmed), format: 'typescript' };
  }
  return { tables: [], format: 'unknown' };
}
