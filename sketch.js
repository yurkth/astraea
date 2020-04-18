const w = 128
const h = 128
let px
let scaling
let p8Pal
let p8Font

function preload() {
    p8Font = loadFont("PICO-8_mono_upper.ttf") // https://www.lexaloffle.com/bbs/?tid=3760
}

function setup() {
    const minScale = 2
    scaling = Math.floor(Math.max(Math.min(windowWidth / w, (windowHeight - 485) / h), minScale)) // 最低倍率をminScale倍として、スクロールしないで画面に収まる最大倍率 
    const canvas = createCanvas(w * scaling, h * scaling)
    canvas.parent("canvas")
    px = createGraphics(w, h)
    noSmooth()

    setPalette()
    px.noStroke()
    px.textFont(p8Font, 5)
}

function draw() {
    px.background(p8Pal.lightGray)
    px.loadPixels()
    { }
    px.updatePixels()

    scale(scaling)
    image(px, 0, 0)
    
    print(`fps: ${floor(frameRate())}`)
}
