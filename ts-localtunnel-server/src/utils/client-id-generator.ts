import namor from 'namor';

export class ClientIdGenerator {
    static generate(): string {
        return namor.generate({
            words: 0,
            saltLength: 6,
            saltType: 'string'
        });
    }
}