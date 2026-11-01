// ISO 週（例：2026-W44）。日本時間で数える

export function isoWeekId(date: Date): string {
  const jst = new Date(date.getTime() + 9 * 3600 * 1000)
  const d = new Date(Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth(), jst.getUTCDate()))
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - day)
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1)
  const week = Math.ceil(((d.getTime() - yearStart) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

export function parseWeekId(id: string): { year: number; week: number } {
  const m = /^(\d{4})-W(\d{2})$/.exec(id)
  if (!m || Number(m[2]) < 1 || Number(m[2]) > 53) throw new Error(`週の形式が違う（例：2026-W44）: ${id}`)
  return { year: Number(m[1]), week: Number(m[2]) }
}
