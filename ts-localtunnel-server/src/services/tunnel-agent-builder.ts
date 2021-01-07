import { ITunnelAgent } from "../interfaces/tunnel-agent";
import { ITunnelAgentBuilder } from "../interfaces/tunnel-agent-builder";
import { TunnelAgent } from "./tunnel-agent";

export class TunnelAgentBuilder implements ITunnelAgentBuilder {
    private _id: any | undefined = undefined;
    private _maxSockets: number = 1;

    id(id: any): ITunnelAgentBuilder {
        this._id = id;
        return this;
    }
    maxSockets(maxSockets: number): ITunnelAgentBuilder {
        this._maxSockets = maxSockets;
        return this;
    }
    build(): ITunnelAgent {
        const tunnelAgent = new TunnelAgent({
            clientId: this._id,
            maxSockets: this._maxSockets
        });

        return tunnelAgent;
    }
}