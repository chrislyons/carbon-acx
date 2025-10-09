import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export interface EntityField {
  name: string;
  type: string;
  list?: boolean;
  ref?: string;
}

export interface Entity {
  name: string;
  fields: EntityField[];
}

export interface Relation {
  from: string;
  to: string;
  via?: string;
  cardinality: '1:1' | '1:n' | 'n:n';
}

export interface SemanticModel {
  version: 'acx-1';
  entities: Entity[];
  relations: Relation[];
}

type SqlType = 'string' | 'number' | 'boolean' | 'json' | 'unknown';

interface TableColumn {
  name: string;
  type: SqlType;
  originalType: string;
}

interface TableForeignKey {
  columns: string[];
  targetTable: string;
  targetColumns: string[];
}

interface TableDefinition {
  name: string;
  columns: TableColumn[];
  primaryKey: string[];
  foreignKeys: TableForeignKey[];
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');
const schemaPath = path.join(repoRoot, 'db', 'schema.sql');
const manifestIndexPath = path.join(repoRoot, 'dist', 'artifacts', 'manifest.json');

const SQL_TYPE_MAP: Record<string, SqlType> = {
  TEXT: 'string',
  VARCHAR: 'string',
  CHAR: 'string',
  INTEGER: 'number',
  INT: 'number',
  REAL: 'number',
  NUMERIC: 'number',
  BOOLEAN: 'boolean',
};

const ENTITY_NAME_OVERRIDES: Record<string, string> = {
  sources: 'Reference',
  units: 'Unit',
  sectors: 'Sector',
  activities: 'Activity',
  profiles: 'Profile',
  emission_factors: 'EmissionFactor',
  activity_schedule: 'ActivitySchedule',
  grid_intensity: 'GridIntensity',
};

const primaryKeyMap: Record<string, string[]> = {};

function toPascalCase(value: string): string {
  return value
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join('');
}

function singularize(value: string): string {
  if (value.endsWith('ies')) {
    return value.slice(0, -3) + 'y';
  }
  if (value.endsWith('ses')) {
    return value.slice(0, -2);
  }
  if (value.endsWith('s') && !value.endsWith('ss')) {
    return value.slice(0, -1);
  }
  return value;
}

function normaliseEntityName(tableName: string): string {
  if (ENTITY_NAME_OVERRIDES[tableName]) {
    return ENTITY_NAME_OVERRIDES[tableName];
  }
  return toPascalCase(singularize(tableName));
}

function normaliseSqlType(rawType: string): SqlType {
  const canonical = rawType.trim().toUpperCase();
  for (const [key, value] of Object.entries(SQL_TYPE_MAP)) {
    if (canonical.startsWith(key)) {
      return value;
    }
  }
  return 'unknown';
}

function splitSqlDefinitions(block: string): string[] {
  const segments: string[] = [];
  let buffer = '';
  let depth = 0;
  for (let i = 0; i < block.length; i += 1) {
    const char = block[i];
    if (char === '(') {
      depth += 1;
      buffer += char;
      continue;
    }
    if (char === ')') {
      depth = Math.max(0, depth - 1);
      buffer += char;
      continue;
    }
    if (char === ',' && depth === 0) {
      const trimmed = buffer.trim();
      if (trimmed) {
        segments.push(trimmed);
      }
      buffer = '';
      continue;
    }
    buffer += char;
  }
  const finalSegment = buffer.trim();
  if (finalSegment) {
    segments.push(finalSegment);
  }
  return segments;
}

function parseTableDefinitions(sql: string): TableDefinition[] {
  const tables: TableDefinition[] = [];
  const regex = /CREATE\s+TABLE\s+([A-Za-z0-9_]+)\s*\(([^;]+)\);/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(sql)) !== null) {
    const [, tableName, block] = match;
    const entries = splitSqlDefinitions(block);
    const columns: TableColumn[] = [];
    const foreignKeys: TableForeignKey[] = [];
    const primaryKey: string[] = [];

    for (const entry of entries) {
      const upper = entry.toUpperCase();
      if (upper.startsWith('FOREIGN KEY')) {
        const fkMatch = /FOREIGN\s+KEY\s*\(([^)]+)\)\s+REFERENCES\s+([A-Za-z0-9_]+)\s*\(([^)]+)\)/i.exec(entry);
        if (fkMatch) {
          const [, cols, target, targetCols] = fkMatch;
          const columnsList = cols.split(',').map((col) => col.trim().replace(/"/g, ''));
          const targetColumns = targetCols.split(',').map((col) => col.trim().replace(/"/g, ''));
          foreignKeys.push({ columns: columnsList, targetTable: target.trim(), targetColumns });
        }
        continue;
      }
      if (upper.startsWith('PRIMARY KEY')) {
        const pkMatch = /PRIMARY\s+KEY\s*\(([^)]+)\)/i.exec(entry);
        if (pkMatch) {
          const [, cols] = pkMatch;
          const keys = cols.split(',').map((col) => col.trim().replace(/"/g, ''));
          primaryKey.push(...keys);
        }
        continue;
      }
      if (upper.startsWith('CHECK') || upper.startsWith('CONSTRAINT')) {
        continue;
      }

      const columnMatch = /"?([A-Za-z0-9_]+)"?\s+([A-Za-z0-9_]+)/.exec(entry);
      if (!columnMatch) {
        continue;
      }
      const [, columnName, columnType] = columnMatch;
      const column: TableColumn = {
        name: columnName,
        type: normaliseSqlType(columnType),
        originalType: columnType,
      };
      columns.push(column);

      if (/PRIMARY\s+KEY/i.test(entry)) {
        primaryKey.push(columnName);
      }
    }

    tables.push({ name: tableName, columns, primaryKey, foreignKeys });
  }
  return tables;
}

function buildDatasetEntity(): { entity: Entity; relations: Relation[] } {
  const datasetFields: EntityField[] = [
    { name: 'dataset_id', type: 'string' },
    { name: 'generated_at', type: 'string' },
    { name: 'figure_count', type: 'number' },
    { name: 'layer_citation_keys', type: 'json', list: false },
    { name: 'layer_references', type: 'json', list: false },
  ];

  let manifestRelation: Relation | undefined;

  if (existsSync(manifestIndexPath)) {
    try {
      const raw = readFileSync(manifestIndexPath, 'utf-8');
      const payload = JSON.parse(raw) as Record<string, unknown>;
      const datasetManifest = payload?.['dataset_manifest'];
      if (datasetManifest && typeof datasetManifest === 'object') {
        const pathValue = (datasetManifest as Record<string, unknown>)['path'];
        const shaValue = (datasetManifest as Record<string, unknown>)['sha256'];
        if (typeof pathValue === 'string') {
          datasetFields.push({ name: 'manifest_path', type: 'string' });
        }
        if (typeof shaValue === 'string') {
          datasetFields.push({ name: 'manifest_sha256', type: 'string' });
        }
        manifestRelation = {
          from: 'Manifest',
          to: 'Dataset',
          via: 'dataset_manifest',
          cardinality: '1:1',
        };
      }
    } catch (error) {
      // ignore malformed manifest index
    }
  }

  const entity: Entity = {
    name: 'Dataset',
    fields: datasetFields,
  };
  primaryKeyMap[entity.name] = ['dataset_id'];

  const relations = manifestRelation ? [manifestRelation] : [];
  return { entity, relations };
}

function buildManifestEntity(): Entity | undefined {
  if (!existsSync(manifestIndexPath)) {
    return undefined;
  }
  try {
    const raw = readFileSync(manifestIndexPath, 'utf-8');
    const payload = JSON.parse(raw) as Record<string, unknown>;
    const fields: EntityField[] = [];
    const simpleStringFields: Array<{ key: string; name: string }> = [
      { key: 'generated_at', name: 'generated_at' },
      { key: 'build_hash', name: 'build_hash' },
      { key: 'dataset_version', name: 'dataset_version' },
    ];
    for (const { key, name } of simpleStringFields) {
      const value = payload[key];
      if (typeof value === 'string' && value.trim().length > 0) {
        fields.push({ name, type: 'string' });
      }
    }
    if (typeof payload['hashed_preferred'] === 'boolean') {
      fields.push({ name: 'hashed_preferred', type: 'boolean' });
    }
    const datasetManifest = payload['dataset_manifest'];
    if (datasetManifest && typeof datasetManifest === 'object') {
      const manifestObj = datasetManifest as Record<string, unknown>;
      if (typeof manifestObj['path'] === 'string') {
        fields.push({ name: 'dataset_manifest_path', type: 'string' });
      }
      if (typeof manifestObj['sha256'] === 'string') {
        fields.push({ name: 'dataset_manifest_sha256', type: 'string' });
      }
    }
    if (Array.isArray(payload['figures'])) {
      fields.push({ name: 'figures', type: 'json', list: true, ref: 'ManifestEntry' });
    }

    if (fields.length === 0) {
      return undefined;
    }

    const entity: Entity = {
      name: 'Manifest',
      fields,
    };
    primaryKeyMap[entity.name] = ['dataset_manifest_path'];
    return entity;
  } catch (error) {
    return undefined;
  }
}

function buildManifestEntryEntity(): Entity | undefined {
  if (!existsSync(manifestIndexPath)) {
    return undefined;
  }
  try {
    const raw = readFileSync(manifestIndexPath, 'utf-8');
    const payload = JSON.parse(raw) as Record<string, unknown>;
    const figures = payload['figures'];
    if (!Array.isArray(figures) || figures.length === 0) {
      return undefined;
    }
    const fields: EntityField[] = [
      { name: 'figure_id', type: 'string' },
      { name: 'figure_method', type: 'string' },
      { name: 'hash_prefix', type: 'string' },
      { name: 'manifests', type: 'json', list: true },
      { name: 'figures', type: 'json', list: true },
      { name: 'references', type: 'json', list: true, ref: 'Reference' },
    ];
    const entity: Entity = {
      name: 'ManifestEntry',
      fields,
    };
    primaryKeyMap[entity.name] = ['figure_id'];
    return entity;
  } catch (error) {
    return undefined;
  }
}

function buildModel(): SemanticModel {
  const entities: Entity[] = [];
  const relations: Relation[] = [];

  if (existsSync(schemaPath)) {
    const sql = readFileSync(schemaPath, 'utf-8');
    const tables = parseTableDefinitions(sql);
    const entityNameMap = new Map<string, string>();

    for (const table of tables) {
      const entityName = normaliseEntityName(table.name);
      entityNameMap.set(table.name, entityName);
      const fields: EntityField[] = table.columns.map((column) => ({
        name: column.name,
        type: column.type,
      }));

      for (const fk of table.foreignKeys) {
        for (const columnName of fk.columns) {
          const field = fields.find((item) => item.name === columnName);
          if (field) {
            const refEntity = entityNameMap.get(fk.targetTable) ?? normaliseEntityName(fk.targetTable);
            field.ref = refEntity;
          }
        }
      }

      entities.push({ name: entityName, fields });
      if (table.primaryKey.length > 0) {
        primaryKeyMap[entityName] = Array.from(new Set(table.primaryKey));
      }
    }

    for (const table of tables) {
      const sourceEntity = entityNameMap.get(table.name) ?? normaliseEntityName(table.name);
      for (const fk of table.foreignKeys) {
        const targetEntity = entityNameMap.get(fk.targetTable) ?? normaliseEntityName(fk.targetTable);
        relations.push({
          from: targetEntity,
          to: sourceEntity,
          via: fk.columns.join(', '),
          cardinality: '1:n',
        });
      }

      if (table.primaryKey.length >= 2) {
        const pkSet = new Set(table.primaryKey);
        const fkEntities = table.foreignKeys
          .filter((fk) => fk.columns.every((col) => pkSet.has(col)))
          .map((fk) => entityNameMap.get(fk.targetTable) ?? normaliseEntityName(fk.targetTable));
        const uniqueFkEntities = Array.from(new Set(fkEntities));
        if (uniqueFkEntities.length >= 2) {
          for (let i = 0; i < uniqueFkEntities.length; i += 1) {
            for (let j = i + 1; j < uniqueFkEntities.length; j += 1) {
              relations.push({
                from: uniqueFkEntities[i],
                to: uniqueFkEntities[j],
                via: sourceEntity,
                cardinality: 'n:n',
              });
            }
          }
        }
      }
    }
  }

  const manifestEntity = buildManifestEntity();
  if (manifestEntity) {
    entities.push(manifestEntity);
  }
  const manifestEntry = buildManifestEntryEntity();
  if (manifestEntry) {
    entities.push(manifestEntry);
    relations.push({ from: 'Manifest', to: 'ManifestEntry', cardinality: '1:n' });
  }

  const { entity: datasetEntity, relations: datasetRelations } = buildDatasetEntity();
  entities.push(datasetEntity);
  relations.push(...datasetRelations);

  const datasetToReference: Relation = {
    from: 'Dataset',
    to: 'Reference',
    via: 'layer_citation_keys',
    cardinality: 'n:n',
  };
  relations.push(datasetToReference);

  const datasetToSector: Relation = {
    from: 'Dataset',
    to: 'Sector',
    via: 'activities.sector_id',
    cardinality: '1:n',
  };
  relations.push(datasetToSector);

  const uniqueEntities = new Map<string, Entity>();
  for (const entity of entities) {
    const key = entity.name;
    if (!uniqueEntities.has(key)) {
      const sortedFields = [...entity.fields].sort((a, b) => a.name.localeCompare(b.name));
      uniqueEntities.set(key, { name: entity.name, fields: sortedFields });
    }
  }

  const uniqueRelations = new Map<string, Relation>();
  for (const relation of relations) {
    const key = `${relation.from}->${relation.to}:${relation.via ?? ''}:${relation.cardinality}`;
    if (!uniqueRelations.has(key)) {
      uniqueRelations.set(key, relation);
    }
  }

  const sortedEntities = Array.from(uniqueEntities.values()).sort((a, b) => a.name.localeCompare(b.name));
  const sortedRelations = Array.from(uniqueRelations.values()).sort((a, b) => {
    if (a.from === b.from) {
      return a.to.localeCompare(b.to);
    }
    return a.from.localeCompare(b.from);
  });

  return {
    version: 'acx-1',
    entities: sortedEntities,
    relations: sortedRelations,
  };
}

export const model: SemanticModel = buildModel();

export function findEntity(name: string): Entity | undefined {
  return model.entities.find((entity) => entity.name === name);
}

export function primaryKeyOf(entity: string | Entity): string[] {
  const entityName = typeof entity === 'string' ? entity : entity.name;
  return primaryKeyMap[entityName] ? [...primaryKeyMap[entityName]] : [];
}

function writePreview(output: SemanticModel): void {
  const previewPath = path.join(__dirname, 'semantic-model.preview.json');
  const payload = JSON.stringify(output, null, 2);
  writeFileSync(previewPath, `${payload}\n`, 'utf-8');
  const relativePath = path.relative(repoRoot, previewPath);
  console.log(`semantic-model: wrote preview to ${relativePath}`);
}

const invokedDirectly = process.argv[1]
  ? pathToFileURL(process.argv[1]).href === import.meta.url
  : false;

if (invokedDirectly) {
  writePreview(model);
  console.log(JSON.stringify(model, null, 2));
}
