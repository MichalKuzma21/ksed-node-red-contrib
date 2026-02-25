import { ConfigProvider, Effect, Exit } from 'effect/index';
import { Node } from 'node-red';

export function validateNodeConfig<A>(
  node: Node,
  configEffect: Effect.Effect<A, unknown, never>,
  configProvider: ConfigProvider.ConfigProvider,
  nodeLabel: string,
): A | null {
  node.status({});

  const result = Effect.runSyncExit(configEffect.pipe(Effect.withConfigProvider(configProvider)));

  if (Exit.isFailure(result)) {
    node.status({ fill: 'red', shape: 'ring', text: 'invalid config' });
    node.error(`${nodeLabel}: invalid configuration - ${result.cause}`);
    return null;
  }

  return result.value;
}
