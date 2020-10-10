import yargs from 'yargs';
import { initTunnelServerOptions, ITunnelServerOptions } from "../models/tunnel-server-options";

export class InlineOptionsBuilder {
    build(): ITunnelServerOptions {
        const argv = yargs
            .option('secure', {
                alias: 's',
                type: 'boolean',
                description: 'use this flag to indicate proxy over https',
                default: false
            })
            .option('port', {
                alias: 'p',
                type: 'number',
                description: 'listen on this port for outside requests',
                default: 90
            })
            .option('address', {
                alias: 'a',
                type: 'string',
                description: 'IP address to bind to',
                default: 'localhost'
            })
            .option('domains', {
                alias: 'd',
                type: 'array',
                description: 'Specify the base domains name. This is optional if hosting localtunnel from a regular example.com domain. This is required if hosting a localtunnel server from a subdomain (i.e. lt.example.dom where clients will be client-app.lt.example.come)',
                default: ['localhost']
            })
            .option('max-sockets', {
                alias: 'ms',
                type: 'number',
                description: 'maximum number of tcp sockets each client is allowed to establish at one time (the tunnels)',
                default: 10
            })
            .help()
            .alias('help', 'h')    
            .parse(process.argv);

        let options: ITunnelServerOptions = initTunnelServerOptions();
        options.secure = argv.secure;
        options.address = argv.address;
        options.port = argv.port;
        options.maxTcpSockets = argv["max-sockets"];
        options.domains = argv.domains;

        return options;
    }
}