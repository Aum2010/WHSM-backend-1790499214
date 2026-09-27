import { PrismaClient, UserRole } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // ── Users ──
  const users = [
    { cardId: 'ADMIN-001',  name: 'ผู้ดูแลระบบ',         role: UserRole.ADMIN },
    { cardId: 'WH-001',     name: 'พนักงานคลัง',          role: UserRole.WAREHOUSE },
    { cardId: 'PROD-001',   name: 'พนักงานผลิต',          role: UserRole.PRODUCTION },
    { cardId: 'QA-001',     name: 'พนักงาน QA',           role: UserRole.QA },
    { cardId: 'SALES-001',  name: 'พนักงานขาย',           role: UserRole.SALES },
    { cardId: 'PLAN-001',   name: 'พนักงานวางแผน',        role: UserRole.PLANNING },
    { cardId: 'ACC-001',    name: 'พนักงานบัญชี',         role: UserRole.ACCOUNTING },
  ]

  const hash = await bcrypt.hash('password123', 10)
  for (const u of users) {
    await prisma.user.upsert({
      where:  { cardId: u.cardId },
      update: {},
      create: { ...u, passwordHash: hash, department: u.role },
    })
  }
  console.log(`✅ Users: ${users.length} created`)

  // ── System Hold ──
  await prisma.systemHold.upsert({
    where:  { id: 'singleton' },
    update: {},
    create: { id: 'singleton', isActive: false },
  })
  console.log('✅ SystemHold initialized')

  // ── Sample Stock RM ──
  const stocks = [
    { rmNo: 'RM-20260927-0001', materialCode: 'RM-PORK-01',  materialName: 'เนื้อหมู',              quantity: 500, unit: 'kg', location: 'Zone-RM-01' },
    { rmNo: 'RM-20260927-0002', materialCode: 'RM-SAUCE-01', materialName: 'ชุดซอสหมักสำเร็จรูป',    quantity: 100, unit: 'kg', location: 'Zone-RM-01' },
    { rmNo: 'RM-20260927-0003', materialCode: 'RM-FAT-01',   materialName: 'มันหมูแข็งบด',           quantity: 200, unit: 'kg', location: 'Zone-RM-01' },
    { rmNo: 'RM-20260927-0004', materialCode: 'RM-CHEM-01',  materialName: 'Sodium metabisulphite',  quantity: 10,  unit: 'kg', location: 'Zone-RM-01' },
  ]

  for (const s of stocks) {
    await prisma.stockLot.upsert({
      where:  { rmNo: s.rmNo },
      update: {},
      create: { ...s, remainingQty: s.quantity, status: 'AVAILABLE' },
    })
  }
  console.log(`✅ Stock RM: ${stocks.length} created`)

  // ── Sample Recipe ──
  await prisma.recipe.upsert({
    where:  { productCode: 'PROD-001' },
    update: {},
    create: {
      productCode: 'PROD-001',
      productName: 'หมูปิ้งนมสด',
      description: 'สูตรมาตรฐาน',
      yieldQty:    400,
      yieldUnit:   'kg',
      items: {
        create: [
          { materialCode: 'RM-PORK-01',  materialName: 'เนื้อหมู',              quantity: 320, unit: 'kg' },
          { materialCode: 'RM-FAT-01',   materialName: 'มันหมูแข็งบด',           quantity: 80,  unit: 'kg' },
          { materialCode: 'RM-SAUCE-01', materialName: 'ชุดซอสหมักสำเร็จรูป',    quantity: 25,  unit: 'kg' },
          { materialCode: 'RM-CHEM-01',  materialName: 'Sodium metabisulphite',  quantity: 0.2, unit: 'kg' },
        ],
      },
    },
  })
  console.log('✅ Recipe: หมูปิ้งนมสด created')

  console.log('\n🎉 Seed complete!')
  console.log('\n📋 Test accounts (password: password123):')
  users.forEach(u => console.log(`  ${u.role.padEnd(12)} → cardId: ${u.cardId}`))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())