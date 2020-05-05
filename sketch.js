let p8Font
let palette

let stars
let planets = []
let satellites = []

const rng = new Random()
console.log(`seed: ${rng.seed}`)
const documentHeight = document.getElementsByTagName("body")[0].clientHeight

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
    const scaling = Math.floor(Math.max(Math.min(windowWidth / pw, (windowHeight - documentHeight) / ph), minScale)) // 最低倍率をminScale倍として、スクロールしないで画面に収まる最大倍率 
    const canvas = createCanvas(pw, ph)
    canvas.parent("canvas")
    canvas.elt.style.cssText += `width: ${width * scaling}px; height: ${height * scaling}px;`
  }
  textFont(p8Font, 5)
  textAlign(CENTER, TOP)

  palette = new Palette(Properties.Color.Complementary)

  const defaultOffset = [width / 2, size * 2.5]
  planets.push(new Planet({ // main planet
    diameter: size,
    noiseMode: Properties.Noise.Gradation,
    palette: palette.planet,
    lapTime: rng.random() + 3, // [3, 4)
    planeOffset: [width / 2 - size, 9],
    offset: defaultOffset
  }))
  planets.push(new Planet({ // cloud
    diameter: size + 4,
    noiseMode: Properties.Noise.Simplex,
    palette: [null, palette.cloud[0]],
    weight: [3, 2],
    backColor: palette.cloud[1],
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
      planets[i].draw(Properties.Draw.Back)
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
