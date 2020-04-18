const size = 64
const w = size * 2
const h = size * 2 + 15
let px
let scaling
let p8Pal
let p8Font

let ps = new PixelSphere(size)
let grid = new Grid(ps.diameter * 2, ps.diameter, 0)

function preload() {
    p8Font = loadFont("PICO-8_mono_upper.ttf") // https://www.lexaloffle.com/bbs/?tid=3760
}

function setup() {
    const minScale = 1
    scaling = Math.floor(Math.max(Math.min(windowWidth / w, (windowHeight - 485) / h), minScale)) // 最低倍率をminScale倍として、スクロールしないで画面に収まる最大倍率 
    const canvas = createCanvas(w * scaling, h * scaling)
    canvas.parent("canvas")
    px = createGraphics(w, h)
    noSmooth()

    setPalette()
    px.noStroke()
    px.textFont(p8Font, 5)
    px.textAlign(CENTER, TOP)
    px.fill(p8Pal.black)

    for (let x = 0; x < grid.width; x++) {
        for (let y = 0; y < grid.height; y++) {
            grid.set(x, y, Math.floor(x / grid.width * 360))
            // grid.set(x, y, Math.floor(noise(x * 0.05, y * 0.05) * 360))
        }
    }
}

function draw() {
    px.background(p8Pal.lightGray)
    px.loadPixels()
    {
        for (let x = 0; x < grid.width; x++) {
            for (let y = 0; y < grid.height; y++) {
                pSet(x, y + 7, color(`hsb(${grid.get((x + frameCount) % grid.width, y)}, 80%, 100%)`))
            }
        }

        for (let y = 0; y < ps.diameter; y++) {
            const sw = ps.getWidth(y)
            for (let x = 0; x < sw; x++) {
                pSet(x + ps.diameter - sw / 2, y + ps.diameter + 14,
                    color(`hsb(${grid.get((Math.floor(x * ps.diameter / sw) + ps.diameter / 2 + frameCount) % grid.width, y)}, 80%, 100%)`))
            }
        }
    }
    px.updatePixels()
    {
        px.text("plane", w / 2, 1)
        px.text("sphere", w / 2, grid.height + 8)
    }

    scale(scaling)
    image(px, 0, 0)

    // print(`fps: ${Math.floor(frameRate())}`)
}
