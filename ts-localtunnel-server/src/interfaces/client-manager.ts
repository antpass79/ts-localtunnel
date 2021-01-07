import { ClientManagerStatistics } from "../options/client-manager-statistics";
import { IClient } from "./client";

export interface IClientManager {
    readonly stats: ClientManagerStatistics;

    newClient(id?: string): Promise<any>;
    removeClient(id: any): void;
    hasClient(id: string): boolean;
    getClient(id: string): IClient | undefined;
}