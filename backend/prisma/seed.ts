import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/database/generated/prisma/client';
import { ClinicType, Role } from '../src/database/generated/prisma/enums';
import { PG_SESSION_OPTIONS } from '../src/database/pg-options';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

// D46: same UTC session as PrismaService.
const adapter = new PrismaPg({ connectionString, options: PG_SESSION_OPTIONS });
const prisma = new PrismaClient({ adapter });

// Matches BcryptService, so a seeded account and a registered one look
// identical to the login flow.
const SALT_ROUNDS = 12;

// Shared by every seeded staff account; the same value smoke-test.sh uses.
// Shorter than the D63 rule for new passwords (8+), which is fine: seed
// writes the hash directly and login only checks that a password was sent.
const STAFF_PASSWORD = 'pass123';

type SeedClinic = {
  name: string;
  address: string;
  phone: string;
  description: string;
  clinicType: ClinicType;
  googleMapsLink: string;
  photoUrl: string;
  staff: { email: string; firstName: string; lastName: string };
};

// US-08 / D66: demo clinic photos, hot-linked from Unsplash (free to use
// under the Unsplash License). Staff can replace them from Clinic Profile.
const unsplash = (photoId: string) =>
  `https://images.unsplash.com/${photoId}?w=1600&q=80&fm=jpg&fit=crop`;

const clinics: SeedClinic[] = [
  {
    name: 'โรงพยาบาลสัตว์รักษ์เพื่อน',
    address: '123 ถ.สุขุมวิท กรุงเทพฯ 10110',
    phone: '02-111-1111',
    description: 'โรงพยาบาลสัตว์ทั่วไป เปิดบริการทุกวัน',
    clinicType: 'GENERAL',
    googleMapsLink: 'https://maps.google.com/?q=13.7367,100.5601',
    photoUrl: unsplash('photo-1700665537604-412e89a285c3'),
    staff: {
      email: 'vet1@test.com',
      firstName: 'สมชาย',
      lastName: 'รักษ์เพื่อน',
    },
  },
  {
    name: 'คลินิกสัตว์เลี้ยงพิเศษ Exotic Care',
    address: '45 ถ.พหลโยธิน กรุงเทพฯ 10400',
    phone: '02-222-2222',
    description: 'เชี่ยวชาญสัตว์เลี้ยงพิเศษ นก กระต่าย สัตว์เลื้อยคลาน',
    clinicType: 'EXOTIC',
    googleMapsLink: 'https://maps.google.com/?q=13.7649,100.5383',
    photoUrl: unsplash('photo-1692314896200-dad04cbd1dd5'),
    staff: { email: 'vet2@test.com', firstName: 'ปิยะ', lastName: 'เอ็กโซติก' },
  },
  {
    name: 'ศูนย์ฉุกเฉินสัตว์ 24 ชม. PetER',
    address: '9 ถ.รัชดาภิเษก กรุงเทพฯ 10310',
    phone: '02-333-3333',
    description: 'บริการฉุกเฉินตลอด 24 ชั่วโมง',
    clinicType: 'EMERGENCY_24HR',
    googleMapsLink: 'https://maps.google.com/?q=13.7997,100.5726',
    photoUrl: unsplash('photo-1788044908314-6a11871f9de4'),
    staff: { email: 'vet3@test.com', firstName: 'ธนกร', lastName: 'ฉุกเฉิน' },
  },
  {
    name: 'โรงพยาบาลสัตว์เชียงใหม่',
    address: '77 ถ.นิมมานเหมินท์ เชียงใหม่ 50200',
    phone: '053-444-444',
    description: 'โรงพยาบาลสัตว์ทั่วไป ภาคเหนือ',
    clinicType: 'GENERAL',
    googleMapsLink: 'https://maps.google.com/?q=18.7967,98.9670',
    photoUrl: unsplash('photo-1551076805-e1869033e561'),
    staff: {
      email: 'vet4@test.com',
      firstName: 'อารีย์',
      lastName: 'เชียงใหม่',
    },
  },
  {
    name: 'คลินิกรักษาสัตว์บ้านหมอหมา',
    address: '210 ถ.เพชรเกษม กรุงเทพฯ 10160',
    phone: '02-555-5555',
    description: 'คลินิกใกล้บ้าน ราคาเป็นมิตร',
    clinicType: 'GENERAL',
    googleMapsLink: 'https://maps.google.com/?q=13.7108,100.4090',
    photoUrl: unsplash('photo-1728013274420-ed02b1f58887'),
    staff: { email: 'vet5@test.com', firstName: 'นภา', lastName: 'บ้านหมอหมา' },
  },
  {
    name: 'Exotic Vet Studio ภูเก็ต',
    address: '5 ถ.เทพกระษัตรี ภูเก็ต 83000',
    phone: '076-666-666',
    description: 'ดูแลสัตว์เลี้ยงพิเศษ ภาคใต้',
    clinicType: 'EXOTIC',
    googleMapsLink: 'https://maps.google.com/?q=7.8804,98.3923',
    photoUrl: unsplash('photo-1602415724447-52c8e77cb7c1'),
    staff: { email: 'vet6@test.com', firstName: 'กิตติ', lastName: 'ภูเก็ต' },
  },
];

async function main() {
  console.log('Seeding clinics and their staff accounts...\n');

  const password = await bcrypt.hash(STAFF_PASSWORD, SALT_ROUNDS);
  const summary: string[] = [];

  for (const { staff, name: baseName, ...rest } of clinics) {
    // D67: the shown name starts with the login it belongs to, e.g.
    // "(vet1) โรงพยาบาลสัตว์รักษ์เพื่อน", so demo visitors can tell which
    // account runs which clinic.
    const clinicData = {
      ...rest,
      name: `(${staff.email.split('@')[0]}) ${baseName}`,
    };

    // Idempotent on both halves: re-running must not duplicate a clinic, and
    // must not reset a password the user has since changed. Find the clinic
    // through its staff account first, so a renamed clinic is still found.
    const existingStaff = await prisma.user.findUnique({
      where: { email: staff.email },
    });
    let clinic = existingStaff?.clinicId
      ? await prisma.clinic.findUnique({
          where: { id: existingStaff.clinicId },
        })
      : await prisma.clinic.findFirst({
          where: { name: { in: [clinicData.name, baseName] } },
        });

    if (clinic) {
      console.log(`  clinic exists   ${clinicData.name}`);
      // D67: rename once from the old seed name; a name changed by staff
      // is left alone.
      if (clinic.name === baseName) {
        clinic = await prisma.clinic.update({
          where: { id: clinic.id },
          data: { name: clinicData.name },
        });
        console.log(`    renamed       ${baseName} -> ${clinicData.name}`);
      }
      // D66: give an existing clinic its demo photo only if it has none, so
      // a photo uploaded by staff is never overwritten on the next deploy.
      const { count } = await prisma.clinic.updateMany({
        where: { id: clinic.id, photoUrl: null },
        data: { photoUrl: clinicData.photoUrl },
      });
      if (count) console.log(`    photo added   ${clinicData.name}`);
    } else {
      clinic = await prisma.clinic.create({ data: clinicData });
      console.log(`  clinic created  ${clinicData.name}`);
    }

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
