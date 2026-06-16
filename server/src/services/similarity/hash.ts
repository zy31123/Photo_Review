// 图像哈希 + 颜色直方图 + 距离度量
// 依赖 sharp 做图像 I/O，算法部分可独立测试

import sharp from 'sharp'

// --- dHash (感知哈希) ---

export async function computeDHash(imagePath: string): Promise<{ hash: string; width: number; height: number; fileSize: number }> {
  // metadata 仅读文件头（~1ms），获取原始尺寸和文件大小，省去 fs.stat 调用
  const metadata = await sharp(imagePath, { failOn: 'none' }).metadata()
  const { data, info } = await sharp(imagePath, { failOn: 'none' })
    .resize(9, 8, { fit: 'cover' })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true })

  // dHash: compare adjacent horizontal pixels in each row
  // 9 columns, 8 rows → 8 comparisons per row → 64 bits
  let hash = BigInt(0)
  let bit = BigInt(0)
  for (let row = 0; row < info.height; row++) {
    for (let col = 0; col < info.width - 1; col++) {
      const left = data[row * info.width + col]
      const right = data[row * info.width + col + 1]
      if (left > right) {
        hash |= BigInt(1) << bit
      }
      bit++
    }
  }

  return {
    hash: hash.toString(16).padStart(16, '0'),
    width: metadata.width ?? 0,
    height: metadata.height ?? 0,
    fileSize: metadata.size ?? 0,
  }
}

// --- 颜色直方图 ---

const HIST_BINS = 16
const HIST_CHANNELS = 3 // RGB
const HIST_SIZE = HIST_BINS * HIST_CHANNELS // 48 values

export async function computeColorHistogram(imagePath: string): Promise<string> {
  const { data, info } = await sharp(imagePath, { failOn: 'none' })
    .resize(64, 64, { fit: 'cover' })
    .raw()
    .toBuffer({ resolveWithObject: true })

  const bins = new Float32Array(HIST_SIZE)
  const pixelCount = info.width * info.height

  for (let i = 0; i < pixelCount; i++) {
    const r = data[i * 3]
    const g = data[i * 3 + 1]
    const b = data[i * 3 + 2]
    bins[Math.floor(r / (256 / HIST_BINS))] += 1
    bins[HIST_BINS + Math.floor(g / (256 / HIST_BINS))] += 1
    bins[HIST_BINS * 2 + Math.floor(b / (256 / HIST_BINS))] += 1
  }

  // Normalize per channel
  for (let c = 0; c < HIST_CHANNELS; c++) {
    let sum = 0
    for (let i = 0; i < HIST_BINS; i++) sum += bins[c * HIST_BINS + i]
    if (sum > 0) {
      for (let i = 0; i < HIST_BINS; i++) bins[c * HIST_BINS + i] /= sum
    }
  }

  // Compact: quantize to 0–255 range for compact storage
  const quantized = new Uint8Array(HIST_SIZE)
  for (let i = 0; i < HIST_SIZE; i++) {
    quantized[i] = Math.round(bins[i] * 255)
  }

  return Buffer.from(quantized).toString('base64')
}

export function histogramSimilarity(a: string, b: string): number {
  const binsA = new Float32Array(HIST_SIZE)
  const binsB = new Float32Array(HIST_SIZE)
  const bufA = Buffer.from(a, 'base64')
  const bufB = Buffer.from(b, 'base64')
  for (let i = 0; i < HIST_SIZE; i++) {
    binsA[i] = bufA[i] / 255
    binsB[i] = bufB[i] / 255
  }

  // Histogram intersection (sum of min values, already normalized)
  let intersection = 0
  for (let i = 0; i < HIST_SIZE; i++) {
    intersection += Math.min(binsA[i], binsB[i])
  }
  return intersection / HIST_CHANNELS // 0–1 per channel average
}

// --- 汉明距离 ---

export function hammingDistance(a: string, b: string): number {
  const bigA = BigInt('0x' + a)
  const bigB = BigInt('0x' + b)
  let xor = bigA ^ bigB
  let count = 0
  while (xor) {
    count += Number(xor & BigInt(1))
    xor >>= BigInt(1)
  }
  return count
}
