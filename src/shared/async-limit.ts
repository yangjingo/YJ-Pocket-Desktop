export function createLimit(max: number) {
  if (!Number.isInteger(max) || max < 1) throw new Error('并发数必须是正整数');
  let active = 0;
  const waiting: Array<() => void> = [];
  const drain = () => {
    while (active < max && waiting.length) {
      active += 1;
      waiting.shift()?.();
    }
  };
  return <T>(task: () => Promise<T>): Promise<T> => new Promise((resolve, reject) => {
    waiting.push(() => {
      Promise.resolve().then(task).then(resolve, reject).finally(() => { active -= 1; drain(); });
    });
    drain();
  });
}
