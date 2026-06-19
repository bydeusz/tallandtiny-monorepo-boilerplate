import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMiniDto } from './dto/create-mini.dto';
import { UpdateMiniDto } from './dto/update-mini.dto';

@Injectable()
export class MinisService {
  constructor(private readonly prisma: PrismaService) {}

  getMinis() {
    return this.prisma.db.mini.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async getMini(id: string) {
    const mini = await this.prisma.db.mini.findUnique({ where: { id } });
    if (!mini) throw new NotFoundException(`Mini ${id} not found`);
    return mini;
  }

  createMini(data: CreateMiniDto) {
    return this.prisma.db.mini.create({ data });
  }

  async updateMini(id: string, data: UpdateMiniDto) {
    await this.getMini(id);
    return this.prisma.db.mini.update({ where: { id }, data });
  }

  async deleteMini(id: string) {
    await this.getMini(id);
    return this.prisma.db.mini.delete({ where: { id } });
  }
}
