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

class Grid {
    #table
    constructor(width, height, init) {
        this.width = width
        this.height = height
        this.#table = new Array(this.width * this.height).fill(init)
    }
    set(x, y, val) {
        if (x < 0 || this.width <= x) {
            throw new RangeError(`The argument must be between x ${0} and ${this.width - 1}.`)
        } else if (y < 0 || this.height <= y) {
            throw new RangeError(`The argument must be between y ${0} and ${this.height - 1}.`)
        } else {
            this.#table[y * this.width + x] = val
        }
    }
    get(x, y) {
        if (0 <= x && x < this.width && 0 <= y && y < this.height) {
            return this.#table[y * this.width + x]
        } else {
            return undefined
        }
    }
}

class PixelSphere {
    #sphereWidth
    constructor(diameter) {
        this.diameter = diameter
        this.#sphereWidth = this._getSphereWidth()
    }

    _getSphereWidth() {
        // Reference: https://github.com/nesbox/TIC-80/blob/master/src/tic.c#L948-L961
        let sphereWidth = []
        const parity = 1 - this.diameter % 2
        let r = Math.floor(this.diameter / 2) - parity
        let y = -r
        let x = 0
        let d = 2 - 2 * r

        do {
            r = d
            if (r > y || d > x) {
                sphereWidth.push(x * 2 + 1 + parity)
                d += ++y * 2 + 1
            }
            if (r <= x) {
                d += ++x * 2 + 1
            }
        } while (y <= 0)
        return sphereWidth
    }

    getWidth(y) {
        if (y < 0 || this.diameter <= y) {
            throw new RangeError(`The argument must be between ${0} and ${this.diameter - 1}.`)
        }

        let index
        if (y < Math.floor(this.diameter / 2) + this.diameter % 2) {
            index = y
        } else {
            index = this.diameter - y - 1
        }
        return this.#sphereWidth[index]
    }
}
