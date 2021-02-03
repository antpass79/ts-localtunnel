import { Agent } from 'http';
import net from 'net';
import { EventEmitter } from 'events';
import { ITunnelAgentOptions } from '../options/tunnel-agent-options';
import { TunnelAgentStatistics } from '../options/tunnel-agent-statistics';
import { ITunnelAgent } from '../interfaces/tunnel-agent';
import { ILogService } from '../interfaces/log-service';
import container from '../ioc/inversify.config';
import SERVICE_IDENTIFIER from '../ioc/identifiers';

const DEFAULT_MAX_SOCKETS = 10;

export class TunnelAgent extends Agent implements ITunnelAgent {
    private logService: ILogService;

    private _emitter: EventEmitter;
    private availableSockets: any;
    private waitingCreateConn: any;
    private connectedSockets: number;
    private maxTcpSockets: any;

    private started: boolean;
    private closed: boolean;

    private server: net.Server;

    constructor(options: ITunnelAgentOptions) {
        super({
            keepAlive: true,
            // only allow keepalive to hold on to one socket
            // this prevents it from holding on to all the sockets so they can be used for upgrades
            maxFreeSockets: 1,
        });

        this.logService = container.get<ILogService>(SERVICE_IDENTIFIER.LOG_SERVICE);

        // sockets we can hand out via createConnection
        this.availableSockets = [];

        // when a createConnection cannot return a socket, it goes into a queue
        // once a socket is available it is handed out to the next callback
        this.waitingCreateConn = [];

        // track maximum allowed sockets
        this.connectedSockets = 0;
        this.maxTcpSockets = options.maxSockets || DEFAULT_MAX_SOCKETS;

        // new tcp server to service requests for this client
        this.server = net.createServer();

        // flag to avoid double starts
        this.started = false;
        this.closed = false;

        this._emitter = new EventEmitter();
    }

    get stats(): TunnelAgentStatistics {
        return {
            connectedSockets: this.connectedSockets,
        };
    }

    listen(port?: number | undefined): Promise<any> {
        const server = this.server;
        if (this.started) {
            throw new Error('already started');
        }
        this.started = true;

        server.on('close', this._onClose.bind(this));
        server.on('connection', this._onConnection.bind(this));
        server.on('error', (err: any) => {
            // These errors happen from killed connections, we don't worry about them
            this.logService.log(err);
            if (err.code == 'ECONNRESET' || err.code == 'ETIMEDOUT') {
                return;
            }
        });

        return new Promise((resolve) => {
            server.listen(port, () => {
                const port = (server.address() as net.AddressInfo).port;
                this.logService.log('tcp server listening on port: %d', port);

                resolve({
                    // port for lt client tcp connections
                    port: port,
                });
            });
        });
    }

    // fetch a socket from the available socket pool for the agent
    // if no socket is available, queue
    // cb(err, socket)
    createConnection(options: any, cb: any) {
        this.logService.log('is closed? %s', this.closed);

        if (this.closed) {
            cb(new Error('closed'));
            return;
        }

        this.logService.log('create connection');

        // socket is a tcp connection back to the user hosting the site
        const sock = this.availableSockets.shift();

        // no available sockets
        // wait until we have one
        if (!sock) {
            this.waitingCreateConn.push(cb);
            this.logService.log('waiting connected: %s', this.connectedSockets);
            this.logService.log('waiting available: %s', this.availableSockets.length);
            return;
        }

        this.logService.log('socket given');
        cb(null, sock);
    }

    destroy() {
        this.server.close();
        super.destroy();
    }

    onOnline(listener: (...args: any[]) => void): void {
        this._emitter.on('online', listener);
    }
    onOffline(listener: (...args: any[]) => void): void {        
        this._emitter.on('offline', listener);
    }
    onOnceError(listener: (args: Error) => void): void {        
        this._emitter.once('error', listener);
    }

    private _onClose() {
        this.closed = true;
        this.logService.log('closed tcp socket');
        // flush any waiting connections
        for (const conn of this.waitingCreateConn) {
            conn(new Error('closed'), null);
        }
        this.waitingCreateConn = [];
        this._emitter.emit('end');
    }

    // new socket connection from client for tunneling requests to client
    private _onConnection(socket: any) {
        // no more socket connections allowed
        if (this.connectedSockets >= this.maxTcpSockets) {
            this.logService.log('no more sockets allowed');
            socket.destroy();
            return false;
        }

        socket.once('close', (hadError: any) => {
            this.logService.log('closed socket (error: %s)', hadError);

            this.connectedSockets -= 1;
            // remove the socket from available list
            const idx = this.availableSockets.indexOf(socket);
            this.logService.log('socket index %s', idx);
            if (idx >= 0) {
                this.availableSockets.splice(idx, 1);
            }

            this.logService.log('connected sockets: %s', this.connectedSockets);
            if (this.connectedSockets <= 0) {
                this.logService.log('all sockets disconnected');
                this._emitter.emit('offline');
            }
        });

        // close will be emitted after this
        socket.once('error', (err: any) => {
            // we do not log these errors, sessions can drop from clients for many reasons
            // these are not actionable errors for our server
            socket.destroy();
        });

        if (this.connectedSockets === 0) {
            this._emitter.emit('online');
        }

        this.connectedSockets += 1;
        this.logService.log('new connection from: %s:%s [%d]', socket.address().address, socket.address().port, this.connectedSockets);

        // if there are queued callbacks, give this socket now and don't queue into available
        const fn = this.waitingCreateConn.shift();
        if (fn) {
            this.logService.log('giving socket to queued conn request');
            setTimeout(() => {
                fn(null, socket);
            }, 0);
            return;
        }

        // make socket available for those waiting on sockets
        this.availableSockets.push(socket);
    }
}
