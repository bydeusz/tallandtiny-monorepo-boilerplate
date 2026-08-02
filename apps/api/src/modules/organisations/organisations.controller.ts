import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { OrganisationMember } from '@repo/database';
import { PaginationQueryDto } from '../../common/dto';
import { ApiPaginatedResponse, CurrentUser } from '../../common/decorators';
import { PaginatedResult } from '../../common/interfaces';
import { OrganisationMembership } from './decorators/organisation-membership.decorator';
import {
  AddMemberDto,
  ChangeMemberRoleDto,
  CreateOrganisationDto,
  OrganisationMemberResponseDto,
  OrganisationResponseDto,
  UpdateOrganisationDto,
} from './dto';
import { OrganisationMemberGuard } from './guards/organisation-member.guard';
import { OrganisationAdminGuard } from './guards/organisation-admin.guard';
import { OrganisationsService } from './organisations.service';

@Controller('organisations')
@ApiTags('Organisations')
@ApiBearerAuth()
export class OrganisationsController {
  constructor(private readonly organisationsService: OrganisationsService) {}

  @ApiOperation({ operationId: 'OrganisationCreate' })
  @ApiOkResponse({ type: OrganisationResponseDto })
  @Post()
  create(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateOrganisationDto,
  ): Promise<OrganisationResponseDto> {
    return this.organisationsService.createOrganisation(userId, dto);
  }

  @ApiOperation({ operationId: 'OrganisationList' })
  @ApiPaginatedResponse(OrganisationResponseDto)
  @Get()
  findAll(
    @CurrentUser('sub') userId: string,
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResult<OrganisationResponseDto>> {
    return this.organisationsService.findAllForUser(userId, query);
  }

  @ApiOperation({ operationId: 'OrganisationGet' })
  @ApiOkResponse({ type: OrganisationResponseDto })
  @UseGuards(OrganisationMemberGuard)
  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @OrganisationMembership() membership: OrganisationMember,
  ): Promise<OrganisationResponseDto> {
    return this.organisationsService.findOne(id, membership.role);
  }

  @ApiOperation({ operationId: 'OrganisationUpdate' })
  @ApiOkResponse({ type: OrganisationResponseDto })
  @UseGuards(OrganisationAdminGuard)
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrganisationDto,
    @OrganisationMembership() membership: OrganisationMember,
  ): Promise<OrganisationResponseDto> {
    return this.organisationsService.update(id, dto, membership.role);
  }

  @ApiOperation({ operationId: 'OrganisationMemberList' })
  @ApiPaginatedResponse(OrganisationMemberResponseDto)
  @UseGuards(OrganisationAdminGuard)
  @Get(':id/members')
  findMembers(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResult<OrganisationMemberResponseDto>> {
    return this.organisationsService.findMembers(id, query);
  }

  @ApiOperation({ operationId: 'OrganisationMemberAdd' })
  @ApiOkResponse({ type: OrganisationMemberResponseDto })
  @UseGuards(OrganisationAdminGuard)
  @Post(':id/members')
  addMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddMemberDto,
  ): Promise<OrganisationMemberResponseDto> {
    return this.organisationsService.addMember(id, dto);
  }

  @ApiOperation({ operationId: 'OrganisationMemberRemove' })
  @ApiNoContentResponse()
  @UseGuards(OrganisationAdminGuard)
  @Delete(':id/members/:userId')
  @HttpCode(204)
  removeMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<void> {
    return this.organisationsService.removeMember(id, userId);
  }

  @ApiOperation({ operationId: 'OrganisationMemberUpdateRole' })
  @ApiOkResponse({ type: OrganisationMemberResponseDto })
  @UseGuards(OrganisationAdminGuard)
  @Patch(':id/members/:userId')
  changeMemberRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: ChangeMemberRoleDto,
  ): Promise<OrganisationMemberResponseDto> {
    return this.organisationsService.changeMemberRole(id, userId, dto);
  }
}
