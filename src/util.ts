const randomIdSeed = Math.floor(Math.random() * 1000);

export function randomId() {
  return (
    Math.floor(Math.random() * 100000 + randomIdSeed) * randomIdSeed
  ).toString(26);
}