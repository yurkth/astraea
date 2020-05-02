const PI2 = Math.PI * 2

function mod(a, b) { return (a % b + b) % b }

function init(arg, def) { return arg === undefined ? def : arg }

function setPalette() {
  p8Pal = {
    black: color(0, 0, 0),
    darkBlue: color(29, 43, 83),
    darkPurple: color(126, 37, 83),
    darkGreen: color(0, 135, 81),
    brown: color(171, 82, 54),
    darkGray: color(95, 87, 79),
    lightGray: color(194, 195, 199),
    white: color(255, 241, 232),
    red: color(255, 0, 77),
    orange: color(255, 163, 0),
    yellow: color(255, 236, 39),
    green: color(0, 228, 54),
    blue: color(41, 173, 255),
    indigo: color(131, 118, 156),
    pink: color(255, 119, 168),
    peach: color(255, 204, 170)
  }
}

function pSet(x, y, c) {
  if (alpha(c) === 0) { return }
  set(x, y, c)
}

function textb(str, x, y, border = p8Pal.white, body = p8Pal.black) {
  fill(border)
  text(str, x - 1, y)
  text(str, x + 1, y)
  text(str, x, y - 1)
  text(str, x, y + 1)
  fill(body)
  text(str, x, y)
}

function weightedChoice(array, weight, value = rng.random()) {
  const totalWeight = weight.reduce((sum, val) => sum += val, 0)
  let threshold = value * totalWeight
  for (let i = 0; i < array.length; i++) {
    if (threshold <= weight[i]) {
      return array[i]
    }
    threshold -= weight[i]
  }
}

class Grid {
  constructor(width, height, init) {
    this.width = width
    this.height = height
    this.table = new Array(this.width * this.height).fill(init)
  }

  set(x, y, val) {
    if (x < 0 || this.width <= x) {
      throw new RangeError(`The argument must be between x ${0} and ${this.width - 1}.`)
    } else if (y < 0 || this.height <= y) {
      throw new RangeError(`The argument must be between y ${0} and ${this.height - 1}.`)
    } else {
      this.table[y * this.width + x] = val
    }
  }

  get(x, y) {
    if (x < 0 || this.width <= x) {
      x = mod(x, this.width)
    }
    if (y < 0 || this.height <= y) {
      y = mod(y, this.height)
    }
    return this.table[y * this.width + x]
  }
}

class Random {
  constructor(seed) {
    this.seed = init(seed, Math.random())
    this.rng = new alea(this.seed)
  }

  random() { return this.rng() } // [0, 1)

  randint(min, max) { return Math.floor(this.random() * (max - min)) + min } // [min, max)
}

class NoiseGenerator {
  constructor(seed) {
    this.seed = init(seed, Math.random())
    this.simplex = new SimplexNoise(new alea(this.seed))
  }

  _noise3D(x, y, z, noiseScale = 1) { return this.simplex.noise3D(x * noiseScale, y * noiseScale, z * noiseScale) * 0.5 + 0.5 } // [0, 1]

  _ridged(x, y, z, noiseScale = 1) { return Math.abs(this.simplex.noise3D(x * noiseScale, y * noiseScale, z * noiseScale)) } // [0, 1]

  _fbm(func, x, y, z, octaves = 6) {
    let result = 0
    let denom = 0
    for (let o = 0; o < octaves; o++) {
      const ampl = Math.pow(0.5, o)
      result += ampl * func(x, y, z, Math.pow(2, o))
      denom += ampl
    }
    return result / denom
  }

  simplexFbm(x, y, z, octaves = 6) {
    return this._fbm(this._noise3D.bind(this), x, y, z, octaves)
  }

  ridgedFbm(x, y, z, octaves = 6) {
    return 1 - this._fbm(this._ridged.bind(this), x, y, z, octaves)
  }

  domainWarping(x, y, z, octaves = 6) {
    const n = this._noise3D(x, y, z)
    return this.simplexFbm(x + n, y + n, z + n, octaves)
  }
}

const rng = new Random(0)
console.log(`seed: ${rng.seed}`)

class PixelSphere {
  constructor(diameter) {
    this.diameter = diameter
    this.sphereWidth = []
    this._setSphereWidth()
  }

  get _sphereWidth() {
    return this.sphereWidth
  }

  _setSphereWidth() {
    // Reference: https://github.com/nesbox/TIC-80/blob/master/src/tic.c#L948-L961
    const parity = 1 - this.diameter % 2
    let r = Math.floor(this.diameter / 2) - parity
    let y = -r
    let x = 0
    let d = 2 - 2 * r
    const i = r

    do {
      r = d
      if (r > y || d > x) {
        const w = x * 2 + 1 + parity
        this.sphereWidth[y + i] = w
        this.sphereWidth[this.diameter - y - i - 1] = w
        d += ++y * 2 + 1
      }
      if (r <= x) {
        d += ++x * 2 + 1
      }
    } while (y <= 0)
  }
}

class Planet extends PixelSphere {
  constructor(options) {
    super(options.diameter)
    this.noiseMode = options.noiseMode
    this.palette = options.palette
    this.lapTime = init(options.lapTime, 1) // sec
    this.planeOffset = init(options.planeOffset, [0, 0]) // 基準点: 右上
    this.sphereOffset = init(options.sphereOffset, [0, 0]) // 基準点: 中心

    this.noise = new NoiseGenerator(rng.random())
    this.grid = new Grid(this.diameter * 2, this.diameter, 0)
    this._setSphereNoise()
    this.speed = this.diameter / 30 / this.lapTime
  }

  _convertVec3(x, y) {
    const phi = x / this.grid.width * PI2
    const theta = y / this.grid.height * Math.PI
    const nx = Math.sin(theta) * Math.cos(phi) + 1
    const ny = Math.sin(theta) * Math.sin(phi) + 1
    const nz = Math.cos(theta) + 1
    return [nx, ny, nz]
  }

  _setSphereNoise() {
    for (let x = 0; x < this.grid.width; x++) {
      for (let y = 0; y < this.grid.height; y++) {
        let off, val
        switch (this.noiseMode) {
          case Properties.Noise.Simplex:
            val = this.noise.simplexFbm(...this._convertVec3(x, y))
            break
          case Properties.Noise.Ridged:
            val = this.noise.ridgedFbm(...this._convertVec3(x, y))
            break
          case Properties.Noise.DomainWarping:
            val = this.noise.domainWarping(...this._convertVec3(x, y))
            break
          case Properties.Noise.HStripe:
            off = this.noise.simplexFbm(...this._convertVec3(x, y))
            val = (Math.cos((4 * y / this.grid.height + off) * 2 * PI2) + 1) * 0.5
            break
          case Properties.Noise.VStripe:
            off = this.noise.simplexFbm(...this._convertVec3(x, y))
            val = (Math.cos((4 * x / this.grid.width + off) * 2 * PI2) + 1) * 0.5
            break
          case Properties.Noise.Gradation:
            off = this.noise.simplexFbm(...this._convertVec3(x, y))
            val = map(y + off * 10, -10, this.grid.height + 10, 0, 1)
            break
        }

        switch (3) {
          case 1:
            const hue = Math.floor(val * 360)
            this.grid.set(x, y, color(`hsb(${hue}, 80%, 100%)`))
            break
          case 2:
            const bright = Math.floor(val * 100)
            this.grid.set(x, y, color(`hsb(0, 0%, ${bright}%)`))
            break
          case 3:
            const col = weightedChoice(this.palette.colors, this.palette.weight, val)
            this.grid.set(x, y, col)
            break
        }
      }
    }
  }

  drawPlane() {
    for (let x = 0; x < this.grid.width; x++) {
      const gx = Math.floor(x + (this.grid.width * 3 / 4) - frameCount * this.speed) // (this.grid.width * 3 / 4) は回転の位置合わせだから消しても大丈夫
      for (let y = 0; y < this.grid.height; y++) {
        pSet(x + this.planeOffset[0], y + this.planeOffset[1], this.grid.get(gx, y))
      }
    }
  }

  draw(isBack) {
    for (let y = 0; y < this.diameter; y++) {
      const sw = this._sphereWidth[y]
      for (let x = 0; x < sw; x++) {
        const gx = Math.floor((x / sw + (isBack ? 1 : 0)) * this.diameter - frameCount * this.speed)
        const g = this.grid.get(gx, y)
        pSet((isBack ? -1 : 1) * (x - sw / 2 + 0.5) + this.sphereOffset[0], y + this.sphereOffset[1] - this.diameter / 2, isBack ? alpha(g) === 0 ? color(0, 0, 0, 0) : p8Pal.lightGray : g)
      }
    }
  }
}

class Satellite extends PixelSphere {
  constructor(options) {
    super(options.diameter)
    this.color = options.color
    this.speed = init(options.speed, 1)
    this.a = init(options.a, size * 2 / 3) // 横
    this.b = init(options.b, 0) // 縦
    this.initAngle = init(options.initAngle, 0)
    const rotate = init(options.rotate, 0) % 360 * Math.PI / 180 // -90~90
    this.offset = init(options.offset, [0, 0]) // 基準点: 中心

    this.s = Math.sin(rotate)
    this.c = Math.cos(rotate)
  }

  draw(isBack) {
    const rad = (-frameCount - this.initAngle) * this.speed % 360 * Math.PI / 180
    if (isBack ^ (Math.abs(rad) < Math.PI)) { return }
    const ex = this.a * Math.cos(rad)
    const ey = this.b * Math.sin(rad)
    const px = ex * this.c - ey * this.s
    const py = ex * this.s + ey * this.c
    for (let y = 0; y < this.diameter; y++) {
      const sw = this._sphereWidth[y]
      for (let x = 0; x < sw; x++) {
        pSet(px + x + this.offset[0] - sw / 2 + 0.5, py + y + this.offset[1] - this.diameter / 2, this.color)
      }
    }
  }
}

Properties = {
  Draw: {
    Front: false,
    Back: true
  },
  Noise: {
    Simplex: 0,
    Ridged: 1,
    DomainWarping: 2,
    VStripe: 3,
    HStripe: 4,
    Gradation: 5
  }
}
