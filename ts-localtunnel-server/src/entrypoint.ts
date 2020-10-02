import 'localenv';
import { Command } from 'commander';

const command = new Command();
// const optimist = require('../node_modules/optimistic/index.js');

// import log from 'book';
import Debug from 'debug';

import { ServerProxy } from './server-proxy';

const debug = Debug('localtunnel');

let argv = command
    .option('secure', 'use this flag to indicate proxy over https', false)
    .option('port <port>', 'listen on this port for outside requests', '90')
    .option('address <address>', 'IP address to bind to', 'tunnelserver')
    .option('domains', 'Specify the base domains name. This is optional if hosting localtunnel from a regular example.com domain. This is required if hosting a localtunnel server from a subdomain (i.e. lt.example.dom where clients will be client-app.lt.example.come)')
    .option('max-sockets <number>', 'maximum number of tcp sockets each client is allowed to establish at one time (the tunnels)', '10')
    .opts();

if (argv.help) {
    command.help();
    process.exit();
}

const serverProxy = new ServerProxy({
    max_tcp_sockets: argv['max-sockets'],
    // secure: argv.secure,
    secure: false,
    domains: ['localhost', '127.0.0.1', 'tunnelserver'],
    // domain: argv.domain,
});

serverProxy.server.listen(argv.port, argv.address, () => {
    console.log('server listening on address %s', serverProxy.address);
});

process.on('SIGINT', () => {
    process.exit();
});

process.on('SIGTERM', () => {
    process.exit();
});

process.on('uncaughtException', (err) => {
    console.error(err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error(reason);
});

// vim: ft=javascript

