import { inject, injectable } from "inversify";
import { ILogService } from "../interfaces/log-service";
import SERVICE_IDENTIFIER from "../ioc/identifiers";
import container from "../ioc/inversify.config";

var originalLog = console.log;
var log = console.log;

console.log = function () {
    var first_parameter = arguments[0];
    var other_parameters = Array.prototype.slice.call(arguments, 1);

    function formatConsoleDate(date: Date) {
        var hour = date.getHours();
        var minutes = date.getMinutes();
        var seconds = date.getSeconds();
        var milliseconds = date.getMilliseconds();

        return '[' +
               ((hour < 10) ? '0' + hour: hour) +
               ':' +
               ((minutes < 10) ? '0' + minutes: minutes) +
               ':' +
               ((seconds < 10) ? '0' + seconds: seconds) +
               '.' +
               ('00' + milliseconds).slice(-3) +
               '] ';
    }

    log.apply(console, [formatConsoleDate(new Date()) + first_parameter].concat(other_parameters));
};

@injectable()
export class ConsoleLogService implements ILogService {
    log(message: string, ...params: any[]) {
        console.log(message, ...params);
    }
    warn(message: string, ...params: any[]) {
        console.warn(message, ...params);
    }
    error(message: string, ...params: any[]) {
        console.error(message, ...params);
    }
    dump(data: any) {
        originalLog(data);
    }
}

export class LogScope {
    private _title: string;
    private _startTime: any;
    private _logService: ILogService;

    constructor(title: string) {
        this._logService = container.get<ILogService>(SERVICE_IDENTIFIER.LOG_SERVICE);
        this._startTime = process.hrtime();

        originalLog('');
        this._title = title.toUpperCase();
        this._logService.log(this._title);
    }

    log(message: string, ...params: any[]) {
        const tabMessage = '    ' + message;
        this._logService.log(tabMessage, ...params);
    }
    warn(message: string, ...params: any[]) {
        const tabMessage = '    ' + message;
        this._logService.warn(tabMessage, ...params);
    }
    error(message: string, ...params: any[]) {
        const tabMessage = '    ' + message;
        this._logService.error(tabMessage, ...params);
    }
    dump(data: any) {
        this._logService.dump(data);
    }
}