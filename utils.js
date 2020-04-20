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
  if (alpha(c) === 0) return
  x = Math.floor(x)
  y = Math.floor(y)
  const index = (y * w + x) * 4
  px.pixels[index] = red(c)
  px.pixels[index + 1] = green(c)
  px.pixels[index + 2] = blue(c)
  px.pixels[index + 3] = alpha(c)
}

function pGet(x, y) {
  x = Math.floor(x)
  y = Math.floor(y)
  const index = (y * w + x) * 4
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

class NumberGenerator {
  #rng
  #simplex
  constructor(seed) {
    this.seed = init(seed, Math.random())
    this.#rng = new alea(this.seed)
    this.#simplex = new SimplexNoise(this.#rng)
  }

  random() { return this.#rng() }

  // randint(min, max) { return Math.floor(this.random() * (max - min)) + min } // [min, max)

  _noise3D(x, y, z, noiseScale) { return this.#simplex.noise3D(x * noiseScale, y * noiseScale, z * noiseScale) * 0.5 + 0.5 } // [0, 1]

  noise3D(x, y, z) {
    let fbm = 0
    let max = 0
    for (let o = 0; o < 6; o++) {
      const ampl = pow(0.5, o)
      fbm += ampl * this._noise3D(x, y, z, pow(2, o))
      max += ampl
    }
    return fbm / max
  }
}

const ng = new NumberGenerator(0)
console.log(`seed: ${ng.seed}`)

class Planet {
  #sphereWidth
  constructor(options) {
    this.diameter = options.diameter
    this.speed = init(options.speed, 1)
    const depth = init(options.depth, 0)
    const threshold = init(options.threshold, 0)
    this.planeOffset = init(options.planeOffset, { x: 0, y: 0 })
    this.sphereOffset = init(options.sphereOffset, { x: 0, y: 0 })

    this.grid = new Grid(this.diameter * 2, this.diameter, 0)
    this.#sphereWidth = this._getSphereWidth()

    const noiseScale = 0.05
    for (let x = 0; x < this.grid.width; x++) {
      for (let y = 0; y < this.grid.height; y++) {
        const n = this._sphereNoise(x, y, noiseScale, depth)
        // const hue = Math.floor(x / this.grid.width * 360)
        /*const hue = Math.floor(n * 360)
        this.grid.set(x, y, color(`hsb(${hue}, 80%, 100%)`))*/
        if (threshold === 0) {
          this.grid.set(x, y, n > 0.55 ? p8Pal.green : p8Pal.blue)
        }
        else {
          this.grid.set(x, y, n > threshold ? p8Pal.white : color(0, 0, 0, 0))
        }
      }
    }
  }

  _getSphereWidth() {
    // Reference: https://github.com/nesbox/TIC-80/blob/master/src/tic.c#L948-L961
    let sphereWidth = []
    const parity = 1 - this.diameter % 2
    let r = Math.floor(this.diameter / 2) - parity
    let y = -r
    let x = 0
    let d = 2 - 2 * r

    do {
      r = d
      if (r > y || d > x) {
        sphereWidth.push(x * 2 + 1 + parity)
        d += ++y * 2 + 1
      }
      if (r <= x) {
        d += ++x * 2 + 1
      }
    } while (y <= 0)
    return sphereWidth
  }

  _getWidth(y) {
    if (y < 0 || this.diameter <= y) {
      throw new RangeError(`The argument must be between ${0} and ${this.diameter - 1}.`)
    }

    let index
    if (y < Math.floor(this.diameter / 2) + this.diameter % 2) {
      index = y
    } else {
      index = this.diameter - y - 1
    }
    return this.#sphereWidth[index]
  }

  _sphereNoise(x, y, noiseScale, depth = 0) { // depth >= 0じゃないとダメかも
    const r = this.grid.width / PI2
    const phi = x / this.grid.width * PI2
    const theta = y / this.grid.height * Math.PI
    const nx = r * (Math.sin(theta) * Math.cos(phi) + 1 + depth * 2)
    const ny = r * (Math.sin(theta) * Math.sin(phi) + 1 + depth * 2)
    const nz = r * (Math.cos(theta) + 1 + depth * 2)
    return ng.noise3D(nx * noiseScale, ny * noiseScale, nz * noiseScale)
  }

  drawPlane() {
    for (let x = 0; x < this.grid.width; x++) {
      const gx = Math.floor(x + (this.grid.width * 3 / 4) - frameCount * this.speed) // (this.grid.width * 3 / 4) は回転の位置合わせだから消しても大丈夫
      for (let y = 0; y < this.grid.height; y++) {
        pSet(x + this.planeOffset.x, y + this.planeOffset.y, this.grid.get(gx, y))
      }
    }
  }

  drawSphere() {
    for (let y = 0; y < this.diameter; y++) {
      const sw = this._getWidth(y)
      for (let x = 0; x < sw; x++) {
        const gx = Math.floor((x / sw) * this.diameter - frameCount * this.speed)
        pSet(x + this.sphereOffset.x - sw / 2, y + this.sphereOffset.y, this.grid.get(gx, y))
      }
    }
  }

  drawSphereOtherSide(offX = 0, offY = 0) {
    for (let y = 0; y < this.diameter; y++) {
      const sw = this._getWidth(y)
      for (let x = 0; x < sw; x++) {
        const gx = Math.floor((x / sw + 1) * this.diameter - frameCount * this.speed)
        if (alpha(this.grid.get(gx, y)) !== 0) {
          pSet(sw - 1 - x + this.sphereOffset.x - sw / 2, y + this.sphereOffset.y, p8Pal.lightGray)
        }
      }
    }
  }
}
