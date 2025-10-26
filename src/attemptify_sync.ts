
/* IMPORT */

import type {Callable, CallableWithOverloadsWithAlternativeReturn, AttemptifySyncOptions} from './types';

/* MAIN */

const attemptifySync = <T extends Callable, U> ( fn: T, options: AttemptifySyncOptions<U> ): CallableWithOverloadsWithAlternativeReturn<T, U> => {

  const {onError} = options;

  return function attemptified ( ...args: Parameters<T> ): ReturnType<T> | U {

    try {

      return fn.apply ( undefined, args );

    } catch ( error: unknown ) {

      return onError ( error );

    }

  } as CallableWithOverloadsWithAlternativeReturn<T, U>; //TSC

};

/* EXPORT */

export default attemptifySync;
