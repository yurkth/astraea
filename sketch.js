const size = 64
let px
let p8Pal
let p8Font

let stars
let planets = []
let satellites = []

// let palette

function preload() {
  // https://www.lexaloffle.com/bbs/?tid=3760
  p8Font = loadFont("PICO-8_mono_upper.ttf")
}

function setup() {
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
  setPalette()

  // palette = [
  //   color("#19254f"),
  //   color("#f3f1e3"),
  //   color("#49608c"),
  //   color("#169adb"),
  //   color("#3bc2d1"),
  //   color("#0b965a"),
  //   color("#1bd15b"),
  //   color("#8ed66f"),
  //   color("#b03862"),
  //   color("#e34451"),
  //   color("#e37f78"),
  //   color("#c27a1d"),
  //   color("#eda72d"),
  //   color("#e0c267"),
  // ]

  const pdsObj = new PoissonDiskSampling({
    shape: [width, height],
    minDistance: 25,
    maxDistance: 50,
    tries: 20
  }, rng.random.bind(rng))
  starPalette = [[p8Pal.white, p8Pal.darkGray], [2, 5]]
  stars = pdsObj.fill().map(val => [...val, weightedChoice(...starPalette)])

  // noLoop()
  planets.push(new Planet({
    diameter: size,
    noiseMode: Properties.Noise.Simplex,
    palette: {
      colors: [p8Pal.blue, p8Pal.peach, p8Pal.green],
      weight: [11, 1, 9]
    },
    lapTime: rng.random() + 1.5, // [1.5, 2.5)
    planeOffset: [width / 2 - size, 9],
    sphereOffset: [width / 2, size * 2.5]
  }))
  satellites.push(new Planet({ // cloud
    diameter: planets[0].diameter + 4,
    noiseMode: Properties.Noise.Simplex,
    palette: {
      colors: [color(0, 0, 0, 0), p8Pal.white],
      weight: [3, 2]
    },
    lapTime: planets[0].lapTime * 1.8,
    sphereOffset: planets[0].sphereOffset
  }))
  for (let i = rng.randint(1, 6); i > 0; i--) {
    satellites.push(new Satellite({
      diameter: rng.randint(1, size / 8),
      color: p8Pal.orange,
      speed: rng.random() + 0.5, // [3sec, 9sec)
      a: rng.randint(planets[0].diameter * 3 / 4, planets[0].diameter),
      b: rng.randint(planets[0].diameter / 8, planets[0].diameter / 4),
      initAngle: rng.randint(0, 360),
      rotate: rng.randint(-90, 90),
      offset: planets[0].sphereOffset
    }))
  }
}

function draw() {
  background(p8Pal.darkBlue)
  loadPixels()
  {
    for (let point of stars) {
      pSet(...point)
    }

    planets[0].drawPlane(0, 9)

    for (let s of satellites) {
      s.draw(Properties.Draw.Back)
    }
    for (let p of planets) {
      p.draw(Properties.Draw.Front)
    }
    for (let s of satellites) {
      s.draw(Properties.Draw.Front)
    }
  }
  updatePixels()
  {
    textb("plane", width / 2, 2)
    textb("sphere", width / 2, planets[0].grid.height + 11)
  }

  // print(`fps: ${Math.floor(frameRate())}`)
}
