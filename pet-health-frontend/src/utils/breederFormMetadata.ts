/** Read breeder profile metadata with camelCase + snake_case fallbacks (web parity). */

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function breederMetaString(
  metadata: Record<string, unknown> | null | undefined,
  camelKey: string,
  snakeKey: string,
): string {
  const meta = asRecord(metadata);
  const camel = meta[camelKey];
  if (typeof camel === 'string' && camel.trim()) return camel;
  const snake = meta[snakeKey];
  return typeof snake === 'string' ? snake : '';
}

export function breederMetaStringArray(
  metadata: Record<string, unknown> | null | undefined,
  camelKey: string,
  snakeKey: string,
): string[] {
  const meta = asRecord(metadata);
  const camel = meta[camelKey];
  if (Array.isArray(camel)) {
    return camel.filter((item): item is string => typeof item === 'string');
  }
  const snake = meta[snakeKey];
  if (Array.isArray(snake)) {
    return snake.filter((item): item is string => typeof item === 'string');
  }
  return [];
}

export function readBreederFormMetadata(metadata: Record<string, unknown> | null | undefined) {
  return {
    breederType: breederMetaString(metadata, 'breederType', 'breeder_type') || 'home_breeder',
    registeredKennelName: breederMetaString(
      metadata,
      'registeredKennelName',
      'registered_kennel_name',
    ),
    registeredAt: breederMetaString(metadata, 'registeredAt', 'registered_at'),
    transparencyCommitments: breederMetaStringArray(
      metadata,
      'transparencyCommitments',
      'transparency_commitments',
    ),
    rejectionReason: breederMetaString(metadata, 'rejection_reason', 'rejection_reason'),
    adminAction: breederMetaString(metadata, 'admin_action', 'admin_action'),
    adminNote: breederMetaString(metadata, 'admin_note', 'admin_note'),
  };
}
