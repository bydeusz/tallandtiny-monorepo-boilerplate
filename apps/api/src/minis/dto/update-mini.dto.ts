import { PartialType } from '@nestjs/swagger';
import { CreateMiniDto } from './create-mini.dto';

export class UpdateMiniDto extends PartialType(CreateMiniDto) {}
