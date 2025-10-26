
/* IMPORT */

import type {Callable, RetryifySyncOptions, RetryifySyncCallOptions} from './types';

/* MAIN */

const retryifySync = <T extends Callable> ( fn: T, options: RetryifySyncOptions ): (( options: RetryifySyncCallOptions ) => T) => {

  const {isRetriable} = options;

  return function retryified ( options: RetryifySyncCallOptions ): T {

    const {timeout} = options;
    const timestamp = Date.now () + timeout;

    return function attempt ( ...args: Parameters<T> ): ReturnType<T> {

      while ( true ) {

        try {

          return fn.apply ( undefined, args );

        } catch ( error: unknown ) {

          if ( !isRetriable ( error ) ) throw error;

          if ( Date.now () >= timestamp ) throw error;

          continue;

        }

      }

    } as T; //TSC

  };

};

/* EXPORT */

export default retryifySync;
