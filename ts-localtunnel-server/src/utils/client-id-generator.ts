import shortid from 'shortid';

export class ClientIdGenerator {
    static generate(): string {
        return shortid.generate().toLowerCase();
    }
}