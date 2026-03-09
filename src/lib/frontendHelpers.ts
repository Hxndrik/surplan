import { createId } from './id';
import type { Entity, DataType, ComponentProp } from '../types';

function dataTypeToTsType(dt: DataType): string {
  switch (dt) {
    case 'uuid': case 'string': case 'varchar': case 'text': case 'char':
      return 'string';
    case 'integer': case 'bigint': case 'smallint': case 'float': case 'decimal': case 'numeric': case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'date': case 'datetime': case 'timestamp': case 'timestamptz': case 'time':
      return 'string'; // ISO date string
    case 'json': case 'jsonb':
      return 'Record<string, unknown>';
    case 'enum':
      return 'string';
    case 'blob': case 'bytea':
      return 'Blob';
    case 'array':
      return 'unknown[]';
    default:
      return 'unknown';
  }
}

export function entityToProps(entity: Entity): ComponentProp[] {
  return entity.columns
    .sort((a, b) => a.order - b.order)
    .map((col) => ({
      id: createId(),
      name: col.name,
      type: col.dataType === 'enum' && col.enumValues
        ? col.enumValues.split(',').map((v) => `'${v.trim()}'`).join(' | ')
        : dataTypeToTsType(col.dataType),
      required: !col.nullable && !col.primaryKey,
      defaultValue: col.defaultValue,
      description: col.note || `${entity.name}.${col.name}`,
    }));
}

export function toPascalCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
}

export function toCamelCase(str: string): string {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

export { dataTypeToTsType };
