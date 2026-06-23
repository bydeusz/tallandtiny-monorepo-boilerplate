import { BaseEntityDto } from '../../../common/dto';

export class OrganisationResponseDto extends BaseEntityDto {
  name!: string;
  address!: string | null;
  postalCode!: string | null;
  city!: string | null;
  kvk!: string | null;
  vatNumber!: string | null;
  iban!: string | null;
  logoUrl!: string | null;
}
