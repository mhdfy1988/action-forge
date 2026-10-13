/*! Culori license
MIT License

Copyright (c) 2018 Dan Burzo

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

// node_modules/culori/src/_prepare.js
var prepare = (color, mode) => color === void 0 ? void 0 : typeof color !== "object" ? parse_default(color) : color.mode !== void 0 ? color : mode ? { ...color, mode } : void 0;
var prepare_default = prepare;

// node_modules/culori/src/converter.js
var converter = (target_mode = "rgb") => (color) => (color = prepare_default(color, target_mode)) !== void 0 ? (
  // if the color's mode corresponds to our target mode
  color.mode === target_mode ? (
    // then just return the color
    color
  ) : (
    // otherwise check to see if we have a dedicated
    // converter for the target mode
    converters[color.mode][target_mode] ? (
      // and return its result...
      converters[color.mode][target_mode](color)
    ) : (
      // ...otherwise pass through RGB as an intermediary step.
      // if the target mode is RGB...
      target_mode === "rgb" ? (
        // just return the RGB
        converters[color.mode].rgb(color)
      ) : (
        // otherwise convert color.mode -> RGB -> target_mode
        converters.rgb[target_mode](converters[color.mode].rgb(color))
      )
    )
  )
) : void 0;
var converter_default = converter;

// node_modules/culori/src/modes.js
var converters = {};
var modes = {};
var parsers = [];
var colorProfiles = {};
var getMode = (mode) => modes[mode];

// node_modules/culori/src/parse.js
var IdentStartCodePoint = /[^\x00-\x7F]|[a-zA-Z_]/;
var IdentCodePoint = /[^\x00-\x7F]|[-\w]/;
var Tok = {
  Function: "function",
  Ident: "ident",
  Number: "number",
  Percentage: "percentage",
  ParenClose: ")",
  None: "none",
  Hue: "hue",
  Alpha: "alpha"
};
var _i = 0;
function is_num(chars) {
  let ch = chars[_i];
  let ch1 = chars[_i + 1];
  if (ch === "-" || ch === "+") {
    return /\d/.test(ch1) || ch1 === "." && /\d/.test(chars[_i + 2]);
  }
  if (ch === ".") {
    return /\d/.test(ch1);
  }
  return /\d/.test(ch);
}
function is_ident(chars) {
  if (_i >= chars.length) {
    return false;
  }
  let ch = chars[_i];
  if (IdentStartCodePoint.test(ch)) {
    return true;
  }
  if (ch === "-") {
    if (chars.length - _i < 2) {
      return false;
    }
    let ch1 = chars[_i + 1];
    if (ch1 === "-" || IdentStartCodePoint.test(ch1)) {
      return true;
    }
    return false;
  }
  return false;
}
var huenits = {
  deg: 1,
  rad: 180 / Math.PI,
  grad: 9 / 10,
  turn: 360
};
function num(chars) {
  let value = "";
  if (chars[_i] === "-" || chars[_i] === "+") {
    value += chars[_i++];
  }
  value += digits(chars);
  if (chars[_i] === "." && /\d/.test(chars[_i + 1])) {
    value += chars[_i++] + digits(chars);
  }
  if (chars[_i] === "e" || chars[_i] === "E") {
    if ((chars[_i + 1] === "-" || chars[_i + 1] === "+") && /\d/.test(chars[_i + 2])) {
      value += chars[_i++] + chars[_i++] + digits(chars);
    } else if (/\d/.test(chars[_i + 1])) {
      value += chars[_i++] + digits(chars);
    }
  }
  if (is_ident(chars)) {
    let id = ident(chars);
    if (id === "deg" || id === "rad" || id === "turn" || id === "grad") {
      return { type: Tok.Hue, value: value * huenits[id] };
    }
    return void 0;
  }
  if (chars[_i] === "%") {
    _i++;
    return { type: Tok.Percentage, value: +value };
  }
  return { type: Tok.Number, value: +value };
}
function digits(chars) {
  let v = "";
  while (/\d/.test(chars[_i])) {
    v += chars[_i++];
  }
  return v;
}
function ident(chars) {
  let v = "";
  while (_i < chars.length && IdentCodePoint.test(chars[_i])) {
    v += chars[_i++];
  }
  return v;
}
function identlike(chars) {
  let v = ident(chars);
  if (chars[_i] === "(") {
    _i++;
    return { type: Tok.Function, value: v };
  }
  if (v === "none") {
    return { type: Tok.None, value: void 0 };
  }
  return { type: Tok.Ident, value: v };
}
function tokenize(str = "") {
  let chars = str.trim();
  let tokens = [];
  let ch;
  _i = 0;
  while (_i < chars.length) {
    ch = chars[_i++];
    if (ch === "\n" || ch === "	" || ch === " ") {
      while (_i < chars.length && (chars[_i] === "\n" || chars[_i] === "	" || chars[_i] === " ")) {
        _i++;
      }
      continue;
    }
    if (ch === ",") {
      return void 0;
    }
    if (ch === ")") {
      tokens.push({ type: Tok.ParenClose });
      continue;
    }
    if (ch === "+") {
      _i--;
      if (is_num(chars)) {
        tokens.push(num(chars));
        continue;
      }
      return void 0;
    }
    if (ch === "-") {
      _i--;
      if (is_num(chars)) {
        tokens.push(num(chars));
        continue;
      }
      if (is_ident(chars)) {
        tokens.push({ type: Tok.Ident, value: ident(chars) });
        continue;
      }
      return void 0;
    }
    if (ch === ".") {
      _i--;
      if (is_num(chars)) {
        tokens.push(num(chars));
        continue;
      }
      return void 0;
    }
    if (ch === "/") {
      while (_i < chars.length && (chars[_i] === "\n" || chars[_i] === "	" || chars[_i] === " ")) {
        _i++;
      }
      let alpha;
      if (is_num(chars)) {
        alpha = num(chars);
        if (alpha.type !== Tok.Hue) {
          tokens.push({ type: Tok.Alpha, value: alpha });
          continue;
        }
      }
      if (is_ident(chars)) {
        if (ident(chars) === "none") {
          tokens.push({
            type: Tok.Alpha,
            value: { type: Tok.None, value: void 0 }
          });
          continue;
        }
      }
      return void 0;
    }
    if (/\d/.test(ch)) {
      _i--;
      tokens.push(num(chars));
      continue;
    }
    if (IdentStartCodePoint.test(ch)) {
      _i--;
      tokens.push(identlike(chars));
      continue;
    }
    return void 0;
  }
  return tokens;
}
function parseColorSyntax(tokens) {
  tokens._i = 0;
  let token = tokens[tokens._i++];
  if (!token || token.type !== Tok.Function || token.value !== "color") {
    return void 0;
  }
  token = tokens[tokens._i++];
  if (token.type !== Tok.Ident) {
    return void 0;
  }
  const mode = colorProfiles[token.value];
  if (!mode) {
    return void 0;
  }
  const res = { mode };
  const coords = consumeCoords(tokens, false);
  if (!coords) {
    return void 0;
  }
  const channels = getMode(mode).channels;
  for (let ii = 0, c, ch; ii < channels.length; ii++) {
    c = coords[ii];
    ch = channels[ii];
    if (c.type !== Tok.None) {
      res[ch] = c.type === Tok.Number ? c.value : c.value / 100;
      if (ch === "alpha") {
        res[ch] = Math.max(0, Math.min(1, res[ch]));
      }
    }
  }
  return res;
}
function consumeCoords(tokens, includeHue) {
  const coords = [];
  let token;
  while (tokens._i < tokens.length) {
    token = tokens[tokens._i++];
    if (token.type === Tok.None || token.type === Tok.Number || token.type === Tok.Alpha || token.type === Tok.Percentage || includeHue && token.type === Tok.Hue) {
      coords.push(token);
      continue;
    }
    if (token.type === Tok.ParenClose) {
      if (tokens._i < tokens.length) {
        return void 0;
      }
      continue;
    }
    return void 0;
  }
  if (coords.length < 3 || coords.length > 4) {
    return void 0;
  }
  if (coords.length === 4) {
    if (coords[3].type !== Tok.Alpha) {
      return void 0;
    }
    coords[3] = coords[3].value;
  }
  if (coords.length === 3) {
    coords.push({ type: Tok.None, value: void 0 });
  }
  return coords.every((c) => c.type !== Tok.Alpha) ? coords : void 0;
}
function parseModernSyntax(tokens, includeHue) {
  tokens._i = 0;
  let token = tokens[tokens._i++];
  if (!token || token.type !== Tok.Function) {
    return void 0;
  }
  let coords = consumeCoords(tokens, includeHue);
  if (!coords) {
    return void 0;
  }
  coords.unshift(token.value);
  return coords;
}
var parse = (color) => {
  if (typeof color !== "string") {
    return void 0;
  }
  const tokens = tokenize(color);
  const parsed = tokens ? parseModernSyntax(tokens, true) : void 0;
  let result = void 0;
  let i = 0;
  let len = parsers.length;
  while (i < len) {
    if ((result = parsers[i++](color, parsed)) !== void 0) {
      return result;
    }
  }
  return tokens ? parseColorSyntax(tokens) : void 0;
};
var parse_default = parse;

// node_modules/culori/src/lrgb/convertRgbToLrgb.js
var fn = (c = 0) => {
  const abs = Math.abs(c);
  if (abs <= 0.04045) {
    return c / 12.92;
  }
  return (Math.sign(c) || 1) * Math.pow((abs + 0.055) / 1.055, 2.4);
};
var convertRgbToLrgb = ({ r, g, b, alpha }) => {
  let res = {
    mode: "lrgb",
    r: fn(r),
    g: fn(g),
    b: fn(b)
  };
  if (alpha !== void 0) res.alpha = alpha;
  return res;
};
var convertRgbToLrgb_default = convertRgbToLrgb;

// node_modules/culori/src/xyz65/convertRgbToXyz65.js
var convertRgbToXyz65 = (rgb) => {
  let { r, g, b, alpha } = convertRgbToLrgb_default(rgb);
  let res = {
    mode: "xyz65",
    x: 0.4123907992659593 * r + 0.357584339383878 * g + 0.1804807884018343 * b,
    y: 0.2126390058715102 * r + 0.715168678767756 * g + 0.0721923153607337 * b,
    z: 0.0193308187155918 * r + 0.119194779794626 * g + 0.9505321522496607 * b
  };
  if (alpha !== void 0) {
    res.alpha = alpha;
  }
  return res;
};
var convertRgbToXyz65_default = convertRgbToXyz65;

// node_modules/culori/src/difference.js
var differenceCiede2000 = (Kl = 1, Kc = 1, Kh = 1) => {
  let lab = converter_default("lab65");
  return (std, smp) => {
    let LabStd = lab(std);
    let LabSmp = lab(smp);
    let lStd = LabStd.l;
    let aStd = LabStd.a;
    let bStd = LabStd.b;
    let cStd = Math.sqrt(aStd * aStd + bStd * bStd);
    let lSmp = LabSmp.l;
    let aSmp = LabSmp.a;
    let bSmp = LabSmp.b;
    let cSmp = Math.sqrt(aSmp * aSmp + bSmp * bSmp);
    let cAvg = (cStd + cSmp) / 2;
    let G = 0.5 * (1 - Math.sqrt(
      Math.pow(cAvg, 7) / (Math.pow(cAvg, 7) + Math.pow(25, 7))
    ));
    let apStd = aStd * (1 + G);
    let apSmp = aSmp * (1 + G);
    let cpStd = Math.sqrt(apStd * apStd + bStd * bStd);
    let cpSmp = Math.sqrt(apSmp * apSmp + bSmp * bSmp);
    let hpStd = Math.abs(apStd) + Math.abs(bStd) === 0 ? 0 : Math.atan2(bStd, apStd);
    hpStd += (hpStd < 0) * 2 * Math.PI;
    let hpSmp = Math.abs(apSmp) + Math.abs(bSmp) === 0 ? 0 : Math.atan2(bSmp, apSmp);
    hpSmp += (hpSmp < 0) * 2 * Math.PI;
    let dL = lSmp - lStd;
    let dC = cpSmp - cpStd;
    let dhp = cpStd * cpSmp === 0 ? 0 : hpSmp - hpStd;
    dhp -= (dhp > Math.PI) * 2 * Math.PI;
    dhp += (dhp < -Math.PI) * 2 * Math.PI;
    let dH = 2 * Math.sqrt(cpStd * cpSmp) * Math.sin(dhp / 2);
    let Lp = (lStd + lSmp) / 2;
    let Cp = (cpStd + cpSmp) / 2;
    let hp;
    if (cpStd * cpSmp === 0) {
      hp = hpStd + hpSmp;
    } else {
      hp = (hpStd + hpSmp) / 2;
      hp -= (Math.abs(hpStd - hpSmp) > Math.PI) * Math.PI;
      hp += (hp < 0) * 2 * Math.PI;
    }
    let Lpm50 = Math.pow(Lp - 50, 2);
    let T = 1 - 0.17 * Math.cos(hp - Math.PI / 6) + 0.24 * Math.cos(2 * hp) + 0.32 * Math.cos(3 * hp + Math.PI / 30) - 0.2 * Math.cos(4 * hp - 63 * Math.PI / 180);
    let Sl = 1 + 0.015 * Lpm50 / Math.sqrt(20 + Lpm50);
    let Sc = 1 + 0.045 * Cp;
    let Sh = 1 + 0.015 * Cp * T;
    let deltaTheta = 30 * Math.PI / 180 * Math.exp(-1 * Math.pow((180 / Math.PI * hp - 275) / 25, 2));
    let Rc = 2 * Math.sqrt(Math.pow(Cp, 7) / (Math.pow(Cp, 7) + Math.pow(25, 7)));
    let Rt = -1 * Math.sin(2 * deltaTheta) * Rc;
    return Math.sqrt(
      Math.pow(dL / (Kl * Sl), 2) + Math.pow(dC / (Kc * Sc), 2) + Math.pow(dH / (Kh * Sh), 2) + Rt * dC / (Kc * Sc) * dH / (Kh * Sh)
    );
  };
};

// node_modules/culori/src/xyz65/constants.js
var k = Math.pow(29, 3) / Math.pow(3, 3);
var e = Math.pow(6, 3) / Math.pow(29, 3);

// node_modules/culori/src/constants.js
var D50 = {
  X: 0.3457 / 0.3585,
  Y: 1,
  Z: (1 - 0.3457 - 0.3585) / 0.3585
};
var D65 = {
  X: 0.3127 / 0.329,
  Y: 1,
  Z: (1 - 0.3127 - 0.329) / 0.329
};
var k2 = Math.pow(29, 3) / Math.pow(3, 3);
var e2 = Math.pow(6, 3) / Math.pow(29, 3);

// node_modules/culori/src/lab65/convertXyz65ToLab65.js
var f = (value) => value > e ? Math.cbrt(value) : (k * value + 16) / 116;
var convertXyz65ToLab65 = ({ x, y, z, alpha }) => {
  if (x === void 0) x = 0;
  if (y === void 0) y = 0;
  if (z === void 0) z = 0;
  let f0 = f(x / D65.X);
  let f1 = f(y / D65.Y);
  let f2 = f(z / D65.Z);
  let res = {
    mode: "lab65",
    l: 116 * f1 - 16,
    a: 500 * (f0 - f1),
    b: 200 * (f1 - f2)
  };
  if (alpha !== void 0) {
    res.alpha = alpha;
  }
  return res;
};
var convertXyz65ToLab65_default = convertXyz65ToLab65;

// node_modules/culori/src/lab65/convertRgbToLab65.js
var convertRgbToLab65 = (rgb) => {
  let res = convertXyz65ToLab65_default(convertRgbToXyz65_default(rgb));
  if (rgb.r === rgb.b && rgb.b === rgb.g) {
    res.a = res.b = 0;
  }
  return res;
};
var convertRgbToLab65_default = convertRgbToLab65;

// web/src/color-distance.js
function seedColorDistance(r, g, b) {
  const seed = convertRgbToLab65_default({ r: r / 255, g: g / 255, b: b / 255 });
  const delta = differenceCiede2000();
  const cache = /* @__PURE__ */ new Map();
  return (red, green, blue) => {
    const key = red << 16 | green << 8 | blue;
    let distance = cache.get(key);
    if (distance !== void 0) return distance;
    const color = convertRgbToLab65_default({ r: red / 255, g: green / 255, b: blue / 255 });
    distance = Math.min(255, delta(seed, color) * 2.55);
    if (cache.size < 65536) cache.set(key, distance);
    return distance;
  };
}

// web/src/editor.js
var HISTORY_LIMIT = 128 * 1024 * 1024;
var MAX_PIXELS = 12e6;
var clamp = (v, low, high) => Math.max(low, Math.min(high, v));
function connectedMask(source, width, height, x, y, tolerance, smooth = false) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || source.length !== width * height * 4 || width * height > MAX_PIXELS || !Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(tolerance) || tolerance < 0 || tolerance > 255) throw new Error("\u9B54\u6CD5\u68D2\u8F93\u5165\u4E0D\u5408\u6CD5");
  const n = width * height, sx = Math.floor(x), sy = Math.floor(y);
  if (sx < 0 || sy < 0 || sx >= width || sy >= height) throw new Error("\u70B9\u51FB\u8D85\u51FA\u56FE\u7247");
  const seed = sy * width + sx, color = source.subarray(seed * 4, seed * 4 + 3), mask = new Uint8Array(n);
  if (!source[seed * 4 + 3]) return mask;
  const distance = seedColorDistance(...color);
  const difference = (i) => distance(source[i * 4], source[i * 4 + 1], source[i * 4 + 2]);
  const visited = new Uint8Array(n), queue = new Uint32Array(n);
  let head = 0, tail = 0;
  const accepts = (i) => source[i * 4 + 3] > 0 && difference(i) <= tolerance;
  const add = (i) => {
    if (!visited[i]) {
      visited[i] = 1;
      if (accepts(i)) {
        mask[i] = 255;
        queue[tail++] = i;
      }
    }
  };
  add(seed);
  while (head < tail) {
    const i = queue[head++], col = i % width;
    if (col > 0) add(i - 1);
    if (col < width - 1) add(i + 1);
    if (i >= width) add(i - width);
    if (i < n - width) add(i + width);
  }
  if (smooth && tolerance > 0 && tolerance < 255) {
    const band = Math.max(1, tolerance * 0.25);
    const soften = (i) => {
      if (mask[i] === 255 || !source[i * 4 + 3]) return;
      const t = clamp((tolerance + band - difference(i)) / band, 0, 1);
      if (t > 0) mask[i] = Math.round(255 * t * t * (3 - 2 * t));
    };
    for (let k3 = 0; k3 < tail; k3++) {
      const i = queue[k3], col = i % width;
      if (col > 0) soften(i - 1);
      if (col < width - 1) soften(i + 1);
      if (i >= width) soften(i - width);
      if (i < n - width) soften(i + width);
    }
  }
  return mask;
}
export {
  connectedMask,
  seedColorDistance
};
