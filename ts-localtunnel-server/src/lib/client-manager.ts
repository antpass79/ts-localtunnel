import Debug from 'debug';

import { ClientUrlGenerator } from '../utils/client-url-generator';
import { Client } from './client';
import { TunnelAgent } from './tunnel-agent';
// import { hri } from 'human-readable-ids';

export class ClientManager {
    private opt: any;
    private clients: Map<string, Client>;
    private debug: Debug.Debugger;
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

        this.debug = Debug('lt:ClientManager');

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
        if (this.clients.has(id)) {            
            id = ClientUrlGenerator.generate();
        }

        const maxSockets = this.opt.max_tcp_sockets;
        const agent = new TunnelAgent({
            clientId: id,
            maxSockets: 10,
        });

        const client = new Client({
            id,
            agent,
        });

        // add to clients map immediately
        // avoiding races with other clients requesting same id
        clients.set(id, client);

        client.emitter.once('close', () => {
            console.log('client close from emitter once');
            this.removeClient(id);
        });

        // try/catch used here to remove client id
        try {
            const info = await agent.listen();
            ++stats.tunnels;
            return {
                id: id,
                port: info.port,
                max_conn_count: maxSockets,
            };
        }
        catch (err) {
            console.log(err);
            this.removeClient(id);
            // rethrow error for upstream to handle
            throw err;
        }
    }

    removeClient(id: any) {
        console.log('removing client: %s', id);
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