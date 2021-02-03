import http from "http";
import { AddressInfo } from "net";
import { ITunnelServerOptions } from "../options/tunnel-server-options";

export interface ITunnelServer {
    readonly options: ITunnelServerOptions;
    readonly addressInfo: AddressInfo;
    readonly server: http.Server;

    listen(port: number, address: string): void;
    start(handle: any): void;
    stop(handle: any): void;
}