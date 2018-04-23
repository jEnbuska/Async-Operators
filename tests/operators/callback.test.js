import { provider, } from '../../';
import { sleep, } from '../common';

describe('provider from callback', () => {

    test('callback', async() => {
        const results = await provider.fromCallback(
            async function ({ onNext, onComplete, }) {
                await sleep(10);
                onNext(1);
                await sleep(10);
                onNext(2);
                await sleep(10);
                onNext(3);
                onComplete();
            })
            .reduce((acc, int) => [ ...acc, int, ], [])
            .pull();
        expect(results).toEqual([ 1, 2, 3, ]);
    });
});
