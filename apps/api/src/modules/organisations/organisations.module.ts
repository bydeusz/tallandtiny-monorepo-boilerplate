import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { QueueModule } from '../queue';
import { OrganisationAccessService } from './organisation-access.service';
import { OrganisationsController } from './organisations.controller';
import { OrganisationsService } from './organisations.service';

@Module({
  imports: [PrismaModule, ConfigModule, QueueModule.register('producer')],
  controllers: [OrganisationsController],
  providers: [OrganisationsService, OrganisationAccessService],
  exports: [OrganisationAccessService],
})
export class OrganisationsModule {}
