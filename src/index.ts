import "dotenv/config";
import { main } from "./scraper";

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
