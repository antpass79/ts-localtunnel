export interface IFreePortService {
    findPortAsync(portRange: number[] | undefined): Promise<number | undefined>;
}