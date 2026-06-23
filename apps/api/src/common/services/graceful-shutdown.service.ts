import {
  BeforeApplicationShutdown,
  Injectable,
  Logger,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GracefulShutdownService
  implements BeforeApplicationShutdown, OnApplicationShutdown
{
  private readonly logger = new Logger(GracefulShutdownService.name);
  private readonly forceExitTimeoutMs: number;
  private forceExitTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(private readonly configService: ConfigService) {
    this.forceExitTimeoutMs = this.configService.get<number>(
      'shutdown.forceExitTimeoutMs',
      15000,
    );
  }

  beforeApplicationShutdown(signal?: string): void {
    const shutdownSignal = signal ?? 'unknown';
    this.logger.warn(
      `Application shutdown initiated by signal: ${shutdownSignal}`,
    );

    if (this.forceExitTimeoutMs <= 0) {
      this.logger.warn('Forced exit timeout disabled');
      return;
    }

    this.forceExitTimer = setTimeout(() => {
      this.logger.error(
        `Graceful shutdown did not complete within ${this.forceExitTimeoutMs}ms, forcing process exit`,
      );
      process.exit(1);
    }, this.forceExitTimeoutMs);

    this.forceExitTimer.unref();
  }

  onApplicationShutdown(signal?: string): void {
    if (this.forceExitTimer) {
      clearTimeout(this.forceExitTimer);
      this.forceExitTimer = undefined;
    }

    const shutdownSignal = signal ?? 'unknown';
    this.logger.log(
      `Application shutdown completed for signal: ${shutdownSignal}`,
    );
  }
}
