let p8Font
let palette

let stars
let planets = []
let satellites = []

const rng = new Random()
const documentHeight = document.getElementsByTagName("body")[0].clientHeight

function preload() {
  // https://www.lexaloffle.com/bbs/?tid=3760
  p8Font = loadFont("PICO-8_mono_upper.ttf")
}

function setup() {
  {
    const pw = 192
    const ph = 144
    const minScale = 2
    const scaling = Math.floor(Math.max(Math.min(windowWidth / pw, (windowHeight - documentHeight) / ph), minScale)) // 最低倍率をminScale倍として、スクロールしないで画面に収まる最大倍率 
    const canvas = createCanvas(pw, ph)
    pixelDensity(1) // for smartphone
    canvas.parent("canvas")
    canvas.elt.style.cssText += `width: ${width * scaling}px; height: ${height * scaling}px;`
  }
  textFont(p8Font, 5)
  textAlign(CENTER, TOP)

  const size = Math.max(rng.randint(32, 64), rng.randint(32, 64))

  palette = new Palette(
    weightedChoice(
      [Properties.Color.Analogous, Properties.Color.Complementary, Properties.Color.SplitComplementary,
      Properties.Color.Triad, Properties.Color.Cavity, Properties.Color.Earth],
      [12, 8, 8, 8, 1, 3]
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

function draw() {
  background(palette.background)
  loadPixels()
  {
    for (let star of stars) {
      pSet(...star)
    }

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
    textb(rng.seed, width / 2, 2)
  }

  // print(`fps: ${Math.floor(frameRate())}`)
}
