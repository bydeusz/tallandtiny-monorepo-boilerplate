import {
  BadRequestException,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Express } from 'express';
import { CurrentUser } from '../../common/decorators';
import { FileScope } from '@repo/database';
import { PaginatedResult } from '../../common/interfaces';
import { OrganisationAccessService } from '../organisations/organisation-access.service';
import {
  FileListQueryDto,
  FileResponseDto,
  UploadFileParamsDto,
  UploadFileQueryDto,
} from './dto';
import { FilesService } from './files.service';
import {
  ALLOWED_UPLOAD_MIME_TYPES,
  MAX_UPLOAD_SIZE_BYTES,
  detectMimeFromBuffer,
  isAllowedUploadMimeType,
} from './utils/file-validation.util';

@Controller('files')
@ApiTags('Files')
@ApiBearerAuth()
export class FilesController {
  constructor(
    private readonly filesService: FilesService,
    private readonly organisationAccess: OrganisationAccessService,
  ) {}

  @ApiOperation({ operationId: 'FileUpload' })
  @Post(':scope/:ownerId/:folder')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async upload(
    @Param() params: UploadFileParamsDto,
    @Query() query: UploadFileQueryDto,
    @CurrentUser('sub') userId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_UPLOAD_SIZE_BYTES }),
        ],
      }),
    )
    file: Express.Multer.File,
  ): Promise<FileResponseDto> {
    const scope = this.resolveScope(params.scope);
    await this.assertUploadAccess(scope, params.ownerId, userId);
    this.assertSafeUpload(file);

    return this.filesService.upload(
      scope,
      params.ownerId,
      userId,
      params.folder,
      file,
      query.replace ?? false,
    );
  }

  @ApiOperation({ operationId: 'FileReplace' })
  @Put(':scope/:ownerId/:folder')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async replace(
    @Param() params: UploadFileParamsDto,
    @CurrentUser('sub') userId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_UPLOAD_SIZE_BYTES }),
        ],
      }),
    )
    file: Express.Multer.File,
  ): Promise<FileResponseDto> {
    const scope = this.resolveScope(params.scope);
    await this.assertUploadAccess(scope, params.ownerId, userId);
    this.assertSafeUpload(file);

    return this.filesService.upload(
      scope,
      params.ownerId,
      userId,
      params.folder,
      file,
      true,
    );
  }

  @ApiOperation({ operationId: 'FileList' })
  @Get()
  findAll(
    @CurrentUser('sub') currentUserId: string,
    @Query() query: FileListQueryDto,
  ): Promise<PaginatedResult<FileResponseDto>> {
    return this.filesService.findAllForUser(currentUserId, query);
  }

  @ApiOperation({ operationId: 'FileGet' })
  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('sub') currentUserId: string,
  ): Promise<FileResponseDto> {
    return this.filesService.findOne(id, currentUserId);
  }

  @ApiOperation({ operationId: 'FileDelete' })
  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('sub') userId: string,
  ): Promise<FileResponseDto> {
    return this.filesService.deleteFile(id, userId);
  }

  private resolveScope(scope: string): FileScope {
    if (scope === 'user') {
      return FileScope.USER;
    }

    if (scope === 'organisation') {
      return FileScope.ORGANISATION;
    }

    throw new BadRequestException('Scope must be either user or organisation.');
  }

  private async assertUploadAccess(
    scope: FileScope,
    ownerId: string,
    currentUserId: string,
  ): Promise<void> {
    if (scope === FileScope.USER) {
      if (ownerId !== currentUserId) {
        throw new ForbiddenException('You can only upload files for yourself.');
      }
      return;
    }

    await this.organisationAccess.assertMembership(ownerId, currentUserId);
  }

  private assertSafeUpload(file: Express.Multer.File): void {
    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      throw new BadRequestException('File size cannot exceed 5MB.');
    }

    if (!isAllowedUploadMimeType(file.mimetype)) {
      throw new BadRequestException(
        `Unsupported file type. Allowed: ${ALLOWED_UPLOAD_MIME_TYPES.join(', ')}.`,
      );
    }

    const detectedMime = detectMimeFromBuffer(file.buffer);
    if (!detectedMime) {
      throw new BadRequestException(
        'File contents do not match a supported image format.',
      );
    }

    if (detectedMime !== file.mimetype) {
      throw new BadRequestException(
        'Declared content type does not match file contents.',
      );
    }
  }
}
