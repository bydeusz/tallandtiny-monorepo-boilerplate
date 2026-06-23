import { Injectable } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';
import { RedisService } from '../../redis';

@Injectable()
export class RedisHealthIndicator {
  constructor(
    private readonly healthIndicatorService: HealthIndicatorService,
    private readonly redisService: RedisService,
  ) {}

  async isHealthy(key: string) {
    const indicator = this.healthIndicatorService.check(key);

    try {
      const response = await this.redisService.getClient().ping();

      if (response === 'PONG') {
        return indicator.up();
      }

      return indicator.down({
        message: `Unexpected ping response: ${response}`,
      });
    } catch (error) {
      return indicator.down({
        message:
          error instanceof Error ? error.message : 'Redis health check failed',
      });
    }
  }
}
