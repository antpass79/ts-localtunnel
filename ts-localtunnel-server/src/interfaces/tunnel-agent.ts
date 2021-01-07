import { EventEmitter } from "events";
import { TunnelAgentStatistics } from "../options/tunnel-agent-statistics";

export interface ITunnelAgent {
    readonly stats: TunnelAgentStatistics;

    listen(): Promise<any>;
    createConnection(options: any, cb: any): void;
    destroy(): void;

    onOnline(listener: (...args: any[]) => void): void;
    onOffline(listener: (...args: any[]) => void): void;
    onOnceError(listener: (args: Error) => void): void;
}