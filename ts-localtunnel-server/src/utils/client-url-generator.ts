import shortid from 'shortid';

export class ClientUrlGenerator {
    static generate(): string {
        return shortid.generate().toLowerCase();
    }
}