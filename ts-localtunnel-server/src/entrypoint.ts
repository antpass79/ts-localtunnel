import { ILogService } from './interfaces/log-service';
import { ITunnelServer } from './interfaces/tunnel-server';
import SERVICE_IDENTIFIER from './ioc/identifiers';
import container from './ioc/inversify.config';

const logService = container.get<ILogService>(SERVICE_IDENTIFIER.LOG_SERVICE);
const tunnelServer = container.get<ITunnelServer>(SERVICE_IDENTIFIER.TUNNEL_SERVER);
tunnelServer.listen(tunnelServer.options.port, tunnelServer.options.address);

process.on('SIGINT', () => {
    process.exit();
});

process.on('SIGTERM', () => {
    process.exit();
});

process.on('uncaughtException', (err) => {
    logService.dump(err);
});

process.on('unhandledRejection', (reason, promise) => {
    logService.dump(reason);
});