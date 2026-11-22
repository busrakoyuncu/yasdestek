import { Global, Module } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';

// Global so any service (messages, auth, users) can inject the gateway to
// notify or disconnect without importing this module.
@Global()
@Module({
  providers: [RealtimeGateway],
  exports: [RealtimeGateway],
})
export class RealtimeModule {}
