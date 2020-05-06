let rng
const inputSeed = document.getElementById("seed")

let palette
let planets
let satellites
let stars

function explore() {
  const seed = (inputSeed.value || randomWord()).replace(/[^\w ]/g, "?").toUpperCase()
  inputSeed.value = ""
  rng = new Random(seed)
  generate()
}

function generate() {
  const size = Math.max(rng.randint(32, 64), rng.randint(32, 64))

  palette = new Palette(
    weightedChoice(
      [Properties.Color.Analogous, Properties.Color.Complementary, Properties.Color.SplitComplementary,
      Properties.Color.Triad, Properties.Color.Cavity, Properties.Color.Earth],
      [15, 10, 6, 4, 1, 6]
    )
  )
  const isCavity = palette.mode === Properties.Color.Cavity

  const noiseDist = [
    [3, 1, 2, 1, 2, 2], // Analogous, Complementary
    [3, 0, 2, 0, 0, 2], // SplitComplementary, Triad
    [3, 0, 2, 0, 0, 0] // Cavity, Earth
  ]
  const noiseMode = weightedChoice(
    [Properties.Noise.Simplex, Properties.Noise.Ridged, Properties.Noise.DomainWarping,
    Properties.Noise.VStripe, Properties.Noise.HStripe, Properties.Noise.Gradation],
    noiseDist[Math.floor(palette.mode / 2)]
  )
  const isGradation = noiseMode === Properties.Noise.Gradation

  planets = []
  planets.push(new Planet({ // main planet
    diameter: size,
    noiseMode: noiseMode,
    palette: palette.planet,
    weight: isGradation ? [rng.uniform(1, 4), rng.uniform(1, 4), rng.uniform(1, 4)] : undefined,
    backColor: isCavity ? palette.cloud[0] : undefined,
    lapTime: rng.uniform(3, 5),
  }))

  if (!isCavity && weightedChoice([true, false], [4, 1])) {
    planets.push(new Planet({ // cloud
      diameter: size + 4,
      noiseMode: weightedChoice([Properties.Noise.Simplex, Properties.Noise.DomainWarping], [3, 1]),
      palette: [palette.cloud[0], null, palette.cloud[0]],
      weight: [2, 3, 3],
      backColor: palette.cloud[1],
      lapTime: planets[0].lapTime * rng.uniform(1.5, 2)
    }))
  }

  satellites = []
  const hasRing = weightedChoice([true, false], [1, 5])
  for (let i = hasRing ? rng.uniform(2, 4) * size : rng.randint(1, 6); i > 0; i--) {
    satellites.push(new Satellite({
      diameter: rng.randint(2, size / 8),
      color: weightedChoice(palette.satellite, [1, 1]),
      speed: rng.uniform(0.5, 1.5), // [3sec, 9sec)
      a: rng.randint(size * 3 / 4, size),
      b: rng.randint(size / 8, size / 4),
      initAngle: rng.randint(0, 360),
      rotate: hasRing ? 0 : rng.randint(-90, 90)
    }))
  }

  const pdsObj = new PoissonDiskSampling({
    shape: [width, height],
    minDistance: 25,
    maxDistance: 50,
    tries: 20
  }, rng.random.bind(rng))
  stars = pdsObj.fill().map(val => [...val, weightedChoice([...palette.star, null], [3, 6, 2])])
}

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
    this.weight = options.weight
    this.lapTime = init(options.lapTime, 1) // sec
    this.backColor = init(options.backColor, null)
    // this.planeOffset = [0, 0] // 基準点: 右上
    this.offset = [width / 2, height / 2] // 基準点: 中心

    this.noise = new NoiseGenerator(rng.random())
    this.grid = new Grid(this.diameter * 2, this.diameter, 0)
    this._setSphereNoise()
    this.speed = this.diameter / 30 / this.lapTime
    this.hasBack = this.backColor !== null
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
        let off, val, weight
        switch (this.noiseMode) {
          case Properties.Noise.Simplex:
            val = this.noise.simplexFbm(...this._convertVec3(x, y))
            weight = [8, 6, 11]
            break
          case Properties.Noise.Ridged:
            val = this.noise.ridgedFbm(...this._convertVec3(x, y))
            weight = [2, 1, 1]
            break
          case Properties.Noise.DomainWarping:
            val = this.noise.domainWarping(...this._convertVec3(x, y))
            weight = [8, 6, 11]
            break
          case Properties.Noise.VStripe:
            off = this.noise.simplexFbm(...this._convertVec3(x, y))
            val = (Math.cos((4 * x / this.grid.width + off) * this.diameter / 32 * PI2) + 1) * 0.5
            weight = [2, 3, 2]
            break
          case Properties.Noise.HStripe:
            off = this.noise.simplexFbm(...this._convertVec3(x, y))
            val = (Math.cos((4 * y / this.grid.height + off) * this.diameter / 32 * PI2) + 1) * 0.5
            weight = [1, 2, 1]
            break
          case Properties.Noise.Gradation:
            off = this.noise.simplexFbm(...this._convertVec3(x, y))
            val = (y + off * 20) / (this.grid.height + 20)
            weight = [2, 1, 2]
            break
        }

        this.grid.set(x, y, weightedChoiceIndex(this.palette.length, init(this.weight, weight), val))
      }
    }
  }

  // drawPlane() {
  //   for (let x = 0; x < this.grid.width; x++) {
  //     const gx = Math.floor(x + (this.grid.width * 3 / 4) - frameCount * this.speed) // (this.grid.width * 3 / 4) は回転の位置合わせだから消しても大丈夫
  //     for (let y = 0; y < this.grid.height; y++) {
  //       pSet(x + this.planeOffset[0], y + this.planeOffset[1], this.palette[this.grid.get(gx, y)])
  //     }
  //   }
  // }

  draw(isBack) {
    if (isBack && !this.hasBack) { return }
    for (let y = 0; y < this.diameter; y++) {
      const sw = this._sphereWidth[y]
      for (let x = 0; x < sw; x++) {
        const gx = Math.floor((x / sw + (isBack ? 1 : 0)) * this.diameter - frameCount * this.speed)
        let c = this.palette[this.grid.get(gx, y)]
        if (isBack && c !== null) {
          c = this.backColor
        }
        pSet((isBack ? -1 : 1) * (x - sw / 2 + 0.5) + this.offset[0], y + this.offset[1] - this.diameter / 2, c)
      }
    }
  }
}

class Satellite extends PixelSphere {
  constructor(options) {
    super(options.diameter)
    this.color = options.color
    this.speed = init(options.speed, 1)
    this.a = init(options.a, width / 3) // 横
    this.b = init(options.b, 0) // 縦
    this.initAngle = init(options.initAngle, 0)
    const rotate = init(options.rotate, 0) % 360 * Math.PI / 180 // -90~90
    this.offset = [width / 2, height / 2] // 基準点: 中心

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
