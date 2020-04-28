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
  x = Math.floor(x)
  y = Math.floor(y)
  const index = (y * pw + x) * 4
  px.pixels[index] = red(c)
  px.pixels[index + 1] = green(c)
  px.pixels[index + 2] = blue(c)
  px.pixels[index + 3] = alpha(c)
}

function pGet(x, y) {
  x = Math.floor(x)
  y = Math.floor(y)
  const index = (y * pw + x) * 4
  const r = px.pixels[index]
  const g = px.pixels[index + 1]
  const b = px.pixels[index + 2]
  const a = px.pixels[index + 3]
  return color(r, g, b, a)
}

function textb(str, x, y, border = p8Pal.white, body = p8Pal.black) {
  px.fill(border)
  px.text(str, x - 1, y)
  px.text(str, x + 1, y)
  px.text(str, x, y - 1)
  px.text(str, x, y + 1)
  px.fill(body)
  px.text(str, x, y)
}

class Grid {
  #table
  constructor(width, height, init) {
    this.width = width
    this.height = height
    this.#table = new Array(this.width * this.height).fill(init)
  }

  set(x, y, val) {
    if (x < 0 || this.width <= x) {
      throw new RangeError(`The argument must be between x ${0} and ${this.width - 1}.`)
    } else if (y < 0 || this.height <= y) {
      throw new RangeError(`The argument must be between y ${0} and ${this.height - 1}.`)
    } else {
      this.#table[y * this.width + x] = val
    }
  }

  get(x, y) {
    if (x < 0 || this.width <= x) {
      x = mod(x, this.width)
    }
    if (y < 0 || this.height <= y) {
      y = mod(y, this.height)
    }
    return this.#table[y * this.width + x]
  }
}

class Random {
  #rng
  constructor(seed) {
    this.seed = init(seed, Math.random())
    this.#rng = new alea(this.seed)
  }

  random() { return this.#rng() }

  randint(min, max) { return Math.floor(this.random() * (max - min)) + min } // [min, max)
}

class NoiseGenerator {
  #simplex
  constructor(seed) {
    this.seed = init(seed, Math.random())
    this.#simplex = new SimplexNoise(new alea(this.seed))
  }

  _noise3D(x, y, z, noiseScale = 1) { return this.#simplex.noise3D(x * noiseScale, y * noiseScale, z * noiseScale) * 0.5 + 0.5 } // [0, 1]

  _ridged(x, y, z, noiseScale = 1) { return Math.abs(this.#simplex.noise3D(x * noiseScale, y * noiseScale, z * noiseScale)) } // [0, 1]

  _fbm(func, x, y, z, octaves = 6, noiseScale = 1) {
    let result = 0
    let denom = 0
    for (let o = 0; o < octaves; o++) {
      const ampl = Math.pow(0.5, o)
      result += ampl * func(x, y, z, Math.pow(2, o) * noiseScale)
      denom += ampl
    }
    return result / denom
  }

  simplexFbm(x, y, z, octaves = 6, noiseScale = 1) {
    return this._fbm(this._noise3D.bind(this), x, y, z, octaves, noiseScale)
  }

  ridgedFbm(x, y, z, octaves = 6, noiseScale = 1) {
    return this._fbm(this._ridged.bind(this), x, y, z, octaves, noiseScale)
  }

  domainWarping(x, y, z, octaves = 6, noiseScale = 1) {
    const n = this._noise3D(x, y, z)
    return this.simplexFbm(x + n, y + n, z + n, octaves, noiseScale)
  }
}

const rng = new Random(0)
const ng = new NoiseGenerator(rng.random())
console.log(`seed: ${rng.seed}`)

class PixelSphere {
  #sphereWidth = []
  constructor(diameter) {
    this.diameter = diameter
    this._setSphereWidth()
  }

  get _sphereWidth() {
    return this.#sphereWidth
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
        this.#sphereWidth[y + i] = w
        this.#sphereWidth[this.diameter - y - i - 1] = w
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
    this.noiseMode = init(options.noiseMode, Properties.Noise.Simplex)
    this.speed = init(options.speed, 1)
    this.threshold = init(options.threshold, 0)
    this.planeOffset = init(options.planeOffset, [0, 0]) // 基準点: 右上
    this.sphereOffset = init(options.sphereOffset, [0, 0]) // 基準点: 中心
    this.noiseScale = 1 // TODO: diameterをもとに計算

    this.grid = new Grid(this.diameter * 2, this.diameter, 0)
    this._setSphereNoise()
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
        let n
        switch (this.noiseMode) {
          case Properties.Noise.Simplex:
            n = ng.simplexFbm(...this._convertVec3(x, y))
            break
          case Properties.Noise.Ridged:
            n = ng.ridgedFbm(...this._convertVec3(x, y))
            break
          case Properties.Noise.DomainWarping:
            n = ng.domainWarping(...this._convertVec3(x, y))
            break
          case Properties.Noise.HStripe:
            n = (Math.cos((4 * y / this.grid.height + ng.simplexFbm(...this._convertVec3(x, y))) * 2 * PI2) + 1) * 0.5
            break
          case Properties.Noise.VStripe:
            n = (Math.cos((4 * x / this.grid.width + ng.simplexFbm(...this._convertVec3(x, y))) * 2 * PI2) + 1) * 0.5
            break
        }

        switch (3) {
          case 1:
            const hue = Math.floor(n * 360)
            this.grid.set(x, y, color(`hsb(${hue}, 80%, 100%)`))
            break
          case 2:
            const bright = Math.floor(n * 100)
            this.grid.set(x, y, color(`hsb(0, 0%, ${bright}%)`))
            break
          case 3:
            if (this.threshold === 0) {
              this.grid.set(x, y, n > 0.55 ? p8Pal.green : p8Pal.blue)
            } else {
              this.grid.set(x, y, n > this.threshold ? p8Pal.white : color(0, 0, 0, 0)) // TODO: 雲のときにSeed設定
            }
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

class Properties {
  static Draw = {
    Front: false,
    Back: true
  }
  static Noise = {
    Simplex: 0,
    Ridged: 1,
    DomainWarping: 2,
    VStripe: 3,
    HStripe: 4
  }
}
