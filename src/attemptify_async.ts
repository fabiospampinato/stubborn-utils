
/* IMPORT */

import type {Callable, CallableWithOverloadsWithAlternativeReturn, AttemptifyAsyncOptions} from './types';

/* MAIN */

const attemptifyAsync = <T extends Callable, U> ( fn: T, options: AttemptifyAsyncOptions<U> ): CallableWithOverloadsWithAlternativeReturn<T, U> => {

  const {onError} = options;

  return function attemptified ( ...args: Parameters<T> ): Promise<Awaited<ReturnType<T> | U>> {

    return fn.apply ( undefined, args ).catch ( onError );

  } as CallableWithOverloadsWithAlternativeReturn<T, U>; //TSC

};

/* EXPORT */

export default attemptifyAsync;
