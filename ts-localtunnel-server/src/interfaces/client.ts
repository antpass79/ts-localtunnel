import { EventEmitter } from "events";
import { TunnelAgentStatistics } from "../options/tunnel-agent-statistics";

export interface IClient {
    readonly stats: any;
    
    listen(port?: number | undefined): Promise<any>;
    close(): void;

    handleRequest(req: any, res: any): void;
    handleUpgrade(req: any, socket: any): void;

    onOnceClose(listener: (...args: any[]) => void): this;
    onOnceOffline(listener: (...args: any[]) => void): this;
}