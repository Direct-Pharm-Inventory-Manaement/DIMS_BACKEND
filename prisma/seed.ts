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

/** Expiry dates are relative to seed time so every derived status stays represented. */
function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

const medicines = [
  { name: "Amoxicillin", strength: "500mg", form: "Capsule", packaging: "10×10 Blister", category: "Antibiotics", batchNo: "B-99201-AMX", branch: "Adenta Main", quantity: 1240, unitPriceGhs: 12.5, expiryDate: daysFromNow(450) },
  { name: "Paracetamol Syrup", strength: "", form: "Liquid", packaging: "100ml Bottle", category: "Analgesics", batchNo: "B-44312-PRC", branch: "East Legon", quantity: 45, unitPriceGhs: 8, expiryDate: daysFromNow(240) },
  { name: "Insulin Glargine", strength: "", form: "Injectable", packaging: "3ml Pen", category: "Antidiabetics", batchNo: "B-22871-INS", branch: "Haatso", quantity: 210, unitPriceGhs: 85, expiryDate: daysFromNow(45) },
  { name: "Metformin", strength: "850mg", form: "Tablet", packaging: "Bulk Pack", category: "Antidiabetics", batchNo: "B-11004-MET", branch: "Adenta Main", quantity: 4500, unitPriceGhs: 15.2, expiryDate: daysFromNow(700) },
  { name: "Azithromycin", strength: "250mg", form: "Tablet", packaging: "6 Pack", category: "Antibiotics", batchNo: "B-88321-AZI", branch: "Haatso", quantity: 0, unitPriceGhs: 42, expiryDate: daysFromNow(380) },
  { name: "Lisinopril", strength: "10mg", form: "Tablet", packaging: "30 Pack", category: "Antihypertensives", batchNo: "B-55118-LIS", branch: "Adenta Main", quantity: 890, unitPriceGhs: 18.75, expiryDate: daysFromNow(480) },
  { name: "Cetirizine", strength: "10mg", form: "Tablet", packaging: "10×10 Blister", category: "Antihistamines", batchNo: "B-70233-CET", branch: "East Legon", quantity: 32, unitPriceGhs: 6.5, expiryDate: daysFromNow(600) },
  { name: "Vitamin C", strength: "1000mg", form: "Effervescent", packaging: "20 Tube", category: "Vitamins & Supplements", batchNo: "B-31447-VTC", branch: "Haatso", quantity: 0, unitPriceGhs: 24, expiryDate: daysFromNow(420) },
  { name: "Ibuprofen", strength: "400mg", form: "Tablet", packaging: "10×10 Blister", category: "Analgesics", batchNo: "B-60912-IBU", branch: "Adenta Main", quantity: 2150, unitPriceGhs: 9.8, expiryDate: daysFromNow(570) },
  { name: "Amlodipine", strength: "5mg", form: "Tablet", packaging: "28 Pack", category: "Antihypertensives", batchNo: "B-42760-AML", branch: "East Legon", quantity: 640, unitPriceGhs: 14.3, expiryDate: daysFromNow(30) },
  { name: "Multivitamin Syrup", strength: "", form: "Liquid", packaging: "200ml Bottle", category: "Vitamins & Supplements", batchNo: "B-90185-MVS", branch: "Adenta Main", quantity: 380, unitPriceGhs: 19.5, expiryDate: daysFromNow(730) },
  { name: "Loratadine", strength: "10mg", form: "Tablet", packaging: "10 Pack", category: "Antihistamines", batchNo: "B-27594-LOR", branch: "Haatso", quantity: 28, unitPriceGhs: 11.25, expiryDate: daysFromNow(630) },
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
  for (const medicine of medicines) {
    // Re-seeding refreshes quantities and expiry dates so derived
    // statuses stay meaningful relative to the current date.
    await prisma.medicine.upsert({
      where: { batchNo: medicine.batchNo },
      update: { quantity: medicine.quantity, expiryDate: medicine.expiryDate },
      create: medicine,
    });
  }
  console.log(
    `Seeded ${users.length} users (password: ${DEFAULT_PASSWORD} — change in production) and ${medicines.length} medicines.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
