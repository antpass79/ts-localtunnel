import { ITunnelAgent } from "./tunnel-agent";

export interface ITunnelAgentBuilder {
    id(id: any): ITunnelAgentBuilder;
    maxSockets(maxSockets: number): ITunnelAgentBuilder;
    build(): ITunnelAgent;
}