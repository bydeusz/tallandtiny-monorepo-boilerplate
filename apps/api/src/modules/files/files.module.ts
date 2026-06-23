import { Module } from '@nestjs/common';
import { OrganisationsModule } from '../organisations/organisations.module';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';

@Module({
  imports: [OrganisationsModule],
  controllers: [FilesController],
  providers: [FilesService],
})
export class FilesModule {}
