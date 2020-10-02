import { ClientUrlGenerator } from './utils/client-url-generator';
import tldjs, { fromUserSettings } from 'tldjs';
import Koa from 'koa';
import Router from 'koa-router';
import http from 'http';
import https from 'https';
import fs from 'fs';
import { AddressInfo } from 'net';

import { ClientManager } from './lib/client-manager';

export class ServerProxy {
    private opt: any;

    private myTldjs: any;
    private landingPage: string;

    private schema: string;

    private _server: http.Server;
    get server(): http.Server {
        return this._server;
    }
    private appCallback: any;

    private manager: ClientManager;
    private app: Koa;
    private router: Router;

    constructor(opt?: any) {
        this.opt = opt || {};
        console.log('Options:');
        console.log(this.opt);

        let validHosts = (this.opt.domains) ? this.opt.domains : undefined;
        this.myTldjs = tldjs.fromUserSettings({ validHosts });

        this.landingPage = this.opt.landing || 'https://localtunnel.github.io/www/';
        this.schema = this.opt.secure ? 'https' : 'http';

        this.manager = new ClientManager(this.opt);
        this.app = new Koa();
        this.router = new Router();

        this.listenRouter();

        this.configure();

        this._server = http.createServer();

        // const options = {
        //     key: fs.readFileSync('cert/key.pem'),
        //     cert: fs.readFileSync('cert/cert.pem')
        //   };        
        // this._server = https.createServer(options, (req, res) => {
        //     res.writeHead(200);
        //     res.end("hello world\n");            
        // });

        this.appCallback = this.app.callback();

        this.listenServer();
    }

    start(handle: any) {
        this.server.listen(handle);
    }

    stop(handle: any) {
        this.server.close(handle);
    }

    get address(): AddressInfo {
        return this.server.address() as AddressInfo;
    }

    private configure() {
        this.app.use(this.router.routes());
        this.app.use(this.router.allowedMethods());
    
        // root endpoint
        this.app.use(async (ctx: any, next: any) => {
            const path = ctx.request.path;
    
            // skip anything not on the root path
            if (path !== '/') {
                await next();
                return;
            }
    
            const isNewClientRequest = ctx.query['new'] !== undefined;
            if (isNewClientRequest) {
                const reqId = ClientUrlGenerator.generate();
                console.log('isNewClientRequest - making new client with id %s', reqId);
                const info = await this.manager.newClient(reqId);
    
                // ANTO const url = this.schema + '://' + info.id + '.' + ctx.request.host;
                const url = this.buildUrl(info, ctx.request.host);

                info.url = url;
                ctx.body = info;
                return;
            }
    
            // no new client request, send to landing page
            ctx.redirect(this.landingPage);
        });
    
        // anything after the / path is a request for a specific client name
        // This is a backwards compat feature
        this.app.use(async (ctx: any, next: any) => {
            const parts = ctx.request.path.split('/');
    
            // any request with several layers of paths is not allowed
            // rejects /foo/bar
            // allow /foo
            if (parts.length !== 2) {
                await next();
                return;
            }
    
            const reqId = parts[1];
    
            // limit requested hostnames to 63 characters
            if (! /^(?:[a-z0-9][a-z0-9\-]{4,63}[a-z0-9]|[a-z0-9]{4,63})$/.test(reqId)) {
                const msg = 'Invalid subdomain. Subdomains must be lowercase and between 4 and 63 alphanumeric characters.';
                ctx.status = 403;
                ctx.body = {
                    message: msg,
                };
                return;
            }
    
            console.log('making new client with id %s', reqId);
            const info = await this.manager.newClient(reqId);
    
            // ANTO const url = this.schema + '://' + info.id + '.' + ctx.request.host;
            const url = this.buildUrl(info, ctx.request.host);

            info.url = url;
            ctx.body = info;
            return;
        });    
    }

    private _slug = '/?slug=';
    private getClientIdFromHostname(hostname: string): string {
        // let index = hostname.lastIndexOf(this._slug);
        // if (index === -1)
        //     return '';
        // return hostname.substr(index + this._slug.length);
        return this.myTldjs.getSubdomain(hostname);
    }

    private buildUrl(info: any, host: string) {
        const url = this.schema + '://' + info.id + '.' + host;
        //const url = this.schema + '://' + host + this._slug + info.id;
        return url;
    }

    private listenRouter() {
        this.router.get('/api/status', async (ctx, next) => {
            const stats = this.manager.stats;
            ctx.body = {
                tunnels: stats.tunnels,
                mem: process.memoryUsage(),
            };
        });
    
        this.router.get('/api/tunnels/:id/status', async (ctx, next) => {
            const clientId = ctx.params.id;
            const client = this.manager.getClient(clientId);
            if (!client) {
                ctx.throw(404);
                return;
            }
    
            const stats = client.stats();
            ctx.body = {
                connected_sockets: stats.connectedSockets,
            };
        });    
    }

    private listenServer() {
        this.server.on('request', (req: any, res: any) => {

            // without a hostname, we won't know who the request is for
            const hostname = req.headers.host;
            console.log('request with hostname: %s', hostname);

            if (!hostname) {
                res.statusCode = 400;
                res.end('Host header is required');
                return;
            }
    
            const clientId = this.getClientIdFromHostname(hostname);
            console.log('hostname %s - clientId %s from getClientIdFromHostname', hostname, clientId);
            if (!clientId) {
                this.appCallback(req, res);
                return;
            }
    
            const client = this.manager.getClient(clientId);
            if (!client) {
                res.statusCode = 404;
                res.end('404');
                return;
            }
    
            client.handleRequest(req, res);
        });
    
        this.server.on('upgrade', (req, socket, head) => {
            console.log('upgrade');

            const hostname = req.headers.host;
            if (!hostname) {
                socket.destroy();
                return;
            }
    
            const clientId = this.getClientIdFromHostname(hostname);
            if (!clientId) {
                socket.destroy();
                return;
            }
    
            const client = this.manager.getClient(clientId);
            if (!client) {
                socket.destroy();
                return;
            }
    
            client.handleUpgrade(req, socket);
        });
    }
}