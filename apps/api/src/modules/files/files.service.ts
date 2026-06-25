import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Express } from 'express';
import { FileScope, Prisma } from '@repo/database';
import { PaginatedResult } from '../../common/interfaces';
import { buildPaginationMeta, buildPrismaSkipTake } from '../../common/utils';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage';
import { FileListQueryDto, FileResponseDto } from './dto';

@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  async upload(
    scope: FileScope,
    ownerId: string,
    folder: string,
    file: Express.Multer.File,
    replace = false,
  ): Promise<FileResponseDto> {
    const cleanName = this.sanitizeFilename(file.originalname);
    const key = `${scope.toLowerCase()}/${ownerId}/${folder}/${Date.now()}-${cleanName}`;

    const existingFiles = replace
      ? await this.prisma.file.findMany({
          where: this.buildScopeOwnerFolderFilter(scope, ownerId, folder),
        })
      : [];

    for (const existingFile of existingFiles) {
      await this.storageService.delete(existingFile.key);
    }

    await this.storageService.uploadWithKey(file, key);

    const record = await this.prisma.$transaction(async (tx) => {
      if (existingFiles.length > 0) {
        await tx.file.deleteMany({
          where: {
            id: {
              in: existingFiles.map((existingFile) => existingFile.id),
            },
          },
        });
      }

      const createdFile = await tx.file.create({
        data: {
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          key,
          folder,
          scope,
          userId: ownerId,
        },
      });

      await this.syncEntityAssetUrl(tx, scope, ownerId, folder, key);

      return createdFile;
    });

    return this.toResponseDto(record);
  }

  async findAllForUser(
    currentUserId: string,
    query: FileListQueryDto,
  ): Promise<PaginatedResult<FileResponseDto>> {
    const { skip, take } = buildPrismaSkipTake(query);

    const where: Prisma.FileWhereInput = {
      scope: query.scope,
      folder: query.folder,
      mimeType: query.mimeType,
      userId: currentUserId,
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.file.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.file.count({ where }),
    ]);

    const data = await Promise.all(
      items.map((item) => this.toResponseDto(item)),
    );

    return {
      data,
      meta: buildPaginationMeta(query, total),
    };
  }

  async findOne(
    fileId: string,
    currentUserId: string,
  ): Promise<FileResponseDto> {
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      throw new NotFoundException('File not found.');
    }

    this.assertReadAccess(file, currentUserId);

    return this.toResponseDto(file);
  }

  async deleteFile(fileId: string, userId: string): Promise<FileResponseDto> {
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      throw new NotFoundException('File not found.');
    }

    this.assertDeleteAccess(file, userId);

    await this.storageService.delete(file.key);

    await this.prisma.$transaction(async (tx) => {
      await tx.file.delete({
        where: { id: fileId },
      });

      await this.syncEntityAssetUrl(tx, file.scope, file.userId, file.folder);
    });

    return this.toResponseDto(file);
  }

  private assertReadAccess(
    file: { userId: string },
    currentUserId: string,
  ): void {
    if (file.userId !== currentUserId) {
      throw new ForbiddenException('You cannot access this file.');
    }
  }

  private assertDeleteAccess(
    file: { userId: string },
    currentUserId: string,
  ): void {
    if (file.userId !== currentUserId) {
      throw new ForbiddenException('You can only delete your own files.');
    }
  }

  private buildScopeOwnerFolderFilter(
    scope: FileScope,
    ownerId: string,
    folder: string,
  ): Prisma.FileWhereInput {
    return {
      scope,
      folder,
      userId: ownerId,
    };
  }

  private async syncEntityAssetUrl(
    tx: Prisma.TransactionClient,
    scope: FileScope,
    ownerId: string,
    folder: string,
    key?: string,
  ): Promise<void> {
    if (scope === FileScope.USER && folder === 'avatar') {
      await tx.user.update({
        where: { id: ownerId },
        data: {
          avatarUrl: key ?? null,
        },
      });
    }
  }

  private async toResponseDto(file: {
    id: string;
    originalName: string;
    mimeType: string;
    size: number;
    key: string;
    folder: string;
    scope: FileScope;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
  }): Promise<FileResponseDto> {
    const downloadUrl = await this.storageService.getSignedUrl(file.key);

    return {
      id: file.id,
      originalName: file.originalName,
      mimeType: file.mimeType,
      size: file.size,
      folder: file.folder,
      scope: file.scope,
      userId: file.userId,
      downloadUrl,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
    };
  }

  private sanitizeFilename(filename: string): string {
    return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  }
}
