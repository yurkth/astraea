const size = 64
const pw = size * 3
const ph = size * 3.5
let px
let scaling
let p8Pal
let p8Font

let planet
let cloud
let satellites = []

// let palette

function preload() {
  // https://www.lexaloffle.com/bbs/?tid=3760
  p8Font = loadFont("PICO-8_mono_upper.ttf")
}

function setup() {
  const minScale = 2
  scaling = Math.floor(Math.max(Math.min(windowWidth / pw, (windowHeight - 485) / ph), minScale)) // 最低倍率をminScale倍として、スクロールしないで画面に収まる最大倍率 
  const canvas = createCanvas(pw * scaling, ph * scaling)
  canvas.parent("canvas")
  px = createGraphics(pw, ph)
  noSmooth()

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

  setPalette()
  px.noStroke()
  px.textFont(p8Font, 5)
  px.textAlign(CENTER, TOP)

  // noLoop()
  planet = new Planet({
    diameter: size,
    speed: 1,
    depth: 0,
    threshold: 0,
    planeOffset: [pw / 2 - size, 9],
    sphereOffset: [pw / 2, size * 2.5]
  })
  cloud = new Planet({
    diameter: size + 4,
    speed: 0.5,
    depth: 1,
    threshold: 0.6,
    sphereOffset: planet.sphereOffset
  })
  for (let i = 0; i < 4; i++) {
    satellites.push(new Satellite({
      diameter: rng.randint(1, 8),
      color: p8Pal.orange,
      speed: rng.random() + 0.5,
      a: rng.randint(48, 64),
      b: rng.randint(8, 16),
      initAngle: rng.randint(0, 360),
      rotate: rng.randint(-90, 90),
      offset: planet.sphereOffset
    }))
  }
}

function draw() {
  px.background(p8Pal.darkBlue)
  px.loadPixels()
  {
    planet.drawPlane(0, 9)

    for (let s of satellites) {
      s.draw(Properties.Draw.Back)
    }
    cloud.draw(Properties.Draw.Back)
    planet.draw(Properties.Draw.Front)
    cloud.draw(Properties.Draw.Front)
    for (let s of satellites) {
      s.draw(Properties.Draw.Front)
    }
  }
  px.updatePixels()
  {
    textb("plane", pw / 2, 2)
    textb("sphere", pw / 2, planet.grid.height + 11)
  }

  scale(scaling)
  image(px, 0, 0)

  // print(`fps: ${Math.floor(frameRate())}`)
}
