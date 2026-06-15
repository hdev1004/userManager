import sharp from 'sharp'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const publicDir = new URL('../public/', import.meta.url)
const out = (name) => fileURLToPath(new URL(name, publicDir))

const standardSvg = readFileSync(out('favicon.svg'))

const maskableSvg = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <rect width="100" height="100" fill="#3182F6"/>
    <g fill="none" stroke="#ffffff" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"
       transform="translate(50 50) scale(0.7) translate(-50 -50)">
      <circle cx="28" cy="30" r="9"/>
      <circle cx="28" cy="70" r="9"/>
      <line x1="37" y1="35" x2="80" y2="78"/>
      <line x1="80" y1="22" x2="37" y2="65"/>
    </g>
  </svg>`,
)

async function gen(svg, size, name) {
  await sharp(svg, { density: 600 }).resize(size, size).png().toFile(out(name))
  console.log(`OK ${name} (${size}x${size})`)
}

await gen(standardSvg, 180, 'apple-touch-icon.png')
await gen(standardSvg, 192, 'icon-192.png')
await gen(standardSvg, 512, 'icon-512.png')
await gen(maskableSvg, 512, 'icon-512-maskable.png')
