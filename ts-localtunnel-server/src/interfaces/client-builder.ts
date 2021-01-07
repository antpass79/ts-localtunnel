import { IClient } from "./client";

export interface IClientBuilder {
    id(id: any): IClientBuilder;
    maxSockets(maxSockets: number): IClientBuilder;
    build(): IClient;
}