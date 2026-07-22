import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = "ChangeMe123!";

const users = [
  {
    name: "System Administrator",
    email: "admin@directpharmacy.com",
    username: "admin",
    role: "administrator",
    branch: "adenta",
  },
  {
    name: "Adenta Staff",
    email: "adenta.staff@directpharmacy.com",
    username: "adenta-staff",
    role: "staff",
    branch: "adenta",
  },
  {
    name: "Haatso Staff",
    email: "haatso.staff@directpharmacy.com",
    username: "haatso-staff",
    role: "staff",
    branch: "haatso",
  },
];

async function main() {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);
  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: { ...user, passwordHash },
    });
  }
  console.log(
    `Seeded ${users.length} users (password: ${DEFAULT_PASSWORD} — change in production).`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
