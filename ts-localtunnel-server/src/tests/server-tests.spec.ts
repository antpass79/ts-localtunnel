import request from 'supertest';
import { assert } from 'chai';
import { Server as WebSocketServer } from 'ws';
import WebSocket from 'ws';
import net from 'net';

import { TunnelServer } from '../lib/tunnel-server';
import { initTunnelServerOptions } from '../models/tunnel-server-options';

describe('server', () => {
    context('Start and Stop', () => {
        let tunnelServer = new TunnelServer();

        it('the server starts', async () => {
            await new Promise(resolve => tunnelServer.start(resolve));
        });
        it('the server stops', async () => {
            await new Promise(resolve => tunnelServer.stop(resolve));
        });
    });

    context('Response', () => {
        it('should redirect root requests to landing page', async () => {
            let tunnelServer = new TunnelServer();
            const response = await request(tunnelServer.server).get('/');

            assert.strictEqual('https://localtunnel.github.io/www/', response.headers.location);
        });
        it('should support custom base domains', async () => {   
            const options = initTunnelServerOptions();
            options.domains = ['domain.example.com'];
            const tunnelServer = new TunnelServer(options);
            const response = await request(tunnelServer.server).get('/');

            assert.strictEqual('https://localtunnel.github.io/www/', response.headers.location);
        });
        it('reject long domain name requests', async () => {
            let tunnelServer = new TunnelServer();
            const response = await request(tunnelServer.server).get('/thisdomainisoutsidethesizeofwhatweallowwhichissixtythreecharacters');

            assert.strictEqual(response.body.message, 'Invalid subdomain. Subdomains must be lowercase and between 4 and 63 alphanumeric characters.');
        });    
    });

    context('WebSockets', () => {
        it('should upgrade websocket requests', async () => {
            const hostname = 'websocket-test';
            const options = initTunnelServerOptions();
            options.domains = ['example.com'];
            const tunnelServer = new TunnelServer(options);
            await new Promise(resolve => tunnelServer.start(resolve));
    
            const res = await request(tunnelServer.server).get('/websocket-test');
            const localTunnelPort = res.body.port;
    
            const wss: WebSocketServer = await new Promise((resolve) => {
                const wsServer = new WebSocketServer({ port: 0 }, () => {
                    resolve(wsServer);
                });
            });
    
            const websocketServerPort = (wss.address() as net.AddressInfo).port;
    
            const ltSocket = net.createConnection({ port: localTunnelPort });
            const wsSocket = net.createConnection({ port: websocketServerPort });
            ltSocket.pipe(wsSocket).pipe(ltSocket);
    
            wss.once('connection', (ws) => {
                ws.once('message', (message) => {
                    ws.send(message);
                });
            });
    
            const ws = new WebSocket('http://localhost:' + tunnelServer.addressInfo.port, {
                headers: {
                    host: hostname + '.example.com',
                }
            });
    
            ws.on('open', () => {
                ws.send('something');
            });
    
            await new Promise((resolve) => {
                ws.once('message', (msg) => {
                    assert.equal(msg, 'something');
                    resolve();
                });
            });
    
            wss.close();
            await new Promise(resolve => tunnelServer.stop(resolve));
        });    
    });

    context('Tunnel', () => {
        it('should support the /api/tunnels/:id/status endpoint', async () => {
            const tunnelServer = new TunnelServer();
            await new Promise(resolve => tunnelServer.start(resolve));
    
            // no such tunnel yet
            const res: any = await request(tunnelServer.server).get('/api/tunnels/foobar-test/status');
            assert.equal(res.statusCode, 404);
    
            // request a new client called foobar-test
            {
                const res = await request(tunnelServer.server).get('/foobar-test');
            }
    
            {
                const res: any = await request(tunnelServer.server).get('/api/tunnels/foobar-test/status');
                assert.equal(res.statusCode, 200);
                assert.deepEqual(res.body, {
                    connected_sockets: 0,
                });
            }
    
            await new Promise(resolve => tunnelServer.stop(resolve));
        });
    });
});