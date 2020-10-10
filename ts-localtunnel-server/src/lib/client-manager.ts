import { ClientIdGenerator } from '../utils/client-id-generator';
import { Logger } from '../utils/logger';
import { Client } from './client';
import { TunnelAgent } from './tunnel-agent';

export class ClientManager {
    private opt: any;
    private clients: Map<string, Client>;
    private graceTimeout: any;

    private _stats: any;
    get stats() {
        return this._stats;
    }

    constructor(opt: any) {
        this.opt = opt || {};

        // id -> client instance
        this.clients = new Map<string, Client>();

        // statistics
        this._stats = {
            tunnels: 0
        };

        // This is totally wrong :facepalm: this needs to be per-client...
        this.graceTimeout = null;
    }

    // create a new tunnel with `id`
    // if the id is already used, a random id is assigned
    // if the tunnel could not be created, throws an error
    async newClient(id: any): Promise<any> {
        const clients = this.clients;
        const stats = this.stats;

        // can't ask for id already is use
        const exist = this.clients.has(id);
        Logger.log('id %s exist? %s', id, exist);
        if (exist) {            
            id = ClientIdGenerator.generate();
            Logger.log('new id %s', id);
        }

        const maxSockets = this.opt.maxTcpSockets;
        Logger.log('max tcp sockets %s', maxSockets);
        const agent = new TunnelAgent({
            clientId: id,
            maxSockets: maxSockets
        });

        const client = new Client({
            id,
            agent
        });

        // add to clients map immediately
        // avoiding races with other clients requesting same id
        clients.set(id, client);

        client.emitter.once('close', () => {
            Logger.log('client close from emitter once');
            this.removeClient(id);
        });

        // try/catch used here to remove client id
        try {
            const info = await agent.listen();
            ++stats.tunnels;
            return {
                id: id,
                port: info.port,
                max_conn_count: maxSockets
            };
        }
        catch (err) {
            Logger.log(err);
            this.removeClient(id);
            // rethrow error for upstream to handle
            throw err;
        }
    }

    removeClient(id: any) {
        Logger.log('removing client: %s', id);
        const client = this.clients.get(id);
        if (!client) {
            return;
        }
        --this.stats.tunnels;
        this.clients.delete(id);
        client.close();
    }

    hasClient(id: string) {
        return !!this.clients.has(id);
    }

    getClient(id: string): Client | undefined {
        return this.clients.get(id);
    }
}