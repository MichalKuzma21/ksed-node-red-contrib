import { Effect, Logger, LogLevel } from 'effect';
import type { Node, NodeMessage } from 'node-red';

export interface NodeRedEffectConfig {
  pendingMessage: string;
  successMessage: string;
  errorMessage: string;
  debug?: boolean;
}

export const runEffectInNodeRed =
  <A, E>(node: Node, originalMsg: NodeMessage, config: NodeRedEffectConfig) =>
  (program: Effect.Effect<A, E>) => {
    node.status({ fill: 'blue', shape: 'dot', text: config.pendingMessage });

    const programWithLogLevel = config.debug
      ? program.pipe(Logger.withMinimumLogLevel(LogLevel.Debug))
      : program;

    const handleResult = Effect.match(programWithLogLevel, {
      onSuccess: (result) => {
        node.status({ fill: 'green', shape: 'dot', text: config.successMessage });
        const successMsg = { payload: result, originalMsg };
        node.send([successMsg, null]);
      },
      onFailure: (error) => {
        node.status({ fill: 'red', shape: 'dot', text: config.errorMessage });
        node.error(error);
        const errorMsg = { payload: JSON.stringify(error) };
        node.send([null, errorMsg]);
      },
    });

    const finalProgram = handleResult.pipe(
      Effect.catchAllDefect((cause) => {
        node.status({ fill: 'red', shape: 'dot', text: 'Unexpected error' });
        const errorMsg = {
          payload: {
            cause: cause,
          },
          originalMsg,
        };
        node.error(cause);
        node.send([null, errorMsg]);
        return Effect.succeed(undefined);
      }),
    );

    return Effect.runPromise(finalProgram);
  };
