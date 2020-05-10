let rng
const inputSeed = document.getElementById("seed")

let palette
let planets
let satellites
let stars

function explore() {
  const seed = (inputSeed.value || randomWord()).replace(/ /g, "_").replace(/[^\w]/g, "?").toLowerCase()
  inputSeed.value = ""
  rng = new Random(seed.toUpperCase())
  if (seed in Template) {
    Template[seed]()
  } else {
    generate()
  }
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
    // Reference: https://github.com/nesbox/TIC-80/blob/813a46bd2ac02f7d28fff57200b715719be60712/src/tic.c#L940-L953
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

class Template {
  // static tableToHex(tbl) {
  //   const gzip = new Zlib.Gzip(tbl)
  //   const compressed = Array.from(gzip.compress())
  //   return compressed.reduce((hex, val) => hex + ("00" + val.toString(16)).substr(-2), "")
  // }

  static hexToTable(hex) {
    const compressed = hex.match(/[0-9a-f]{2}/g).map(val => parseInt(val, 16))
    const gunzip = new Zlib.Gunzip(compressed)
    return Array.from(gunzip.decompress())
  }

  static earth() {
    const size = 48

    palette = new Palette(Properties.Color.Earth)
    palette = {
      background: color("hsb(255,15%,15%)"),
      planet: [
        color("hsb(210,65%,85%)"),
        color("hsb(200,70%,85%)"),
        color("hsb(135,80%,90%)"),
        color("hsb(190,20%,100%)")
      ],
      cloud: [
        color("hsb(0,2%,98%)"),
        color("hsb(0,0%,80%)")
      ],
      satellite: color("hsb(45,20%,90%)"),
      star: [
        color("hsb(255,10%,100%)"),
        color("hsb(255,20%,40%)")
      ]
    }

    planets = [
      new Planet({ // earth
        diameter: size,
        palette: palette.planet,
        weight: [1, 1, 1, 1],
        lapTime: 3,
      }),
      new Planet({ // cloud
        diameter: size + 4,
        noiseMode: Properties.Noise.DomainWarping,
        palette: [palette.cloud[0], null, palette.cloud[0]],
        weight: [2, 3, 3.5],
        backColor: palette.cloud[1],
        lapTime: 5
      })
    ]
    planets[0].grid.table = this.hexToTable("1f8b08007348b35e00ffed58ed92e33008dbeebeff3bd71f9820901ca73777b33f8ee9875b63010293383f7f595e260f74e3b22a0599cfee7ce1f2dd64af512ce04f017aa11f58681a0b2c1b60b0e3734127c1c8faeff1e9838e7c059499f005b7c2b5dabf3180f18d4c9c8958114920d41cfb6d6baa91f54f4acf7c1f7aed1e21afc85bf6fd94940bb6240e8ddca948ffbf9abcda6bb7fac00581dfd14de4728d6e04c8d406743050e1613ed59b286de38619a051d22ea3cbb24d25781e8093f868e7f602d6f0b15b80fbe3fb60eb4f0c013f8721b13e4de0975ec5ef5529f0cd80a732e253e77d9f474e55006b6ceb824982ef012cf5e89148808f43ed4b7c57e9a349df1d7eb4008918a911fb74e8cef959fa1b78c802eb6f5833c09fe9d840a19362972de8c2b52892f6093c5ae8da999d35b1ba2dd637074f6c833e943a34c770c58fc541e04ff143005e41d95181cf08aaf8060099ec3dee0e3f134d02836c5ec582333c01b24403be718d06ca1a91e0885ff8a4f87367164e4505458278e5b225d043b65b20c42a76464d5d2aba9c171280ba2186ad9ba7d2adba30e0a52048dcedfc78dbaef1a1a38b1ea80df897e4275ec2b68d6a17867465960f72f8dc80de00e92af6b1850fbdfa2fff446eced47eb07c7c18f7150707fccda9ffe4e9c08307147ff270e397ca1b88d2954100120000")

    satellites = [
      new Satellite({
        diameter: 8,
        color: palette.satellite,
        speed: 0.8,
        a: 48,
        b: 8,
        initAngle: rng.randint(0, 360),
        rotate: 30
      })
    ]

    const pdsObj = new PoissonDiskSampling({
      shape: [width, height],
      minDistance: 25,
      maxDistance: 50,
      tries: 20
    }, rng.random.bind(rng))
    stars = pdsObj.fill().map(val => [...val, weightedChoice([...palette.star, null], [3, 6, 2])])
  }

  static torin() { this.yurkth() }

  static yurkth() {
    const size = 48

    palette = {
      background: color("hsb(255,15%,15%)"),
      planet: [
        color("#808080"),
        color("#c7b83c"),
        color("#503c18"),
        color("#92cfbb"),
        color("#3a5345")
      ],
      star: [
        color("hsb(255,10%,100%)"),
        color("hsb(255,20%,40%)")
      ]
    }

    planets = [new Planet({
      diameter: size,
      palette: palette.planet,
      weight: [1, 1, 1, 1, 1],
      lapTime: 3,
    })]
    const tmp = new Grid(24, 12)
    tmp.table = this.hexToTable("1f8b0800775ab35e00ff958fd10a402108436fe6ff7f733b53df22b8c3411c65daf75fa9c2bc4385c13b73633562452cac8660c9bc65eececc9bce3c49334fd23be7ce6b81e37b81e3fd01dd6fcce5babff0550758fb0d9b20010000")
    for (let y = 0; y < planets[0].grid.height; y++) {
      for (let x = 0; x < planets[0].grid.width; x++) {
        planets[0].grid.set(x, y, tmp.get(Math.floor(x / 4), Math.floor(y / 4)))
      }
    }

    satellites = []

    const pdsObj = new PoissonDiskSampling({
      shape: [width, height],
      minDistance: 25,
      maxDistance: 50,
      tries: 20
    }, rng.random.bind(rng))
    stars = pdsObj.fill().map(val => [...val, weightedChoice([...palette.star, null], [3, 6, 2])])
  }

  static rainbow() {
    const size = 48

    palette = {
      background: color("hsb(255,15%,15%)"),
      planet: [
        color("hsb(0,70%,90%)"),
        color("hsb(45,70%,90%)"),
        color("hsb(90,70%,90%)"),
        color("hsb(135,70%,90%)"),
        color("hsb(180,70%,90%)"),
        color("hsb(225,70%,90%)"),
        color("hsb(270,70%,90%)"),
        color("hsb(315,70%,90%)"),
      ],
      star: [
        color("hsb(255,10%,100%)"),
        color("hsb(255,20%,40%)")
      ]
    }

    planets = [new Planet({
      diameter: size,
      palette: palette.planet,
      weight: [1, 1, 1, 1, 1, 1, 1, 1],
      lapTime: 3,
    })]
    for (let y = 0; y < planets[0].grid.height; y++) {
      for (let x = 0; x < planets[0].grid.width; x++) {
        planets[0].grid.set(x, y, Math.floor(x / 12) % 8)
      }
    }

    satellites = []

    const pdsObj = new PoissonDiskSampling({
      shape: [width, height],
      minDistance: 25,
      maxDistance: 50,
      tries: 20
    }, rng.random.bind(rng))
    stars = pdsObj.fill().map(val => [...val, weightedChoice([...palette.star, null], [3, 6, 2])])
  }

  static pico8() {
    const size = 48

    palette = {
      background: color(29, 43, 83),
      planet: [
        color(41, 173, 255),
        color(255, 204, 170),
        color(0, 228, 54),
      ],
      cloud: [
        color(255, 241, 232),
        color(194, 195, 199)
      ],
      satellite: [
        color(255, 163, 0),
        color(255, 236, 39)
      ],
      star: [
        color(255, 241, 232),
        color(95, 87, 79)
      ]
    }

    planets = [
      new Planet({ // main planet
        diameter: size,
        noiseMode: Properties.Noise.Simplex,
        palette: palette.planet,
        weight: [8, 1, 6],
        lapTime: 3,
      }),
      new Planet({ // cloud
        diameter: size + 4,
        noiseMode: Properties.Noise.DomainWarping,
        palette: [palette.cloud[0], null, palette.cloud[0]],
        weight: [2, 3, 3],
        backColor: palette.cloud[1],
        lapTime: 5
      })
    ]

    satellites = []
    for (let i = 0; i < 2; i++) {
      satellites.push(new Satellite({
        diameter: rng.randint(5, size / 8),
        color: palette.satellite[i],
        speed: rng.uniform(0.5, 1.5), // [3sec, 9sec)
        a: rng.randint(size * 3 / 4, size),
        b: rng.randint(size / 8, size / 4),
        initAngle: rng.randint(0, 360),
        rotate: rng.randint(-90, 90)
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
}
