export class Mini {
  /** Unique identifier (cuid) */
  id!: string;

  /** Display name of the miniature */
  name!: string;

  /** Faction the miniature belongs to */
  faction!: string | null;

  /** Whether the miniature has been painted */
  isPainted!: boolean;

  /** Creation timestamp */
  createdAt!: Date;
}
