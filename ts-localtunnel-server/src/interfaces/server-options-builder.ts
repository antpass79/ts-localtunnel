import { ITunnelServerOptions } from "../options/tunnel-server-options";

export interface IServerOptionsBuilder {
    build(): ITunnelServerOptions;
}