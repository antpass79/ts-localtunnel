import { IClient } from "../interfaces/client";
import { IClientBuilder } from "../interfaces/client-builder";
import { ITunnelAgentBuilder } from "../interfaces/tunnel-agent-builder";
import { Client } from "./client";

export class ClientBuilder implements IClientBuilder {
    private _tunnelAgentBuilder: ITunnelAgentBuilder;
    private _id: any | undefined = undefined;
    private _maxSockets: number = 1;

    constructor(tunnelAgentBuilder: ITunnelAgentBuilder) {
        this._tunnelAgentBuilder = tunnelAgentBuilder;
    }

    id(id: any): IClientBuilder {
        this._id = id;
        return this;
    }
    maxSockets(maxSockets: number): IClientBuilder {
        this._maxSockets = maxSockets;
        return this;
    }
    build(): IClient {
        const id = this._id;
        const maxSockets = this._maxSockets;
        const tunnelAgent = this._tunnelAgentBuilder
            .id(id)
            .maxSockets(maxSockets)
            .build();

        const client = new Client({
            id,
            tunnelAgent
        });

        return client;
    }
}