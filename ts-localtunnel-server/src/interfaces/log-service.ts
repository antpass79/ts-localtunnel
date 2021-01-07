export interface ILogService {
    log(message: string, ...params: any[]): void;
    warn(message: string, ...params: any[]): void;
    error(message: string, ...params: any[]): void;
    dump(data: any): void;
}