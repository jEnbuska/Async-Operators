import { provider, } from '../../';
import { sleep, } from '../common';

describe('provider from callback', () => {

    test('callback', async() => {
        async function oneTwoThree (onNext) {
            await sleep(10);
            onNext(1);
            await sleep(10);
            onNext(2);
            await sleep(10);
            onNext(3);
        }

        const results = await provider({
            async callback ({ onNext, onComplete, }) {
                await oneTwoThree(onNext);
                onComplete();
            }, })
            .reduce((acc, int) => [ ...acc, int, ], [])
            .pull();
        expect(results).toEqual([ 1, 2, 3, ]);
    });
});
