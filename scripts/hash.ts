import bcrypt from "bcrypt"

async function run() {
  const pwd = process.argv[2]
  if (!pwd) throw new Error("Usage: ts-node scripts/hash.ts <password>")
  const hash = await bcrypt.hash(pwd, 10)
  console.log(hash)
}

run()
