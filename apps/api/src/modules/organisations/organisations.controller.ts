import { CacheTTL } from '@nestjs/cache-manager';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { PaginationQueryDto } from '../../common/dto';
import { ApiPaginatedResponse, CurrentUser } from '../../common/decorators';
import { PaginatedResult } from '../../common/interfaces';
import { UserScopedCacheInterceptor } from '../../common/interceptors';
import {
  CreateOrganisationDto,
  InviteMemberDto,
  OrganisationMemberResponseDto,
  OrganisationResponseDto,
  UpdateMemberRoleDto,
  UpdateOrganisationDto,
} from './dto';
import { OrganisationsService } from './organisations.service';

@Controller('organisations')
@ApiTags('Organisations')
@ApiBearerAuth()
@UseInterceptors(UserScopedCacheInterceptor)
export class OrganisationsController {
  constructor(private readonly organisationsService: OrganisationsService) {}

  @ApiOperation({ operationId: 'OrganisationCreate' })
  @ApiCreatedResponse({ type: OrganisationResponseDto })
  @Post()
  create(
    @Body() createOrganisationDto: CreateOrganisationDto,
    @CurrentUser('sub') userId: string,
  ): Promise<OrganisationResponseDto> {
    return this.organisationsService.create(createOrganisationDto, userId);
  }

  @ApiOperation({ operationId: 'OrganisationList' })
  @ApiPaginatedResponse(OrganisationResponseDto)
  @Get()
  @CacheTTL(30000)
  findAll(
    @Query() query: PaginationQueryDto,
    @CurrentUser('sub') userId: string,
  ): Promise<PaginatedResult<OrganisationResponseDto>> {
    return this.organisationsService.findAll(query, userId);
  }

  @ApiOperation({ operationId: 'OrganisationGet' })
  @ApiOkResponse({ type: OrganisationResponseDto })
  @Get(':id')
  @CacheTTL(60000)
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('sub') userId: string,
  ): Promise<OrganisationResponseDto> {
    return this.organisationsService.findOne(id, userId);
  }

  @ApiOperation({ operationId: 'OrganisationUpdate' })
  @ApiOkResponse({ type: OrganisationResponseDto })
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateOrganisationDto: UpdateOrganisationDto,
    @CurrentUser('sub') userId: string,
  ): Promise<OrganisationResponseDto> {
    return this.organisationsService.update(id, updateOrganisationDto, userId);
  }

  @ApiOperation({ operationId: 'OrganisationDelete' })
  @ApiOkResponse({ type: OrganisationResponseDto })
  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('sub') userId: string,
  ): Promise<OrganisationResponseDto> {
    return this.organisationsService.remove(id, userId);
  }

  @ApiOperation({ operationId: 'OrganisationMemberList' })
  @ApiPaginatedResponse(OrganisationMemberResponseDto)
  @Get(':id/members')
  @CacheTTL(30000)
  listMembers(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: PaginationQueryDto,
    @CurrentUser('sub') userId: string,
  ): Promise<PaginatedResult<OrganisationMemberResponseDto>> {
    return this.organisationsService.listMembers(id, query, userId);
  }

  @ApiOperation({ operationId: 'OrganisationMemberInvite' })
  @ApiCreatedResponse({ type: OrganisationMemberResponseDto })
  @Post(':id/members')
  inviteMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: InviteMemberDto,
    @CurrentUser('sub') userId: string,
  ): Promise<OrganisationMemberResponseDto> {
    return this.organisationsService.inviteMember(id, dto, userId);
  }

  @ApiOperation({ operationId: 'OrganisationMemberUpdateRole' })
  @ApiOkResponse({ type: OrganisationMemberResponseDto })
  @Patch(':id/members/:userId')
  updateMemberRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
    @Body() dto: UpdateMemberRoleDto,
    @CurrentUser('sub') actorId: string,
  ): Promise<OrganisationMemberResponseDto> {
    return this.organisationsService.updateMemberRole(
      id,
      targetUserId,
      dto,
      actorId,
    );
  }

  @ApiOperation({ operationId: 'OrganisationMemberRemove' })
  @ApiOkResponse({ type: OrganisationMemberResponseDto })
  @Delete(':id/members/:userId')
  removeMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
    @CurrentUser('sub') actorId: string,
  ): Promise<OrganisationMemberResponseDto> {
    return this.organisationsService.removeMember(id, targetUserId, actorId);
  }
}
