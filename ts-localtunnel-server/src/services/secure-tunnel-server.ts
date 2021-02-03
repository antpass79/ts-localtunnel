import https from 'https';
import fs from 'fs';
import { ITunnelServer } from "../interfaces/tunnel-server";
import { ILogService } from '../interfaces/log-service';

export class SecureTunnelServer {
    private _logService: ILogService;
    private _secureServer: https.Server;

    constructor(
        logService: ILogService,
        tunnelServer: ITunnelServer) {
            this._logService = logService;
            
            const sslOpts = {
                cert: fs.readFileSync(__dirname + '/../../cert/cert.pem').toString(),
                key: fs.readFileSync(__dirname + '/../../cert/key.pem').toString(),
            };
        
            this._secureServer = https.createServer(sslOpts);
        
            this._secureServer.on('request', (req, res) => {
                logService.log('SecureTunnelServer.constructor => secureServer.request - url %s', req.url);
                if (req.url === '/?new') {
                    const auth = req.headers.authorization || '';
                    if (auth === '') {
                        logService.log('Rejecting new tunnel without secret: secret required.');
                        res.writeHead(401);
                        res.write('No authorization\n');
                        return;
                    }
        
                    const pieces = auth.split(' ');
        
                    if (pieces.length !== 2) {
                        logService.log('Rejecting new tunnel without secret: invalid authentication header format.');
                        res.writeHead(401);
                        res.write('No authorization\n');
                        return;
                    }
        
                    if (pieces[0] !== 'Basic') {
                        logService.log('Rejecting new tunnel without secret: invalid authentication type.');
                        res.writeHead(401);
                        res.write('No authorization\n');
                        return;
                    }
        
                    const authData = pieces[1];
        
                    const decoded = Buffer.from(authData, 'base64').toString('ascii');
        
                    const authPieces = decoded.split(':');
        
                    if (authPieces[1] !== "foo") {
                        logService.log('Rejecting new tunnel without secret: invalid authentication secret.');
                        res.writeHead(401);
                        res.write('No authorization\n');
                        return;
                    }
                }
                tunnelServer.server.emit('request', req, res);
            });
        
            this._secureServer.on('upgrade', (req, socket, head) => {
                logService.log('SecureTunnelServer.constructor => secureServer.upgrade - url %s', req.url);
                tunnelServer.server.emit('upgrade', req, socket, head);
            });    
    }    

    listen(port: number, address: string): void {
        this._secureServer.listen(port, address, () => {
            this._logService.log('server listening on address https://%s:%s', address, port);
        });
    }
}