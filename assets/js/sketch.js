let p8Font
const documentHeight = Array.from(document.getElementsByTagName("section")).reduce((h, v) => h + v.clientHeight, 0)

function preload() {
  // https://www.lexaloffle.com/bbs/?tid=3760
  p8Font = loadFont("assets/font/PICO-8_mono_upper.ttf")
}

function setup() {
  const pw = 192
  const ph = 144
  const minScale = 2
  // 最低倍率をminScale倍として、スクロールしないで画面に収まる最大倍率 
  const scaling = Math.floor(Math.max(Math.min(windowWidth / pw, (windowHeight - documentHeight) / ph), minScale))
  const canvas = createCanvas(pw, ph)
  pixelDensity(1) // for smartphone
  canvas.parent("canvas")
  canvas.elt.style.cssText += `width: ${width * scaling}px; height: ${height * scaling}px;`

  textFont(p8Font, 5)
  textAlign(CENTER, TOP)

  explore()
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
