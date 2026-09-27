/* =========================================================
   Velvet curtain — rendered with a WebGL fragment shader.
   Each panel is shaded from a procedural fold profile; as the
   curtain opens the folds gather and deepen, the hem lags behind
   the rod on a spring and swings before settling.
   Falls back to the CSS panels if WebGL is unavailable.
   ========================================================= */
(() => {
  "use strict";

  const curtain = document.getElementById("curtain");
  const canvas = document.createElement("canvas");
  canvas.className = "curtain__canvas";
  const gl =
    canvas.getContext("webgl", { premultipliedAlpha: true, antialias: false }) ||
    canvas.getContext("experimental-webgl");

  if (!gl) {
    window.VelvetCurtain = { open() {}, stop() {} };
    return;
  }

  curtain.prepend(canvas);
  curtain.classList.add("has-gl");

  const VERT = `
    attribute vec2 aPos;
    void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
  `;

  const FRAG = `
    precision highp float;
    uniform vec2  uRes;
    uniform float uTime;
    uniform float uTopE;   // inner edge of each panel at the rod (fraction of screen width)
    uniform float uBotE;   // inner edge at the hem (lags behind on a spring)
    uniform float uLift;   // valance lift while opening

    const float PI = 3.14159265;
    const float CLOSED = 0.505;

    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
                 mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
    }

    // velvet: dark where the pile faces you, bright sheen at grazing angles
    vec3 velvet(vec3 n, float ao, float grain) {
      vec3 deep  = vec3(0.004, 0.050, 0.034);
      vec3 base  = vec3(0.020, 0.270, 0.185);
      vec3 sheen = vec3(0.300, 0.720, 0.540);
      vec3 L = normalize(vec3(-0.35, 0.45, 0.85));
      float diff = max(dot(n, L), 0.0);
      float rim = pow(1.0 - clamp(n.z, 0.0, 1.0), 2.2);
      vec3 c = mix(deep, base, diff * ao);
      c += sheen * rim * 0.55 * ao;
      c *= 0.9 + 0.12 * grain;
      return c;
    }

    void main() {
      float px = 1.0 / uRes.x;
      float py = 1.0 / uRes.y;
      float x = gl_FragCoord.x * px;
      float y = 1.0 - gl_FragCoord.y * py;          // 0 at the top
      float aspect = uRes.x / uRes.y;

      // ---------- panels (right panel is the mirror of the left) ----------
      bool right = x > 0.5;
      float xl = right ? 1.0 - x : x;
      float seed = right ? 1.73 : 0.0;

      float t = pow(y, 1.5);
      float e = mix(uTopE, uBotE, t);
      e += 0.0035 * sin(uTime * 0.7 + seed) * t;    // a faint draft

      float gather = clamp(1.0 - e / CLOSED, 0.0, 1.0);
      float u = xl / e;                             // 0 = outer edge, 1 = inner edge
      float N = 10.0;
      float w = N * 2.0 * PI;
      // irregular fold widths, like real hung fabric
      float uw = u + 0.022 * sin(u * 7.3 + seed * 3.0) + 0.012 * sin(u * 17.0 + seed);
      float ph = uw * w + seed
               + 0.45 * sin(y * 2.6 + u * 4.0 + seed)
               + 0.12 * sin(uTime * 0.5 + u * 7.0) * t;

      float h  = 0.62 * sin(ph) + 0.24 * sin(ph * 2.03 + 1.3 + y * 1.7) + 0.14 * sin(ph * 0.47 + 2.0);
      float dh = (0.62 * cos(ph) + 0.24 * 2.03 * cos(ph * 2.03 + 1.3 + y * 1.7)
                + 0.14 * 0.47 * cos(ph * 0.47 + 2.0)) * w;

      // gathered fabric folds deeper, and folds flare toward the floor
      float depth = mix(0.0045, 0.009, gather) * (0.75 + 0.5 * y);
      float slope = depth * dh / max(e, 0.02) * aspect * 0.55;
      if (right) slope = -slope;
      vec3 n = normalize(vec3(-slope, 0.12 * sin(ph) * t, 1.0));

      float ao = smoothstep(-1.1, 0.9, h) * 0.85 + 0.15;
      float grain = noise(vec2(u * 90.0 + seed * 10.0, y * 520.0)) * 0.7
                  + noise(vec2(x * 900.0, y * 900.0)) * 0.3;
      vec3 col = velvet(n, ao, grain);

      // turned-back hem on the inner edge catches light
      float edgeDist = e - xl;
      col += vec3(0.20, 0.55, 0.42) * 0.22 * (1.0 - smoothstep(0.0, 7.0 * px, edgeDist));
      col *= 0.55 + 0.45 * smoothstep(0.0, 1.8 * px, edgeDist);

      // centre seam while closed
      col *= 1.0 - 0.55 * exp(-abs(x - 0.5) * uRes.x / 3.0) * (1.0 - gather);

      // stage light, darker under the valance and toward the floor
      float spot = exp(-((x - 0.5) * (x - 0.5) * 2.2 + (y - 0.32) * (y - 0.32) * 2.6));
      col *= 0.45 + 0.75 * spot;
      col *= 1.0 - 0.35 * smoothstep(0.72, 1.0, y);

      float inside = smoothstep(-px, px, edgeDist);
      float shadow = 0.38 * exp(edgeDist / 0.025);   // cast onto the stage behind
      float a = inside + (1.0 - inside) * shadow;
      vec3 outCol = col * inside;

      // ---------- swagged valance with an ivory cord ----------
      float vy = y + uLift;
      float k = max(3.0, floor(aspect * 3.0 + 0.5));
      float s = fract(x * k);
      float swag = 0.034 * sin(PI * s);
      float bottom = 0.062 + swag;
      float q = clamp(vy / bottom, 0.0, 1.0);

      float vShadow = 1.0 - 0.55 * exp(-max(vy - bottom, 0.0) / 0.018);
      outCol *= vShadow;
      a = max(a, (1.0 - vShadow) * 0.9 * step(bottom, vy));

      if (vy < bottom + 2.0 * py) {
        float vph = q * 5.0 * 2.0 * PI - 0.6 * sin(PI * s);
        vec3 vn = normalize(vec3(cos(PI * s) * 0.9 * q, -cos(vph) * 0.9, 1.0));
        float vao = 0.55 + 0.45 * (0.5 + 0.5 * sin(vph));
        vec3 vc = velvet(vn, vao, noise(vec2(x * 700.0, vy * 300.0)));
        vc *= 0.55 + 0.6 * spot;

        // ivory cord along the swag
        float cordD = (bottom - vy) * uRes.y;
        float cord = 1.0 - smoothstep(3.0, 5.0, cordD);
        float cordShade = 0.6 + 0.4 * sin(cordD * 1.2 + x * uRes.x * 0.6);
        vc = mix(vc, vec3(0.96, 0.93, 0.86) * cordShade, cord * step(0.0, cordD));

        float vin = smoothstep(-py, py, bottom - vy);
        outCol = mix(outCol, vc, vin);
        a = mix(a, 1.0, vin);
      }

      gl_FragColor = vec4(outCol, a);
    }
  `;

  function compile(type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(sh));
    }
    return sh;
  }

  let prog;
  try {
    prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  } catch (err) {
    console.warn("Curtain shader failed, using CSS fallback", err);
    canvas.remove();
    curtain.classList.remove("has-gl");
    window.VelvetCurtain = { open() {}, stop() {} };
    return;
  }

  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, "aPos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const U = {};
  ["uRes", "uTime", "uTopE", "uBotE", "uLift"].forEach((n) => (U[n] = gl.getUniformLocation(prog, n)));

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  resize();
  window.addEventListener("resize", resize);

  // ---------- motion ----------
  const CLOSED = 0.505;
  const OPEN = 0.09;
  const OPEN_MS = 2600;
  const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);

  let topE = CLOSED;
  let botE = CLOSED;
  let botV = 0;
  let lift = 0;
  let openedAt = null;
  let last = performance.now();
  let raf = 0;

  function frame(now) {
    const dt = Math.min((now - last) / 1000, 1 / 30);
    last = now;

    if (openedAt !== null) {
      const p = Math.min((now - openedAt) / OPEN_MS, 1);
      topE = CLOSED + (OPEN - CLOSED) * easeInOut(p);
      const lp = Math.min(Math.max((now - openedAt - 900) / 1500, 0), 1);
      lift = 0.2 * easeInOut(lp);
    }

    // the hem follows the rod on an under-damped spring, so it trails and swings
    const k = 38;
    const c = 6.5;
    botV += (k * (topE - botE) - c * botV) * dt;
    botE += botV * dt;

    gl.uniform2f(U.uRes, canvas.width, canvas.height);
    gl.uniform1f(U.uTime, now / 1000);
    gl.uniform1f(U.uTopE, topE);
    gl.uniform1f(U.uBotE, botE);
    gl.uniform1f(U.uLift, lift);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  window.VelvetCurtain = {
    open() {
      if (openedAt === null) openedAt = performance.now();
    },
    stop() {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    },
  };
})();
