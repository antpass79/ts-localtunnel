import { IClient } from '../interfaces/client';
import { IClientBuilder } from '../interfaces/client-builder';
import { IClientManager } from '../interfaces/client-manager';
import { ILogService } from '../interfaces/log-service';
import { IServerOptionsResolver } from '../interfaces/server-options-resolver';
import { ClientManagerStatistics } from '../options/client-manager-statistics';
import { ITunnelServerOptions } from '../options/tunnel-server-options';
import { ClientIdGenerator } from '../utils/client-id-generator';

export class ClientManager implements IClientManager {
    private logService: ILogService;
    private clientBuilder: IClientBuilder;

    private opt: ITunnelServerOptions;
    private clients: Map<string, IClient>;
    private graceTimeout: any;

    constructor(
        logService: ILogService,
        clientBuilder: IClientBuilder,
        serverOptionsResolver: IServerOptionsResolver) {
            this.logService = logService;
            this.clientBuilder = clientBuilder;

            this.opt = serverOptionsResolver.resolve();
            this.clients = new Map<string, IClient>();
            this._stats = {
                tunnels: 0
            };
            // This is totally wrong :facepalm: this needs to be per-client...
            this.graceTimeout = null;
    }

    private _stats: ClientManagerStatistics;
    get stats(): ClientManagerStatistics {
        return this._stats;
    }

    async newClient(id?: string): Promise<any> {
        const clients = this.clients;
        const stats = this.stats;
        const maxSockets = this.opt.maxTcpSockets;

        let newId = id ?? ClientIdGenerator.generate();

        const exist = this.clients.has(newId);
        if (exist) {
            newId = ClientIdGenerator.generate();
        }
        this.logService.log('ClientManager.newClient - id %s, newId %s', id, newId);

        const client = this.clientBuilder
            .id(newId)
            .maxSockets(maxSockets)
            .build();

        clients.set(newId, client);

        client
            .onOnceClose(() => {
                this.logService.log('ClientManager.newClient => client.onOnceClose - id %s', newId);
                this.removeClient(newId);
            })
            .onOnceOffline(() => {
                this.logService.log('ClientManager.newClient => client.onOnceOffline - id %s', newId);
                this.removeClient(newId);
            });

        try {
            const info = await client.listen(this.opt.portRange);
            ++stats.tunnels;
            return {
                id: newId,
                port: info.port,
                max_conn_count: maxSockets
            };
        }
        catch (error) {
            this.logService.error(error);
            this.removeClient(newId);

            throw error;
        }
    }

    removeClient(id: any) {
        this.logService.log('ClientManager.removeClient - id %s', id);
        const client = this.clients.get(id);
        if (!client) {
            return;
        }
        --this.stats.tunnels;
        this.clients.delete(id);
        client.close();
    }

    hasClient(id: string): boolean {
        return !!this.clients.has(id);
    }

    getClient(id: string): IClient | undefined {
        return this.clients.get(id);
    }
}