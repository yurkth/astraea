function setPalette() {
    p8Pal = {
        black: color(0, 0, 0),
        darkBlue: color(29, 43, 83),
        darkPurple: color(126, 37, 83),
        darkGreen: color(0, 135, 81),
        brown: color(171, 82, 54),
        darkGray: color(95, 87, 79),
        lightGray: color(194, 195, 199),
        white: color(255, 241, 232),
        red: color(255, 0, 77),
        orange: color(255, 163, 0),
        yellow: color(255, 236, 39),
        green: color(0, 228, 54),
        blue: color(41, 173, 255),
        indigo: color(131, 118, 156),
        pink: color(255, 119, 168),
        peach: color(255, 204, 170)
    }
}

function pSet(x, y, c) {
    x = Math.floor(x)
    y = Math.floor(y)
    const index = (y * w + x) * 4
    px.pixels[index] = red(c)
    px.pixels[index + 1] = green(c)
    px.pixels[index + 2] = blue(c)
    px.pixels[index + 3] = alpha(c)
}

function pGet(x, y) {
    x = Math.floor(x)
    y = Math.floor(y)
    const index = (y * w + x) * 4
    const r = px.pixels[index]
    const g = px.pixels[index + 1]
    const b = px.pixels[index + 2]
    const a = px.pixels[index + 3]
    return color(r, g, b, a)
}
