import prisma from "../config/db";
import { handler } from "../lambda/monthlyStatisticsHandler";

const job = process.argv[2];

if (
  job !== "CREATE_PREVIOUS_MONTH_SNAPSHOT" &&
  job !== "VERIFY_PREVIOUS_MONTH_SNAPSHOT"
) {
  throw new Error(
    "CREATE_PREVIOUS_MONTH_SNAPSHOT 또는 VERIFY_PREVIOUS_MONTH_SNAPSHOT을 지정해주세요.",
  );
}

handler({ job })
  .then((result) => {
    console.info("[monthly-statistics-job-result]", result);
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
