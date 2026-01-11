import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { LokiLogger, getInstanceId } from './logger/loki.logger';

async function bootstrap() {
  const logger = new LokiLogger('Bootstrap');

  const app = await NestFactory.create(AppModule, { logger });

  const configService = app.get(ConfigService);
  const apiPort = configService.get<number>('API_PORT', 9000);

  await app.listen(apiPort);

  logger.log(`C64 Terminal Server instance ${getInstanceId()}`);
  logger.log(`API Server listening on port ${apiPort}`);
  logger.log(
    `TCP Server listening on port ${configService.get('TCP_PORT', 10000)}`,
  );
}

void bootstrap();
