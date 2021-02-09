import portfinder from 'portfinder';
import { IFreePortService } from "../interfaces/free-port-service";
import { LogScope } from './log-service';

export class FreePortService implements IFreePortService {
    async findPortAsync(portRange: number[] | undefined): Promise<number | undefined> {
        const logScope: LogScope = new LogScope("FREE PORT SERVICE - findPortAsync");
        logScope.log("The required port range is:");
        logScope.dump(portRange);

        let port = undefined;

        try {
            portfinder.basePort = portRange && portRange.length > 1 ? portRange[0] : portfinder.basePort;
            port = await portfinder.getPortPromise({
                port: portRange && portRange.length > 1 ? portRange[0] : undefined,
                stopPort: portRange && portRange.length > 1 ? portRange[1] : undefined,                
            });
        } catch (err) {
            logScope.dump(err);
            port = undefined;
        }

        logScope.log("FreePortService found the following free port: " + port);

        return port;
    }
}