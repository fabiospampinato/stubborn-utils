
/* IMPORT */

import {RETRY_INTERVAL} from './constants';
import type {Callable, RetryifyAsyncOptions, RetryifyAsyncCallOptions} from './types';

/* MAIN */

const retryifyAsync = <T extends Callable> ( fn: T, options: RetryifyAsyncOptions ): (( options: RetryifyAsyncCallOptions ) => T) => {

  const {isRetriable} = options;

  return function retryified ( options: RetryifyAsyncCallOptions ): T {

    const {timeout} = options;
    const interval = options.interval ?? RETRY_INTERVAL;
    const timestamp = Date.now () + timeout;

    return function attempt ( ...args: Parameters<T> ): ReturnType<T> {

      return fn.apply ( undefined, args ).catch ( ( error: unknown ) => {

        if ( !isRetriable ( error ) ) throw error;

        if ( Date.now () >= timestamp ) throw error;

        const delay = Math.round ( interval * Math.random () );

        if ( delay > 0 ) {

          const delayPromise = new Promise ( resolve => setTimeout ( resolve, delay ) );

          return delayPromise.then ( () => attempt.apply ( undefined, args ) );

        } else {

          return attempt.apply ( undefined, args );

        }

      });

    } as T; //TSC

  };

};

/* EXPORT */

export default retryifyAsync;
