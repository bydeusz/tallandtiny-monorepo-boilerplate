import { Module } from '@nestjs/common';
import { UserScopedCacheInterceptor } from '../../common/interceptors';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, UserScopedCacheInterceptor],
  exports: [UsersService],
})
export class UsersModule {}
