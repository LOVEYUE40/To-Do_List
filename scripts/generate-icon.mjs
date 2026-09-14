/**
 * 一次性脚本：生成 build/icon.ico（electron-builder 打包用的应用图标）。
 * 复用 src/main/assets.ts 的绘制逻辑（去掉了 Electron 依赖），
 * 输出 PNG 压缩条目的 ICO（16-256px）。运行：node scripts/generate-icon.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateSync } from 'node:zlib'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ACCENT = '#7C5CFF'

/* ---------------- PNG 编码 ---------------- */

let crcTable = null
function getCrcTable() {
  if (crcTable) return crcTable
  const table = []
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[n] = c >>> 0
  }
  crcTable = table
  return table
}

function crc32(buf) {
  const table = getCrcTable()
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i += 1) {
    c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  }
  return (c ^ 0xffffffff) >>> 0
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crcBuf])
}

function encodePng(width, height, rgba) {
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0))
  ])
}

/* ---------------- 图形绘制（与 assets.ts 一致） ---------------- */

function hexToRgb(hex) {
  const matched = /^#?([0-9a-f]{6})$/i.exec((hex || '').trim())
  if (!matched) return [124, 92, 255]
  const value = parseInt(matched[1], 16)
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}

function insideRoundedRect(px, py, x, y, w, h, r) {
  if (px < x || py < y || px > x + w || py > y + h) return false
  const nx = Math.min(Math.max(px, x + r), x + w - r)
  const ny = Math.min(Math.max(py, y + r), y + h - r)
  const dx = px - nx
  const dy = py - ny
  return dx * dx + dy * dy <= r * r
}

function segmentDistance(px, py, ax, ay, bx, by) {
  const vx = bx - ax
  const vy = by - ay
  const wx = px - ax
  const wy = py - ay
  const len = vx * vx + vy * vy
  const t = len === 0 ? 0 : Math.min(1, Math.max(0, (wx * vx + wy * vy) / len))
  const cx = ax + t * vx
  const cy = ay + t * vy
  const dx = px - cx
  const dy = py - cy
  return Math.sqrt(dx * dx + dy * dy)
}

function createIconPng(size, accentHex) {
  const [r, g, b] = hexToRgb(accentHex)
  const rgba = Buffer.alloc(size * size * 4)
  const pad = size * 0.055
  const radius = size * 0.27
  const halfStroke = Math.max(size * 0.048, 0.9)
  const check = [
    [size * 0.285, size * 0.53],
    [size * 0.435, size * 0.685],
    [size * 0.735, size * 0.325]
  ]
  const samples = 3
  const total = samples * samples

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let bodyHits = 0
      let checkHits = 0
      for (let sy = 0; sy < samples; sy += 1) {
        for (let sx = 0; sx < samples; sx += 1) {
          const px = x + (sx + 0.5) / samples
          const py = y + (sy + 0.5) / samples
          if (insideRoundedRect(px, py, pad, pad, size - pad * 2, size - pad * 2, radius)) {
            bodyHits += 1
          }
          const d = Math.min(
            segmentDistance(px, py, check[0][0], check[0][1], check[1][0], check[1][1]),
            segmentDistance(px, py, check[1][0], check[1][1], check[2][0], check[2][1])
          )
          if (d <= halfStroke) checkHits += 1
        }
      }
      const bodyAlpha = bodyHits / total
      const checkAlpha = Math.min(1, checkHits / total) * bodyAlpha
      const idx = (y * size + x) * 4
      rgba[idx] = Math.round(r * (1 - checkAlpha) + 255 * checkAlpha)
      rgba[idx + 1] = Math.round(g * (1 - checkAlpha) + 255 * checkAlpha)
      rgba[idx + 2] = Math.round(b * (1 - checkAlpha) + 255 * checkAlpha)
      rgba[idx + 3] = Math.round(bodyAlpha * 255)
    }
  }

  return encodePng(size, size, rgba)
}

/* ---------------- ICO 打包 ---------------- */

const SIZES = [16, 24, 32, 48, 64, 128, 256]
const pngs = SIZES.map((size) => createIconPng(size, ACCENT))

const header = Buffer.alloc(6)
header.writeUInt16LE(0, 0) // reserved
header.writeUInt16LE(1, 2) // type: icon
header.writeUInt16LE(SIZES.length, 4)

const entries = []
let offset = 6 + SIZES.length * 16
for (let i = 0; i < SIZES.length; i += 1) {
  const size = SIZES[i]
  const entry = Buffer.alloc(16)
  entry.writeUInt8(size === 256 ? 0 : size, 0) // width
  entry.writeUInt8(size === 256 ? 0 : size, 1) // height
  entry.writeUInt8(0, 2) // palette
  entry.writeUInt8(0, 3) // reserved
  entry.writeUInt16LE(1, 4) // color planes
  entry.writeUInt16LE(32, 6) // bits per pixel
  entry.writeUInt32LE(pngs[i].length, 8)
  entry.writeUInt32LE(offset, 12)
  offset += pngs[i].length
  entries.push(entry)
}

const ico = Buffer.concat([header, ...entries, ...pngs])
const outPath = resolve(__dirname, '../build/icon.ico')
mkdirSync(dirname(outPath), { recursive: true })
writeFileSync(outPath, ico)
console.log(`[icon] 已生成 ${outPath}（${SIZES.join('/')}px，共 ${(ico.length / 1024).toFixed(1)} KB）`)
