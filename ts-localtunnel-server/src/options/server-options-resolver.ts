import { IServerOptionsBuilder } from '../interfaces/server-options-builder';
import { IServerOptionsResolver } from '../interfaces/server-options-resolver';
import { ITunnelServerOptions } from './tunnel-server-options';

export class ServerOptionsResolver implements IServerOptionsResolver {

    private _serverOptionsBuilder: IServerOptionsBuilder;
    private _options: ITunnelServerOptions | undefined;

    constructor(serverOptionsBuilder: IServerOptionsBuilder) {
        this._serverOptionsBuilder = serverOptionsBuilder;
    }

    resolve(): ITunnelServerOptions {
        if (this._options) {
            return this._options;
        }

        this._options = this._serverOptionsBuilder.build();
        return this._options;        
   }
}