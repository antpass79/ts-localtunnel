import tldjs, { extractHostname, fromUserSettings, getDomain, getPublicSuffix, getSubdomain, isValid, isValidHostname, parse, tldExists } from 'tldjs';
import Koa from 'koa';
import Router from 'koa-router';
import http, { IncomingMessage, ServerResponse } from 'http';
import { AddressInfo } from 'net';

import { LogScope } from './log-service';
import { initTunnelServerOptions, ITunnelServerOptions } from '../options/tunnel-server-options';
import { Http2ServerRequest, Http2ServerResponse } from 'http2';
import { ITunnelServer } from '../interfaces/tunnel-server';
import { IClientManager } from '../interfaces/client-manager';
import { ILogService } from '../interfaces/log-service';
import { IServerOptionsResolver } from '../interfaces/server-options-resolver';

export class TunnelServer implements ITunnelServer {
    private tldjs: {
        extractHostname: typeof extractHostname,
        isValidHostname: typeof isValidHostname,
        isValid: typeof isValid,
        parse: typeof parse,
        tldExists: typeof tldExists,
        getPublicSuffix: typeof getPublicSuffix,
        getDomain: typeof getDomain,
        getSubdomain: typeof getSubdomain,
        fromUserSettings: typeof fromUserSettings
    };
    private schema: string;
    private appCallback: (req: IncomingMessage | Http2ServerRequest, res: ServerResponse | Http2ServerResponse) => void;

    private logService: ILogService;
    private clientManager: IClientManager;
    private koa: Koa;
    private router: Router;

    constructor(
        koa: Koa,
        router: Router,
        logService: ILogService,
        clientManager: IClientManager,
        serverIptionsResolver: IServerOptionsResolver) {
            this.logService = logService;
            this.clientManager = clientManager;
            this.koa = koa;
            this.router = router;
            this._options = serverIptionsResolver ? serverIptionsResolver.resolve() : initTunnelServerOptions();

            const logScope: LogScope = new LogScope("TUNNEL SERVER - OPTIONS");
            logScope.dump(this.options);

            let validHosts = (this.options.domains) ? this.options.domains : undefined;
            this.tldjs = tldjs.fromUserSettings({ validHosts });

            this.schema = this.options.secure ? 'https' : 'http';

            this.listenRoutes();
            this.configure();

            this._server = http.createServer();
            this.appCallback = this.koa.callback();

            this.listenServer();
    }

    private _options: ITunnelServerOptions;
    get options(): ITunnelServerOptions {
        return this._options;
    }

    private _server: http.Server;
    get server() {
        return this._server;
    }

    get addressInfo(): AddressInfo {
        return this.server.address() as AddressInfo;
    }

    listen(port: number, address: string): void {
        this.server.listen(port, address, () => {
            this.logService.log('server listening on address %s://%s:%s', this.schema, this.addressInfo.address, this.addressInfo.port);
        });
    }

    start(handle: any): void {
        this.server.listen(handle, () => {
            if (this.addressInfo) {
                this.logService.log('server listening on address %s://%s:%s', this.schema, this.addressInfo.address, this.addressInfo.port);
            }
            else {
                this.logService.log('server listening on fake address');
            }
        });
    }

    stop(handle: any): void {
        this.server.close(handle);
    }

    private configure() {
        this.koa.use(this.router.routes());
        this.koa.use(this.router.allowedMethods());
    
        // root endpoint
        this.koa.use(async (ctx: any, next: any) => {
            const logScope: LogScope = new LogScope("TUNNEL SERVER - ROOT");

            const path = ctx.request.path;
            logScope.log("path %s", path);
            // skip anything not on the root path
            if (path !== '/') {
                await next();
                return;
            }
    
            const isNewClientRequest = ctx.query['new'] !== undefined;
            logScope.log('isNewClientRequest? %s', isNewClientRequest);
            if (isNewClientRequest) {
                const info = await this.clientManager.newClient();
                const url = this.buildUrl(info, ctx.request.host);

                info.url = url;
                ctx.body = info;

                return;
            }
    
            // no new client request, send to landing page
            logScope.log('redirect to %s', this.options.landingPage);
            ctx.redirect(this.options.landingPage);
        });
    
        // anything after the / path is a request for a specific client name
        // This is a backwards compat feature
        this.koa.use(async (ctx: any, next: any) => {
            const logScope: LogScope = new LogScope("TUNNEL SERVER - MULTIPART");
            const parts = ctx.request.path.split('/');
    
            // any request with several layers of paths is not allowed
            // rejects /foo/bar
            // allow /foo
            if (parts.length !== 2) {
                await next();
                return;
            }
    
            const reqId = parts[1];
            logScope.log('clientId %s', reqId);
    
            // limit requested hostnames to 63 characters
            if (! /^(?:[a-z0-9][a-z0-9\-]{4,63}[a-z0-9]|[a-z0-9]{4,63})$/.test(reqId)) {
                const msg = 'Invalid subdomain. Subdomains must be lowercase and between 4 and 63 alphanumeric characters.';
                ctx.status = 403;
                ctx.body = {
                    message: msg,
                };
                return;
            }
    
            logScope.log('making new client with id %s', reqId);
            const info = await this.clientManager.newClient(reqId);
            const url = this.buildUrl(info, ctx.request.host);

            info.url = url;
            ctx.body = info;
            return;
        });    
    }

    private listenRoutes() {
        this.router.get('/api/status', async (ctx, next) => {
            const logScope: LogScope = new LogScope("TUNNEL SERVER - /api/status");

            const stats = this.clientManager.stats;
            ctx.body = {
                tunnels: stats.tunnels,
                mem: process.memoryUsage(),
            };
        });
    
        this.router.get('/api/tunnels/:id/status', async (ctx, next) => {
            const logScope: LogScope = new LogScope("TUNNEL SERVER - /api/tunnels/:id/status");

            const clientId = ctx.params.id;
            logScope.log('clientId %s', clientId);

            const client = this.clientManager.getClient(clientId);
            if (!client) {
                ctx.throw(404);
                return;
            }
    
            const stats = client.stats;
            ctx.body = {
                connected_sockets: stats.connectedSockets,
            };
        });    
    }

    private listenServer() {
        this.server.on('request', (req: any, res: any) => {
            const logScope: LogScope = new LogScope("TUNNEL SERVER - REQUEST");
            logScope.log('url: %s', req.url);

            // without a hostname, we won't know who the request is for
            const hostname = req.headers.host;
            logScope.log('hostname: %s', hostname);
            if (!hostname) {
                res.statusCode = 400;
                res.end('Host header is required');
                return;
            }
    
            const clientId = this.getClientIdFromHostname(hostname);
            logScope.log('clientId %s', clientId);
            if (!clientId) {
                this.appCallback(req, res);
                return;
            }
    
            const client = this.clientManager.getClient(clientId);
            if (!client) {
                res.statusCode = 404;
                res.end('404');
                return;
            }
    
            client.handleRequest(req, res);
        });
    
        this.server.on('upgrade', (req, socket, head) => {
            const logScope: LogScope = new LogScope("TUNNEL SERVER - UPGRADE");
            logScope.log('url: %s', req.url);

            const hostname = req.headers.host;
            logScope.log('hostname: %s', hostname);
            if (!hostname) {
                socket.destroy();
                return;
            }
    
            const clientId = this.getClientIdFromHostname(hostname);
            logScope.log('clientId: %s', clientId);
            if (!clientId) {
                socket.destroy();
                return;
            }
    
            const client = this.clientManager.getClient(clientId);
            if (!client) {
                socket.destroy();
                return;
            }
    
            client.handleUpgrade(req, socket);
        });
    }
    
    private getClientIdFromHostname(hostname: string): string | null {
        return this.tldjs.getSubdomain(hostname);
    }

    private buildUrl(info: any, host: string) {
        return this.schema + '://' + info.id + '.' + host;
    }    
}