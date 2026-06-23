import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  MemoryHealthIndicator,
  PrismaHealthIndicator,
} from '@nestjs/terminus';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public, SkipTransform } from '../../common/decorators';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisHealthIndicator } from './indicators/redis.health';

@Controller('health')
@ApiTags('Health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly memory: MemoryHealthIndicator,
    private readonly prismaHealth: PrismaHealthIndicator,
    private readonly prismaService: PrismaService,
    private readonly redisHealth: RedisHealthIndicator,
  ) {}

  @ApiOperation({ operationId: 'HealthCheck' })
  @Get()
  @Public()
  @SkipTransform()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.memory.checkHeap('memory_heap', 200 * 1024 * 1024),
      () => this.memory.checkRSS('memory_rss', 300 * 1024 * 1024),
      () => this.prismaHealth.pingCheck('database', this.prismaService),
      () => this.redisHealth.isHealthy('redis'),
    ]);
  }
}
