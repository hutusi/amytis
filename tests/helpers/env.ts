// @types/node 25+ types specific env vars (NODE_ENV, etc.) as readonly on
// `process.env`. Test code that wants to mutate them for the duration of a
// scenario should go through these helpers — they widen the property type so
// TS allows the write while still working at runtime exactly like
// `process.env[key] = ...` always has.

type MutableEnv = Record<string, string | undefined>;

export function setEnvVar(key: string, value: string): void {
  (process.env as MutableEnv)[key] = value;
}

export function restoreEnvVar(key: string, value: string | undefined): void {
  if (value === undefined) {
    delete (process.env as MutableEnv)[key];
  } else {
    (process.env as MutableEnv)[key] = value;
  }
}
