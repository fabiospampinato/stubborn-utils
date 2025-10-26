
/* IMPORT */

import {describe} from 'fava';
import {attemptifyAsync, attemptifySync, retryifyAsync, retryifySync} from '../dist/index.js';

/* MAIN */

describe ( 'Stubborn Utils', () => {

  describe ( 'attemptifyAsync', it => {

    it ( 'can override an error', async t => {

      let fnCount = 0;
      let fnArgs = [];

      let attemptCount = 0;
      let attemptArgs = [];

      const fn = async shouldThrow => {
        fnCount += 1;
        fnArgs.push ([ shouldThrow ]);
        t.wait ( 1 );
        if ( shouldThrow ) {
          throw 'A';
        } else {
          return 1;
        }
      };

      const afn = attemptifyAsync ( fn, {
        onError: error => {
          attemptCount += 1;
          attemptArgs.push ([ error ]);
          return 2;
        }
      });

      const result1 = await afn ( true );

      t.is ( fnCount, 1 );
      t.deepEqual ( fnArgs, [[true]] );

      t.is ( attemptCount, 1 );
      t.deepEqual ( attemptArgs, [['A']] );

      t.is ( result1, 2 );

      const result2 = await afn ( false );

      t.is ( fnCount, 2 );
      t.deepEqual ( fnArgs, [[true], [false]] );

      t.is ( attemptCount, 1 );
      t.deepEqual ( attemptArgs, [['A']] );

      t.is ( result2, 1 );

    });

  });

  describe ( 'attemptifySync', it => {

    it ( 'can override an error', t => {

      let fnCount = 0;
      let fnArgs = [];

      let attemptCount = 0;
      let attemptArgs = [];

      const fn = shouldThrow => {
        fnCount += 1;
        fnArgs.push ([ shouldThrow ]);
        if ( shouldThrow ) {
          throw 'A';
        } else {
          return 1;
        }
      };

      const afn = attemptifySync ( fn, {
        onError: error => {
          attemptCount += 1;
          attemptArgs.push ([ error ]);
          return 2;
        }
      });

      const result1 = afn ( true );

      t.is ( fnCount, 1 );
      t.deepEqual ( fnArgs, [[true]] );

      t.is ( attemptCount, 1 );
      t.deepEqual ( attemptArgs, [['A']] );

      t.is ( result1, 2 );

      const result2 = afn ( false );

      t.is ( fnCount, 2 );
      t.deepEqual ( fnArgs, [[true], [false]] );

      t.is ( attemptCount, 1 );
      t.deepEqual ( attemptArgs, [['A']] );

      t.is ( result2, 1 );

    });

  });

  describe ( 'retryifyAsync', it => {

    it ( 'can retry when a retriable error is encountered', async t => {

      let fnCount = 0;
      let fnArgs = [];

      let retriableCount = 0;
      let retriableArgs = [];

      const fn = async ( ...args ) => {
        fnCount += 1;
        fnArgs.push ( args );
        await t.wait ( 1 );
        if ( fnCount === 1 ) throw 'A';
        if ( fnCount === 2 ) throw 'B';
        if ( fnCount === 3 ) return 'C';
      };

      const rfn = retryifyAsync ( fn, {
        isRetriable: error => {
          retriableCount += 1;
          retriableArgs.push ([ error ]);
          return error === 'A' || error === 'B';
        }
      });

      const result = await rfn ({ timeout: 1_000 })();

      t.is ( fnCount, 3 );
      t.deepEqual ( fnArgs, [[], [], []] );

      t.is ( retriableCount, 2 );
      t.deepEqual ( retriableArgs, [['A'], ['B']] );

      t.is ( result, 'C' );

    });

    it ( 'can retry with a set backoff interval', async t => {

      let fnFastCount = 0;
      let fnSlowCount = 0;

      let retriableFastCount = 0;
      let retriableSlowCount = 0;

      let startTimestamp = Date.now ();

      const fnFast = async () => {
        fnFastCount += 1;
        await t.wait ( 1 );
        throw fnFastCount;
      };

      const fnSlow = async () => {
        fnSlowCount += 1;
        await t.wait ( 1 );
        throw fnSlowCount;
      };

      const rfnFast = retryifyAsync ( fnFast, {
        isRetriable: () => {
          retriableFastCount += 1;
          return true;
        }
      });

      const rfnSlow = retryifyAsync ( fnSlow, {
        isRetriable: () => {
          retriableSlowCount += 1;
          return true;
        }
      });

      await Promise.allSettled ([
        rfnFast ({ timeout: 1_000, interval: 10 })(),
        rfnSlow ({ timeout: 1_000,interval: 500 })()
      ]);

      t.true ( Date.now () - startTimestamp >= 1_000 );
      t.true ( fnFastCount > fnSlowCount * 10 );
      t.true ( retriableFastCount > retriableSlowCount * 10 );
      t.is ( fnFastCount, retriableFastCount );
      t.is ( fnSlowCount, retriableSlowCount );

    });

    it ( 'can not retry when a non-retriable error is encountered', async t => {

      let fnCount = 0;
      let fnArgs = [];

      let retriableCount = 0;
      let retriableArgs = [];

      const fn = async ( ...args ) => {
        fnCount += 1;
        fnArgs.push ( args );
        await t.wait ( 1 );
        if ( fnCount === 1 ) throw 'A';
        if ( fnCount === 2 ) throw 'B';
        if ( fnCount === 3 ) return 'C';
      };

      const rfn = retryifyAsync ( fn, {
        isRetriable: error => {
          retriableCount += 1;
          retriableArgs.push ([ error ]);
          return false;
        }
      });

      try {

        await rfn ({ timeout: 1_000 })();

      } catch ( error ) {

        t.is ( fnCount, 1 );
        t.deepEqual ( fnArgs, [[]] );

        t.is ( retriableCount, 1 );
        t.deepEqual ( retriableArgs, [['A']] );

        t.is ( error, 'A' );

      }

    });

    it ( 'can not retry when the timeout is reached', async t => {

      let fnCount = 0;
      let retriableCount = 0;
      let startTimestamp = Date.now ();

      const fn = async () => {
        fnCount += 1;
        await t.wait ( 1 );
        throw fnCount;
      };

      const rfn = retryifyAsync ( fn, {
        isRetriable: () => {
          retriableCount += 1;
          return true;
        }
      });

      try {

        await rfn ({ timeout: 1_000 })();

      } catch ( error ) {

        t.true ( Date.now () - startTimestamp >= 1_000 );
        t.true ( error > 1 );

        t.is ( error, fnCount );
        t.is ( fnCount, retriableCount );

      }

    });

  });

  describe ( 'retryifySync', it => {

    it ( 'can retry when a retriable error is encountered', t => {

      let fnCount = 0;
      let fnArgs = [];

      let retriableCount = 0;
      let retriableArgs = [];

      const fn = ( ...args ) => {
        fnCount += 1;
        fnArgs.push ( args );
        if ( fnCount === 1 ) throw 'A';
        if ( fnCount === 2 ) throw 'B';
        if ( fnCount === 3 ) return 'C';
      };

      const rfn = retryifySync ( fn, {
        isRetriable: error => {
          retriableCount += 1;
          retriableArgs.push ([ error ]);
          return error === 'A' || error === 'B';
        }
      });

      const result = rfn ({ timeout: 100 })();

      t.is ( fnCount, 3 );
      t.deepEqual ( fnArgs, [[], [], []] );

      t.is ( retriableCount, 2 );
      t.deepEqual ( retriableArgs, [['A'], ['B']] );

      t.is ( result, 'C' );

    });

    it ( 'can not retry when a non-retriable error is encountered', t => {

      let fnCount = 0;
      let fnArgs = [];

      let retriableCount = 0;
      let retriableArgs = [];

      const fn = ( ...args ) => {
        fnCount += 1;
        fnArgs.push ( args );
        if ( fnCount === 1 ) throw 'A';
        if ( fnCount === 2 ) throw 'B';
        if ( fnCount === 3 ) return 'C';
      };

      const rfn = retryifySync ( fn, {
        isRetriable: error => {
          retriableCount += 1;
          retriableArgs.push ([ error ]);
          return false;
        }
      });

      try {

        rfn ({ timeout: 100 })();

      } catch ( error ) {

        t.is ( fnCount, 1 );
        t.deepEqual ( fnArgs, [[]] );

        t.is ( retriableCount, 1 );
        t.deepEqual ( retriableArgs, [['A']] );

        t.is ( error, 'A' );

      }

    });

    it ( 'can not retry when the timeout is reached', t => {

      let fnCount = 0;
      let retriableCount = 0;
      let startTimestamp = Date.now ();

      const fn = () => {
        fnCount += 1;
        throw fnCount;
      };

      const rfn = retryifySync ( fn, {
        isRetriable: () => {
          retriableCount += 1;
          return true;
        }
      });

      try {

        rfn ({ timeout: 100 })();

      } catch ( error ) {

        t.true ( Date.now () - startTimestamp >= 100 );
        t.true ( error > 100_000 );

        t.is ( error, fnCount );
        t.is ( fnCount, retriableCount );

      }

    });

  });

});
