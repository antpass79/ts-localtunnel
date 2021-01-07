import { ITunnelServerOptions } from "../options/tunnel-server-options";

export interface IServerOptionsResolver {
    resolve(): ITunnelServerOptions;
}