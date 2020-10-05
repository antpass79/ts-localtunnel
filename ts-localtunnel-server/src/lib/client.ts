import { EventEmitter } from 'events';
import pump from 'pump';
import http from 'http';
import { Logger } from '../utils/logger';

export class Client {
    private graceTimeout: any;
    private id: any;
    private agent: any;

    private _emitter: EventEmitter;
    get emitter() {
        return this._emitter;
    }

    constructor(options: any) {
        this.agent = this.agent = options.agent;
        this.id = this.id = options.id;

        // client is given a grace period in which they can connect before they are _removed_
        // this.graceTimeout = setTimeout(() => {
        //     this.close();
        // }, 60000).unref();

        this._emitter = new EventEmitter();

        this.listenAgent();
    }

    stats() {
        return this.agent.stats();
    }

    close() {
        Logger.log('client is closed by close method');        
        clearTimeout(this.graceTimeout);
        this.agent.destroy();
        this.emitter.emit('close');
    }

    handleRequest(req: any, res: any) {
        Logger.log('READ from url %s', req.url);

        const opt = {
            path: req.url,
            agent: this.agent,
            method: req.method,
            headers: req.headers
        };

        const clientReq = http.request(opt, (clientRes: any) => {
            Logger.log('CLIENT - HANDLE REQUEST - BEFORE WRITE to url %s', req.url);
            // write response code and headers
            res.writeHead(clientRes.statusCode, clientRes.headers);

            Logger.log('CLIENT - HANDLE REQUEST - AFTER WRITE');
            // using pump is deliberate - see the pump docs for why
            pump(clientRes, res);

            Logger.log('CLIENT - HANDLE REQUEST - AFTER PUMP');
        });

        // this can happen when underlying agent produces an error
        // in our case we 504 gateway error this?
        // if we have already sent headers?
        clientReq.once('error', (err) => {
            Logger.log('CLIENT - HANDLE REQUEST - clientReq error');
            // TODO(roman): if headers not sent - respond with gateway unavailable
        });

        // using pump is deliberate - see the pump docs for why
        pump(req, clientReq);
    }

    handleUpgrade(req: any, socket: any) {
        Logger.log('READ from %s', req.url);
        
        socket.once('error', (err: any) => {
            // These client side errors can happen if the client dies while we are reading
            // We don't need to surface these in our logs.
            if (err.code == 'ECONNRESET' || err.code == 'ETIMEDOUT') {
                return;
            }
            Logger.error(err);
        });

        this.agent.createConnection({}, (err: any, conn: any) => {
            Logger.log('CLIENT - HANDLE UPGRADE - WRITE from %s', req.url);
            // any errors getting a connection mean we cannot service this request
            if (err) {
                socket.end();
                return;
            }

            // socket met have disconnected while we waiting for a socket
            if (!socket.readable || !socket.writable) {
                conn.destroy();
                socket.end();
                return;
            }

            // websocket requests are special in that we simply re-create the header info
            // then directly pipe the socket data
            // avoids having to rebuild the request and handle upgrades via the http client
            const arr = [`${req.method} ${req.url} HTTP/${req.httpVersion}`];
            for (let i=0 ; i < (req.rawHeaders.length-1) ; i+=2) {
                arr.push(`${req.rawHeaders[i]}: ${req.rawHeaders[i+1]}`);
            }

            arr.push('');
            arr.push('');

            // using pump is deliberate - see the pump docs for why
            pump(conn, socket);
            pump(socket, conn);
            conn.write(arr.join('\r\n'));
        });
    }

    private listenAgent() {
        this.agent.on('online', () => {
            Logger.log('client online %s', this.id);
            clearTimeout(this.graceTimeout);
        });

        this.agent.on('offline', () => {
            Logger.log('client offline %s', this.id);

            // if there was a previous timeout set, we don't want to double trigger
            clearTimeout(this.graceTimeout);

            // client is given a grace period in which they can re-connect before they are _removed_
            this.graceTimeout = setTimeout(() => {
                this.close();
            }, 1000).unref();
        });

        // TODO(roman): an agent error removes the client, the user needs to re-connect?
        // how does a user realize they need to re-connect vs some random client being assigned same port?
        this.agent.once('error', (err: any) => {
            this.close();
        });        
    }
}
