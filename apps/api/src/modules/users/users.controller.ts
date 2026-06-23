import { CacheTTL } from '@nestjs/cache-manager';
import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { PaginationQueryDto } from '../../common/dto';
import { ApiPaginatedResponse, CurrentUser } from '../../common/decorators';
import { PaginatedResult } from '../../common/interfaces';
import { UserScopedCacheInterceptor } from '../../common/interceptors';
import { OrganisationAccessService } from '../organisations/organisation-access.service';
import { UpdateUserDto, UserResponseDto } from './dto';
import { UsersService } from './users.service';

@Controller('users')
@ApiTags('Users')
@ApiBearerAuth()
@UseInterceptors(UserScopedCacheInterceptor)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly organisationAccess: OrganisationAccessService,
  ) {}

  @ApiOperation({ operationId: 'UserList' })
  @ApiPaginatedResponse(UserResponseDto)
  @Get()
  @CacheTTL(30000)
  findAll(
    @Query() query: PaginationQueryDto,
    @CurrentUser('sub') currentUserId: string,
  ): Promise<PaginatedResult<UserResponseDto>> {
    return this.usersService.findAllInSharedOrganisations(currentUserId, query);
  }

  @ApiOperation({ operationId: 'UserGet' })
  @ApiOkResponse({ type: UserResponseDto })
  @Get(':id')
  @CacheTTL(60000)
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('sub') currentUserId: string,
  ): Promise<UserResponseDto> {
    if (currentUserId !== id) {
      const shared = await this.organisationAccess.sharesOrganisationWith(
        currentUserId,
        id,
      );

      if (!shared) {
        throw new ForbiddenException(
          'You can only access users in your organisations.',
        );
      }
    }

    return this.usersService.findOne(id);
  }

  @ApiOperation({ operationId: 'UserUpdate' })
  @ApiOkResponse({ type: UserResponseDto })
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser('sub') currentUserId: string,
  ): Promise<UserResponseDto> {
    if (currentUserId !== id) {
      throw new ForbiddenException(
        'You can only update your own profile details.',
      );
    }

    return this.usersService.update(id, updateUserDto);
  }

  @ApiOperation({ operationId: 'UserDelete' })
  @ApiOkResponse({ type: UserResponseDto })
  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('sub') currentUserId: string,
  ): Promise<UserResponseDto> {
    if (currentUserId !== id) {
      throw new ForbiddenException('You can only delete your own account.');
    }

    return this.usersService.remove(id);
  }
}
