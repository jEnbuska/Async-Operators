
export async function sleep (time, result) {
  return new Promise(res => setTimeout(() => {
    res(result);
  }, time));
}