import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/database/generated/prisma/client';
import { ClinicType, Role } from '../src/database/generated/prisma/enums';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// Matches BcryptService, so a seeded account and a registered one look
// identical to the login flow.
const SALT_ROUNDS = 12;

// Shared by every seeded staff account. Alphanumeric and 6+ characters so it
// also satisfies RegisterDto, and the same value smoke-test.sh already uses.
const STAFF_PASSWORD = 'pass123';

type SeedClinic = {
  name: string;
  address: string;
  phone: string;
  description: string;
  clinicType: ClinicType;
  googleMapsLink: string;
  staff: { email: string; firstName: string; lastName: string };
};

const clinics: SeedClinic[] = [
  {
    name: 'โรงพยาบาลสัตว์รักษ์เพื่อน',
    address: '123 ถ.สุขุมวิท กรุงเทพฯ 10110',
    phone: '02-111-1111',
    description: 'โรงพยาบาลสัตว์ทั่วไป เปิดบริการทุกวัน',
    clinicType: 'GENERAL',
    googleMapsLink: 'https://maps.google.com/?q=13.7367,100.5601',
    staff: { email: 'vet1@test.com', firstName: 'สมชาย', lastName: 'รักษ์เพื่อน' },
  },
  {
    name: 'คลินิกสัตว์เลี้ยงพิเศษ Exotic Care',
    address: '45 ถ.พหลโยธิน กรุงเทพฯ 10400',
    phone: '02-222-2222',
    description: 'เชี่ยวชาญสัตว์เลี้ยงพิเศษ นก กระต่าย สัตว์เลื้อยคลาน',
    clinicType: 'EXOTIC',
    googleMapsLink: 'https://maps.google.com/?q=13.7649,100.5383',
    staff: { email: 'vet2@test.com', firstName: 'ปิยะ', lastName: 'เอ็กโซติก' },
  },
  {
    name: 'ศูนย์ฉุกเฉินสัตว์ 24 ชม. PetER',
    address: '9 ถ.รัชดาภิเษก กรุงเทพฯ 10310',
    phone: '02-333-3333',
    description: 'บริการฉุกเฉินตลอด 24 ชั่วโมง',
    clinicType: 'EMERGENCY_24HR',
    googleMapsLink: 'https://maps.google.com/?q=13.7997,100.5726',
    staff: { email: 'vet3@test.com', firstName: 'ธนกร', lastName: 'ฉุกเฉิน' },
  },
  {
    name: 'โรงพยาบาลสัตว์เชียงใหม่',
    address: '77 ถ.นิมมานเหมินท์ เชียงใหม่ 50200',
    phone: '053-444-444',
    description: 'โรงพยาบาลสัตว์ทั่วไป ภาคเหนือ',
    clinicType: 'GENERAL',
    googleMapsLink: 'https://maps.google.com/?q=18.7967,98.9670',
    staff: { email: 'vet4@test.com', firstName: 'อารีย์', lastName: 'เชียงใหม่' },
  },
  {
    name: 'คลินิกรักษาสัตว์บ้านหมอหมา',
    address: '210 ถ.เพชรเกษม กรุงเทพฯ 10160',
    phone: '02-555-5555',
    description: 'คลินิกใกล้บ้าน ราคาเป็นมิตร',
    clinicType: 'GENERAL',
    googleMapsLink: 'https://maps.google.com/?q=13.7108,100.4090',
    staff: { email: 'vet5@test.com', firstName: 'นภา', lastName: 'บ้านหมอหมา' },
  },
  {
    name: 'Exotic Vet Studio ภูเก็ต',
    address: '5 ถ.เทพกระษัตรี ภูเก็ต 83000',
    phone: '076-666-666',
    description: 'ดูแลสัตว์เลี้ยงพิเศษ ภาคใต้',
    clinicType: 'EXOTIC',
    googleMapsLink: 'https://maps.google.com/?q=7.8804,98.3923',
    staff: { email: 'vet6@test.com', firstName: 'กิตติ', lastName: 'ภูเก็ต' },
  },
];

async function main() {
  console.log('Seeding clinics and their staff accounts...\n');

  const password = await bcrypt.hash(STAFF_PASSWORD, SALT_ROUNDS);
  const summary: string[] = [];

  for (const { staff, ...clinicData } of clinics) {
    // Idempotent on both halves: re-running must not duplicate a clinic, and
    // must not reset a password the user has since changed.
    let clinic = await prisma.clinic.findFirst({
      where: { name: clinicData.name },
    });

    if (clinic) {
      console.log(`  clinic exists   ${clinicData.name}`);
    } else {
      clinic = await prisma.clinic.create({ data: clinicData });
      console.log(`  clinic created  ${clinicData.name}`);
    }

    const existingStaff = await prisma.user.findUnique({
      where: { email: staff.email },
    });

    if (existingStaff) {
      console.log(`    staff exists  ${staff.email}`);
    } else {
      await prisma.user.create({
        data: {
          firstName: staff.firstName,
          lastName: staff.lastName,
          email: staff.email,
          password,
          role: Role.CLINIC_STAFF,
          clinicId: clinic.id,
        },
      });
      console.log(`    staff created ${staff.email}`);
    }

    summary.push(`  ${staff.email.padEnd(16)} ${clinicData.name}`);
  }

  console.log(`\nClinic staff logins — password: ${STAFF_PASSWORD}`);
  console.log(summary.join('\n'));
  console.log('\nDone.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
