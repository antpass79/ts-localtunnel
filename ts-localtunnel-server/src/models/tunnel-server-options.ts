import path from 'path';
import { NodeConfig } from '../utils/node-config';

NodeConfig.init(path.join(__dirname, '../../assets/config.json'));

export interface ITunnelServerOptions {
    secure: boolean,
    address: string,
    port: number,
    maxTcpSockets: number,
    domains?: string[],
    landingPage?: string
}

export function initTunnelServerOptions(): ITunnelServerOptions {
    return {
        secure: NodeConfig.getValue<boolean>("SECURE_PROTOCOL"),
        address: NodeConfig.getValue<string>("SERVER_ADDRESS"),
        port: NodeConfig.getValue<number>("SERVER_PORT"),
        maxTcpSockets: NodeConfig.getValue<number>("MAX_SOCKETS"),
        domains: NodeConfig.getValue<string[]>("DOMAINS"),
        landingPage: NodeConfig.getValue<string>("LANDING_PAGE")
    };
}