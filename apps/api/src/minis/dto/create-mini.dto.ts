import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateMiniDto {
  /**
   * Display name of the miniature
   * @example "Space Marine Captain"
   */
  @IsString()
  @MinLength(1)
  name!: string;

  /**
   * Faction the miniature belongs to
   * @example "Ultramarines"
   */
  @IsOptional()
  @IsString()
  faction?: string;

  /** Whether the miniature has been painted */
  @IsOptional()
  @IsBoolean()
  isPainted?: boolean;
}
