import { Tunnel } from './lib/tunnel';

export class LocalTunnel {
    private options: any;
    private callback: any;
    private _client: any;

    constructor(options: any, callback: any, client: any) {
        this.options = typeof options === 'object' ? options : { ...callback, port: options };
        this.callback = typeof options === 'object' ? callback : client;
        this._client = new Tunnel(this.options);
    }

    get client() {
        if (this.callback) {
            this._client.open((err: any) => (err ? this.callback(err) : this.callback(null, this._client)));
            return this._client;
          }
          
        return new Promise((resolve, reject) =>
           this._client.open((err: any) => (err ? reject(err) : resolve(this._client)))
        );
    }
}