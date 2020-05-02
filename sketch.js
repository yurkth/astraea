let p8Font
let palette

let stars
let planets = []
let satellites = []

function preload() {
  // https://www.lexaloffle.com/bbs/?tid=3760
  p8Font = loadFont("PICO-8_mono_upper.ttf")
}

function setup() {
  const size = 64
  {
    const pw = size * 3
    const ph = size * 3.5
    const minScale = 2
    const scaling = Math.floor(Math.max(Math.min(windowWidth / pw, (windowHeight - 485) / ph), minScale)) // 最低倍率をminScale倍として、スクロールしないで画面に収まる最大倍率 
    const canvas = createCanvas(pw, ph)
    canvas.parent("canvas")
    canvas.elt.style.cssText += `width: ${width * scaling}px; height: ${height * scaling}px;`
  }
  textFont(p8Font, 5)
  textAlign(CENTER, TOP)

  palette = {
    background: color(29, 43, 83),
    star: [
      color(255, 241, 232),
      color(95, 87, 79)
    ],
    // TODO: 下の色はランダムに決めるようにする
    planet: [
      color(41, 173, 255),
      color(255, 204, 170),
      color(0, 228, 54),
      color(0)
    ],
    cloud: [
      color(255, 241, 232),
      color(194, 195, 199)
    ],
    satellite: [
      color(255, 163, 0),
      color(255, 236, 39)
    ]
  }

  // noLoop()
  const defaultOffset = [width / 2, size * 2.5]
  planets.push(new Planet({ // main planet
    diameter: size,
    noiseMode: Properties.Noise.Simplex,
    palette: {
      colors: palette.planet,
      weight: [11, 1, 9, 0]
    },
    lapTime: rng.random() + 3, // [3, 4)
    planeOffset: [width / 2 - size, 9],
    offset: defaultOffset
  }))
  planets.push(new Planet({ // cloud
    diameter: size + 4,
    noiseMode: Properties.Noise.Simplex,
    palette: {
      colors: [null, palette.cloud[0]],
      weight: [3, 2],
      backColor: palette.cloud[1]
    },
    lapTime: rng.random() + 5, // [5, 6)
    offset: defaultOffset
  }))

  for (let i = rng.randint(1, 6); i > 0; i--) {
    satellites.push(new Satellite({
      diameter: rng.randint(2, size / 8),
      color: weightedChoice(palette.satellite, [1, 1]),
      speed: rng.random() + 0.5, // [3sec, 9sec)
      a: rng.randint(size * 3 / 4, size),
      b: rng.randint(size / 8, size / 4),
      initAngle: rng.randint(0, 360),
      rotate: rng.randint(-90, 90),
      offset: defaultOffset
    }))
  }

  const pdsObj = new PoissonDiskSampling({
    shape: [width, height],
    minDistance: 25,
    maxDistance: 50,
    tries: 20
  }, rng.random.bind(rng))
  stars = pdsObj.fill().map(val => [...val, weightedChoice(palette.star, [2, 5])])
}

function draw() {
  background(palette.background)
  loadPixels()
  {
    for (let point of stars) {
      pSet(...point)
    }

    planets[0].drawPlane(0, 9)

    for (let i = satellites.length - 1; i >= 0; i--) {
      satellites[i].draw(Properties.Draw.Back)
    }
    for (let i = planets.length - 1; i >= 0; i--) {
      if (planets[i].hasBack) {
        planets[i].draw(Properties.Draw.Back)
      }
    }
    for (let i = 0; i < planets.length; i++) {
      planets[i].draw(Properties.Draw.Front)
    }
    for (let i = 0; i < satellites.length; i++) {
      satellites[i].draw(Properties.Draw.Front)
    }
  }
  updatePixels()
  {
    textb("plane", width / 2, 2)
    textb("sphere", width / 2, planets[0].grid.height + 11)
  }

  // print(`fps: ${Math.floor(frameRate())}`)
}
