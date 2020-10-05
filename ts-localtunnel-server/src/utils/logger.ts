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

export class Logger {
    static log(message: string, ...params: any[]) {
        console.log(message, ...params);
    }
    static warn(message: string, ...params: any[]) {
        console.warn(message, ...params);
    }
    static error(message: string, ...params: any[]) {
        console.error(message, ...params);
    }
    static dump(data: any) {
        originalLog(data);
    }
}

export class LogScope {
    private _title: string;
    private _startTime: any;

    constructor(title: string) {
        this._startTime = process.hrtime();

        originalLog('');
        this._title = title.toUpperCase();
        Logger.log(this._title);
    }

    log(message: string, ...params: any[]) {
        const tabMessage = '    ' + message;
        Logger.log(tabMessage, ...params);
    }
    warn(message: string, ...params: any[]) {
        const tabMessage = '    ' + message;
        Logger.warn(tabMessage, ...params);
    }
    error(message: string, ...params: any[]) {
        const tabMessage = '    ' + message;
        Logger.error(tabMessage, ...params);
    }
    dump(data: any) {
        Logger.dump(data);
    }
}