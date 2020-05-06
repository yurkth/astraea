const PI2 = Math.PI * 2

const Properties = {
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
  },
  Color: {
    Analogous: 0,
    Complementary: 1,
    SplitComplementary: 2,
    Triad: 3,
    Cavity: 4,
    Earth: 5
  }
}

function mod(a, b) { return (a % b + b) % b }

function init(arg, def) { return arg === undefined ? def : arg }

function pSet(x, y, c) {
  if (c === null || (x < 0 || width <= x) || (y < 0 || height <= y)) { return }
  set(x, y, c)
}

function textb(str, x, y, border = palette.star[1], body = palette.star[0]) {
  fill(border)
  text(str, x - 1, y)
  text(str, x + 1, y)
  text(str, x, y - 1)
  text(str, x, y + 1)
  fill(body)
  text(str, x, y)
}

function weightedChoiceIndex(length, weight, value = rng.random()) {
  const totalWeight = weight.reduce((sum, val) => sum += val, 0)
  let threshold = value * totalWeight
  for (let i = 0; i < length; i++) {
    if (threshold <= weight[i]) {
      return i
    }
    threshold -= weight[i]
  }
}

function weightedChoice(array, weight, value = rng.random()) {
  return array[weightedChoiceIndex(array.length, weight, value)]
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

  randint(min, max) { return Math.floor(this.random() * (max - min) + min) } // [min, max)

  uniform(min, max) { return this.random() * (max - min) + min }
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

class Palette {
  constructor(mode) {
    this.mode = mode
    this.h = rng.randint(0, 360)

    this.background = this.parseColor(
      { h: { offset: this.h + 180, range: 20 }, s: { offset: 15, range: 0 }, b: { offset: 15, range: 0 } }
    )
    this.cloud = [
      { h: { offset: this.h, range: 20 }, s: { offset: 10, range: 10 }, b: { offset: 100, range: 0 } },
      { h: { offset: this.h, range: 20 }, s: { offset: 10, range: 10 }, b: { offset: 80, range: 0 } }
    ].map(prop => this.parseColor(prop))
    this.satellite = [
      { h: { offset: this.h + 45, range: 20 }, s: { offset: 30, range: 10 }, b: { offset: 90, range: 10 } },
      { h: { offset: this.shiftHue(this.h + 45), range: 20 }, s: { offset: 50, range: 10 }, b: { offset: 70, range: 10 } }
    ].map(prop => this.parseColor(prop))
    this.star = [
      { h: { offset: this.h + 180, range: 20 }, s: { offset: 10, range: 0 }, b: { offset: 100, range: 0 } },
      { h: { offset: this.h + 180, range: 20 }, s: { offset: 20, range: 0 }, b: { offset: 40, range: 0 } }
    ].map(prop => this.parseColor(prop))

    switch (mode) {
      case Properties.Color.Analogous:
        this.planet = [
          { h: { offset: this.h, range: 10 }, s: { offset: 60, range: 10 }, b: { offset: 90, range: 10 } },
          { h: { offset: this.shiftHue(this.h, 15), range: 10 }, s: { offset: 65, range: 10 }, b: { offset: 75, range: 10 } },
          { h: { offset: this.shiftHue(this.h, 30), range: 10 }, s: { offset: 70, range: 10 }, b: { offset: 60, range: 10 } }
        ].map(prop => this.parseColor(prop))
        break
      case Properties.Color.Complementary:
        this.planet = [
          { h: { offset: this.shiftHue(this.h, 15), range: 10 }, s: { offset: 60, range: 10 }, b: { offset: 75, range: 10 } },
          { h: { offset: this.h, range: 10 }, s: { offset: 60, range: 10 }, b: { offset: 90, range: 10 } },
          { h: { offset: this.h + 180, range: 10 }, s: { offset: 60, range: 10 }, b: { offset: 90, range: 10 } }
        ].map(prop => this.parseColor(prop))
        break
      case Properties.Color.SplitComplementary:
        this.planet = [
          { h: { offset: this.h + 160, range: 10 }, s: { offset: 40, range: 10 }, b: { offset: 90, range: 10 } },
          { h: { offset: this.h, range: 10 }, s: { offset: 60, range: 10 }, b: { offset: 90, range: 10 } },
          { h: { offset: this.h + 200, range: 10 }, s: { offset: 40, range: 10 }, b: { offset: 90, range: 10 } },
        ].map(prop => this.parseColor(prop))
        break
      case Properties.Color.Triad:
        this.planet = [
          { h: { offset: this.h + 120, range: 10 }, s: { offset: 40, range: 10 }, b: { offset: 90, range: 10 } },
          { h: { offset: this.h, range: 10 }, s: { offset: 60, range: 10 }, b: { offset: 90, range: 10 } },
          { h: { offset: this.h + 240, range: 10 }, s: { offset: 40, range: 10 }, b: { offset: 90, range: 10 } },
        ].map(prop => this.parseColor(prop))
        break
      case Properties.Color.Cavity:
        this.planet = [
          null,
          { h: { offset: this.h, range: 10 }, s: { offset: 60, range: 10 }, b: { offset: 90, range: 10 } },
          null
        ].map(prop => prop === null ? null : this.parseColor(prop))
        break
      case Properties.Color.Earth:
        this.planet = [
          { h: { offset: 210, range: 10 }, s: { offset: 60, range: 10 }, b: { offset: 85, range: 10 } },
          { h: { offset: 200, range: 10 }, s: { offset: 60, range: 10 }, b: { offset: 85, range: 10 } },
          { h: { offset: 135, range: 10 }, s: { offset: 70, range: 10 }, b: { offset: 90, range: 10 } }
        ].map(prop => this.parseColor(prop))
        this.cloud = [
          { h: { offset: this.h, range: 0 }, s: { offset: 2, range: 4 }, b: { offset: 98, range: 4 } },
          { h: { offset: 0, range: 0 }, s: { offset: 0, range: 0 }, b: { offset: 80, range: 0 } }
        ].map(prop => this.parseColor(prop))
        break
    }
  }

  shiftHue(hue, dist = 15) {
    hue = mod(hue, 360)
    if (240 - dist <= hue && hue <= 240 + dist)
      return 240
    if (60 < hue && hue < 225)
      return hue + dist
    return mod(hue - dist, 360)
  }

  parseColor(prop) {
    return color(
      `hsb(${mod(rng.randint(-prop.h.range / 2, prop.h.range / 2) + prop.h.offset, 360)},
           ${rng.randint(-prop.s.range / 2, prop.s.range / 2) + prop.s.offset}%,
           ${rng.randint(-prop.b.range / 2, prop.b.range / 2) + prop.b.offset}%)`
    )
  }
}
