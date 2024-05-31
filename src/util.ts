//@ts-ignore
import getRGB from "consistent-color-generation";

const randomIdSeed = Math.floor(Math.random() * 1000);

export function randomId() {
  return (
    Math.floor(Math.random() * 100000 + randomIdSeed) * randomIdSeed
  ).toString(26);
}

export function name2Color(name: string, myself: boolean) {
  return getRGB(name, undefined, myself ? 90 : 80, myself ? 40 : 60).toString(
    "hex",
  );
}
