import { concurrently } from "concurrently";
import { resolve } from "path";

const backendPath = resolve(__dirname, "../backend");
const frontendPath = resolve(__dirname, "../frontend");

async function main() {
  const { result } = concurrently([
    { command: "turso dev" },
    { command: `cd ${backendPath} && bun run dev` },
    { command: `cd ${frontendPath} && bun run start` },
  ]);

  console.log(await result);
}
main();
