import { Role } from '@repo/database';
import { BaseEntityDto } from '../../../common/dto';

export class UserResponseDto extends BaseEntityDto {
  name!: string;
  surname!: string;
  email!: string;
  role!: Role;
  isActive!: boolean;
  avatarUrl!: string | null;
  address!: string | null;
  postalCode!: string | null;
  city!: string | null;
  country!: string | null;
  kvk!: string | null;
  vatNumber!: string | null;
}
