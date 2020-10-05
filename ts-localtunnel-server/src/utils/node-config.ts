import fs from 'fs';

export class NodeConfig {

    private static _json: any;

    static init(configurationPath: string) {
        NodeConfig._json = this.readConfig(configurationPath);
    }

    static getValue<T>(key: string) {
        return (process.env[key] || NodeConfig._json[key]) as T;
    }

    private static readConfig(configurationPath: string) {
        let buffer = fs.readFileSync(configurationPath, { encoding: 'utf-8' });
        let jsonBuffer = buffer.toString();
        let jsonData = JSON.parse(jsonBuffer);

        return jsonData;
    }
}