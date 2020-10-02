import Debug from 'debug';
import { Agent } from 'http';
import net from 'net';
import { EventEmitter } from 'events';
// import log from 'book';

const DEFAULT_MAX_SOCKETS = 10;

export class TunnelAgent extends Agent {
    private debug: Debug.Debugger;
    private availableSockets: any;
    private waitingCreateConn: any;
    private connectedSockets: number;
    private maxTcpSockets: any;

    private started: boolean;
    private closed: boolean;

    private server: net.Server;

    private _emitter: EventEmitter;
    get emitter() {
        return this._emitter;
    }

    constructor(options: any = {}) {
        super({
            keepAlive: true,
            // only allow keepalive to hold on to one socket
            // this prevents it from holding on to all the sockets so they can be used for upgrades
            maxFreeSockets: 1,
        });

        // sockets we can hand out via createConnection
        this.availableSockets = [];

        // when a createConnection cannot return a socket, it goes into a queue
        // once a socket is available it is handed out to the next callback
        this.waitingCreateConn = [];

        this.debug = Debug(`lt:TunnelAgent[${options.clientId}]`);

        // track maximum allowed sockets
        this.connectedSockets = 0;
        this.maxTcpSockets = options.maxTcpSockets || DEFAULT_MAX_SOCKETS;

        // new tcp server to service requests for this client
        this.server = net.createServer();

        // flag to avoid double starts
        this.started = false;
        this.closed = false;

        this._emitter = new EventEmitter();
    }

    stats() {
        return {
            connectedSockets: this.connectedSockets,
        };
    }

    listen(): Promise<any> {
        const server = this.server;
        if (this.started) {
            throw new Error('already started');
        }
        this.started = true;

        server.on('close', this._onClose.bind(this));
        server.on('connection', this._onConnection.bind(this));
        server.on('error', (err: any) => {
            // These errors happen from killed connections, we don't worry about them
            if (err.code == 'ECONNRESET' || err.code == 'ETIMEDOUT') {
                return;
            }
            console.log(err);
            // ANTO log.error(err);
        });

        return new Promise((resolve) => {
            server.listen(() => {
                const port = (server.address() as net.AddressInfo).port;
                console.log('tcp server listening on port: %d', port);

                resolve({
                    // port for lt client tcp connections
                    port: port,
                });
            });
        });
    }

    _onClose() {
        this.closed = true;
        console.log('closed tcp socket');
        // flush any waiting connections
        for (const conn of this.waitingCreateConn) {
            conn(new Error('closed'), null);
        }
        this.waitingCreateConn = [];
        this.emitter.emit('end');
    }

    // new socket connection from client for tunneling requests to client
    _onConnection(socket: any) {
        // no more socket connections allowed
        if (this.connectedSockets >= this.maxTcpSockets) {
            console.log('no more sockets allowed');
            socket.destroy();
            return false;
        }

        socket.once('close', (hadError: any) => {
            console.log('closed socket (error: %s)', hadError);
            this.connectedSockets -= 1;
            // remove the socket from available list
            const idx = this.availableSockets.indexOf(socket);
            if (idx >= 0) {
                this.availableSockets.splice(idx, 1);
            }

            console.log('connected sockets: %s', this.connectedSockets);
            if (this.connectedSockets <= 0) {
                console.log('all sockets disconnected');
                this.emitter.emit('offline');
            }
        });

        // close will be emitted after this
        socket.once('error', (err: any) => {
            // we do not log these errors, sessions can drop from clients for many reasons
            // these are not actionable errors for our server
            socket.destroy();
        });

        if (this.connectedSockets === 0) {
            this.emitter.emit('online');
        }

        this.connectedSockets += 1;
        console.log('new connection from: %s:%s', socket.address().address, socket.address().port);

        // if there are queued callbacks, give this socket now and don't queue into available
        const fn = this.waitingCreateConn.shift();
        if (fn) {
            console.log('giving socket to queued conn request');
            setTimeout(() => {
                fn(null, socket);
            }, 0);
            return;
        }

        // make socket available for those waiting on sockets
        this.availableSockets.push(socket);
    }

    // fetch a socket from the available socket pool for the agent
    // if no socket is available, queue
    // cb(err, socket)
    createConnection(options: any, cb: any) {
        if (this.closed) {
            cb(new Error('closed'));
            return;
        }

        console.log('create connection');

        // socket is a tcp connection back to the user hosting the site
        const sock = this.availableSockets.shift();

        // no available sockets
        // wait until we have one
        if (!sock) {
            this.waitingCreateConn.push(cb);
            console.log('waiting connected: %s', this.connectedSockets);
            console.log('waiting available: %s', this.availableSockets.length);
            return;
        }

        console.log('socket given');
        cb(null, sock);
    }

    destroy() {
        this.server.close();
        super.destroy();
    }
}
