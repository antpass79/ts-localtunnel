import { TunnelServer } from './lib/tunnel-server';
import { InlineOptionsBuilder } from './utils/inline-options-builder';
import { Logger } from './utils/logger';

const inlineOptionsBuilder: InlineOptionsBuilder = new InlineOptionsBuilder();
const options = inlineOptionsBuilder.build();

const tunnelServer = new TunnelServer(options);
tunnelServer.listen(options.port, options.address);

process.on('SIGINT', () => {
    process.exit();
});

process.on('SIGTERM', () => {
    process.exit();
});

process.on('uncaughtException', (err) => {
    Logger.dump(err);
});

process.on('unhandledRejection', (reason, promise) => {
    Logger.dump(reason);
});