import chalk from 'chalk'

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
const log   = console.log

async function step(label: string, detail = '', delay = 600) {
  log(chalk.cyan('  →') + ' ' + chalk.white(label))
  if (detail) log(chalk.gray('    ' + detail))
  await sleep(delay)
}

async function section(title: string) {
  log()
  log(chalk.bgBlue.bold(` ${title} `))
  await sleep(200)
}

async function ok(msg: string) {
  log(chalk.green('  ✓ ') + chalk.greenBright(msg))
  await sleep(300)
}

async function warn(msg: string) {
  log(chalk.yellow('  ⚠ ') + chalk.yellowBright(msg))
  await sleep(300)
}

async function err(msg: string) {
  log(chalk.red('  ✗ ') + chalk.redBright(msg))
  await sleep(300)
}

async function main() {
  log()
  log(chalk.bgMagenta.bold(' WHSM System — Workflow Simulation '))
  log(chalk.gray(' สาธิตการทำงานของระบบทุก module '))
  await sleep(500)

  // ─── Phase 1: Login ───
  await section('Phase 1 — Employee Authentication')
  await step('WH-001 scan บัตรพนักงาน')
  await ok('Login สำเร็จ: พนักงานคลัง (WAREHOUSE)')
  await step('QA-001 scan บัตรพนักงาน')
  await ok('Login สำเร็จ: พนักงาน QA (QA)')

  // ─── Phase 2: รับวัตถุดิบ (RO) ───
  await section('Phase 2 — Inventory: รับวัตถุดิบเข้า (RO)')
  await step('Scan barcode วัตถุดิบ', 'RM-PORK-01 เนื้อหมู')
  await step('ชั่งน้ำหนัก', '500.000 kg (หลังหัก Tare)')
  await step('ออก RO Document', 'RO-20260921-001')
  await step('บันทึก Lot Number', '21092026/001 | Location: WHC')
  await step('สถานะ: รอ QA อนุมัติ', 'Wait QA-RO...')
  await step('QA ตรวจสอบและอนุมัติ')
  await ok('Stock ขึ้นทันที: LOT 21092026/001 | 500 kg | WHC')
  await step('Print Barcode Label', 'ส่ง ZPL ไปที่เครื่อง print')
  await ok('Barcode พิมพ์สำเร็จ')

  // ─── Phase 3: เบิกวัตถุดิบ FIFO ───
  await section('Phase 3 — Inventory: เบิกวัตถุดิบ FIFO (RM)')
  await step('ต้องการ RM-PORK-01 จำนวน 300 kg')
  await step('ระบบเลือก Lot อัตโนมัติ (FEFO/FIFO)', '→ 21092026/001 | Expiry: 30/09/2026')
  await step('Stock ลดลง', '500 → 200 kg')
  await ok('RM-20260921-001 สร้างสำเร็จ')

  // ─── Phase 4: Production ───
  await section('Phase 4 — Production: 4 Stages')
  await step('สร้าง Batch ใหม่', 'BATCH-20260921-001 | หมูปิ้งนมสด')

  log()
  log(chalk.bold('  Stage 1: เตรียมและชั่งวัตถุดิบ'))
  await step('  Scan barcode ถุงวัตถุดิบ', 'LOT 21092026/001')
  await step('  Scale: 300.000 kg', 'เปรียบเทียบกับสูตร ✓ ตรง')
  await step('  Print barcode ถุง', 'แปะข้างถุงเรียบร้อย')
  await ok('  Stage 1 เสร็จสิ้น')

  log()
  log(chalk.bold('  Stage 2: การหมัก (Marinating)'))
  await step('  Scan บัตรผู้หมัก', 'PROD-001')
  await step('  บันทึก Batch + ซอส', 'Teriyaki Premium-B')
  await step('  Timer: 24 ชั่วโมง', 'เริ่ม: 21/09/2026 08:00')
  await ok('  Stage 2 บันทึกสำเร็จ — รอครบเวลา')

  log()
  log(chalk.bold('  Stage 3: เสียบไม้ (Skewer)'))
  await step('  Scan บัตรสินค้า + พนักงาน')
  await step('  ชั่งน้ำหนัก', 'ของดี: 280 kg | ของเสีย: 5 kg')
  await step('  ตัดยอดของเสียออกจาก Stock อัตโนมัติ')
  await ok('  Stage 3 เสร็จสิ้น')

  log()
  log(chalk.bold('  Stage 4: บรรจุสินค้า (Packing)'))
  await step('  เลือกโหมด', 'BLAST (แช่แข็งเร็ว)')
  await step('  ชั่งน้ำหนัก', '275 kg | WIP: 5 kg')
  await step('  บันทึก Lot บรรจุ + วันที่')
  await step('  Print barcode ถุงสินค้า')
  await ok('  Stage 4 เสร็จสิ้น — FG เข้า Stock: 275 kg')

  // ─── Phase 5: QA Hold ───
  await section('Phase 5 — QA: กักกันสินค้า (Hold)')
  await step('QA พบปัญหาที่ LOT 21092026/001')
  await step('ออก Deviation Report', 'DEV-20260921-001')
  await step('ERP ล็อค Lot ทันที', 'Status: HOLD')
  await warn('ห้ามจ่ายสินค้า Lot นี้จนกว่า QA จะปลดล็อค')
  await step('WH พยายาม scan จ่ายสินค้า Lot นี้')
  await err('ปฏิเสธ — Lot ถูกกักกัน (HOLD) ไม่สามารถจ่ายได้')
  await step('QA ตรวจสอบและอนุมัติปลดล็อค')
  await ok('Lot 21092026/001 ปลดล็อคแล้ว — กลับสู่ AVAILABLE')

  // ─── Phase 6: Sale Order ───
  await section('Phase 6 — Order: Sale Order')
  await step('Sales สร้าง SO', 'SO-2026-0921 | ลูกค้า: ABC Market')
  await step('WH ตรวจ Stock พบว่าพร้อม')
  await step('WH Confirm (CF)')
  await step('รอชำระเงิน...')
  await step('ชำระเงินเรียบร้อย')
  await step('ออก Invoice + Packing List')
  await step('WH Scan barcode ตัดจ่าย', 'FIFO: LOT 21092026/001 | 100 kg')
  await ok('จัดส่งเรียบร้อย — Stock: 175 kg')

  // ─── Phase 7: Traceability ───
  await section('Phase 7 — Traceability: สอบกลับ')
  await step('ค้นหาจาก LOT: 21092026/001')
  log()
  log(chalk.bold('  Timeline:'))
  log(chalk.gray('  08:00  ') + 'RO รับวัตถุดิบเข้า 500 kg (WH-001)')
  log(chalk.gray('  09:00  ') + 'RM เบิกไป Production 300 kg (PROD-001)')
  log(chalk.gray('  09:30  ') + 'STAGE1 เตรียมชั่ง 300 kg (PROD-001)')
  log(chalk.gray('  10:00  ') + 'STAGE2 หมัก Teriyaki Premium-B (PROD-001)')
  log(chalk.gray('  10:30  ') + 'STAGE3 เสียบไม้ ดี 280 / เสีย 5 kg')
  log(chalk.gray('  11:00  ') + 'STAGE4 บรรจุ BLAST 275 kg')
  log(chalk.gray('  11:30  ') + 'HOLD โดย QA-001 | DEV-001')
  log(chalk.gray('  12:00  ') + 'RELEASE โดย QA-001')
  log(chalk.gray('  13:00  ') + 'SO-2026-0921 จ่าย 100 kg ให้ ABC Market')
  await ok('Traceability ครบทุกขั้นตอน')

  log()
  log(chalk.bgGreen.bold(' ✓ Simulation เสร็จสิ้น — ทุก Module ทำงานถูกต้อง '))
  log()
}

main().catch(console.error)
