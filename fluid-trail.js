/* ═══════════════════════════════════════════════════════════════════════
   FLUID TRAIL — BeyondTheBugs
   ───────────────────────────────────────────────────────────────────────
   A WebGL fluid simulation running behind the page content. Moving the
   cursor injects colour and velocity into the field; the colour is then
   carried along by the flow, swirled by vorticity, and slowly dissipates
   — ink dropped into water.

   HOW IT WORKS
   Two fields are held in textures and updated every frame:

     velocity — which way the fluid is moving at each point
     dye      — the visible colour being carried around

   Each frame:
     1. curl + vorticity   spin is measured and fed back in, which is what
                           produces swirls rather than a plain smear
     2. advection          every point looks backwards along the velocity
                           field and samples what was there a moment ago
     3. dissipation        both fields fade slightly so the screen clears

   Pressure projection (the incompressibility step of a full Navier-Stokes
   solver) is deliberately omitted. It is the most expensive part and for a
   decorative background the difference is not worth the frame budget.

   Rendering happens at half resolution for the simulation and quarter for
   the velocity field, then upscaled — standard practice, and invisible for
   a soft smoky effect.

   Skipped entirely on touch devices, for reduced-motion users, and on any
   browser without float texture support.
   ═══════════════════════════════════════════════════════════════════════ */
(function fluidTrail() {
    'use strict';

    if (window.matchMedia('(hover: none)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // ── Tuning ────────────────────────────────────────────────────────
    const CONFIG = {
        SIM_RES:          128,    // velocity field resolution
        DYE_RES:          512,    // colour field resolution
        VELOCITY_DISSIPATION: 0.94,
        DENSITY_DISSIPATION:  0.965, // higher = trail lingers longer
        VORTICITY:        22,     // swirl strength
        SPLAT_RADIUS:     0.0022,
        SPLAT_FORCE:      5200,
        OPACITY:          0.55    // keeps text readable underneath
    };

    // ── Canvas ────────────────────────────────────────────────────────
    const canvas = document.createElement('canvas');
    canvas.id = 'fluidTrail';
    canvas.style.cssText =
        'position:fixed;top:0;left:0;width:100%;height:100%;' +
        'pointer-events:none;' +            // never intercepts a click
        'z-index:-1;' +                     // behind all page content
        'opacity:' + CONFIG.OPACITY + ';';

    const gl2 = canvas.getContext('webgl2', { alpha: true, antialias: false });
    const gl  = gl2 || canvas.getContext('webgl', { alpha: true, antialias: false })
                    || canvas.getContext('experimental-webgl');
    if (!gl) return;                        // no WebGL at all — bail quietly

    const isWebGL2 = !!gl2;

    // Float textures are required to hold velocity. Without them there is
    // no sensible fallback, so the effect simply does not run.
    let halfFloat, texType, internalRGBA, internalRG, formatRG;
    if (isWebGL2) {
        if (!gl.getExtension('EXT_color_buffer_float')) return;
        gl.getExtension('OES_texture_float_linear');
        texType      = gl.HALF_FLOAT;
        internalRGBA = gl.RGBA16F;
        internalRG   = gl.RG16F;
        formatRG     = gl.RG;
    } else {
        halfFloat = gl.getExtension('OES_texture_half_float');
        if (!halfFloat) return;
        gl.getExtension('OES_texture_half_float_linear');
        texType      = halfFloat.HALF_FLOAT_OES;
        internalRGBA = gl.RGBA;
        internalRG   = gl.RGBA;
        formatRG     = gl.RGBA;
    }

    document.addEventListener('DOMContentLoaded', () => {
        document.body.appendChild(canvas);
    });
    if (document.readyState !== 'loading') document.body.appendChild(canvas);

    // ── Shader plumbing ───────────────────────────────────────────────
    function compile(type, source) {
        const s = gl.createShader(type);
        gl.shaderSource(s, (isWebGL2 ? '#version 300 es\n' : '') + source);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
            console.warn('fluid-trail shader:', gl.getShaderInfoLog(s));
            return null;
        }
        return s;
    }

    // WebGL1 and WebGL2 use different keywords for the same thing.
    const HEAD = isWebGL2
        ? `precision highp float; precision highp sampler2D;
           #define varying in
           #define texture2D texture
           out vec4 fragColour;
           #define gl_FragColor fragColour`
        : `precision highp float; precision mediump sampler2D;`;

    const VERT_HEAD = isWebGL2
        ? `#define attribute in
           #define varying out`
        : ``;

    function program(fragSource) {
        const p = gl.createProgram();
        gl.attachShader(p, compile(gl.VERTEX_SHADER, VERT_HEAD + BASE_VERT));
        gl.attachShader(p, compile(gl.FRAGMENT_SHADER, HEAD + fragSource));
        gl.linkProgram(p);
        if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
            console.warn('fluid-trail link:', gl.getProgramInfoLog(p));
            return null;
        }
        // Cache uniform locations by name.
        const uniforms = {};
        const count = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
        for (let i = 0; i < count; i++) {
            const name = gl.getActiveUniform(p, i).name;
            uniforms[name] = gl.getUniformLocation(p, name);
        }
        return { handle: p, uniforms };
    }

    const BASE_VERT = `
        precision highp float;
        attribute vec2 aPosition;
        varying vec2 vUv;
        varying vec2 vL;
        varying vec2 vR;
        varying vec2 vT;
        varying vec2 vB;
        uniform vec2 texelSize;
        void main () {
            vUv = aPosition * 0.5 + 0.5;
            vL = vUv - vec2(texelSize.x, 0.0);
            vR = vUv + vec2(texelSize.x, 0.0);
            vT = vUv + vec2(0.0, texelSize.y);
            vB = vUv - vec2(0.0, texelSize.y);
            gl_Position = vec4(aPosition, 0.0, 1.0);
        }`;

    // Draws one texture straight to the screen.
    const displayShader = program(`
        varying vec2 vUv;
        uniform sampler2D uTexture;
        void main () {
            vec3 c = texture2D(uTexture, vUv).rgb;
            // Alpha follows brightness so black areas stay fully transparent
            // and the page shows through cleanly.
            float a = max(c.r, max(c.g, c.b));
            gl_FragColor = vec4(c, a);
        }`);

    // Injects colour or force in a soft circle at the cursor.
    const splatShader = program(`
        varying vec2 vUv;
        uniform sampler2D uTarget;
        uniform float aspectRatio;
        uniform vec3 colour;
        uniform vec2 point;
        uniform float radius;
        void main () {
            vec2 p = vUv - point.xy;
            p.x *= aspectRatio;
            vec3 splat = exp(-dot(p, p) / radius) * colour;
            vec3 base = texture2D(uTarget, vUv).xyz;
            gl_FragColor = vec4(base + splat, 1.0);
        }`);

    // Moves a quantity along the velocity field by sampling backwards.
    const advectionShader = program(`
        varying vec2 vUv;
        uniform sampler2D uVelocity;
        uniform sampler2D uSource;
        uniform vec2 texelSize;
        uniform float dt;
        uniform float dissipation;
        void main () {
            vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
            gl_FragColor = dissipation * texture2D(uSource, coord);
            gl_FragColor.a = 1.0;
        }`);

    // Measures rotation in the velocity field.
    const curlShader = program(`
        varying vec2 vL; varying vec2 vR; varying vec2 vT; varying vec2 vB;
        uniform sampler2D uVelocity;
        void main () {
            float L = texture2D(uVelocity, vL).y;
            float R = texture2D(uVelocity, vR).y;
            float T = texture2D(uVelocity, vT).x;
            float B = texture2D(uVelocity, vB).x;
            gl_FragColor = vec4(0.5 * (R - L - T + B), 0.0, 0.0, 1.0);
        }`);

    // Feeds that rotation back in — this is what makes it swirl rather
    // than just smear outward.
    const vorticityShader = program(`
        varying vec2 vUv; varying vec2 vL; varying vec2 vR;
        varying vec2 vT; varying vec2 vB;
        uniform sampler2D uVelocity;
        uniform sampler2D uCurl;
        uniform float curl;
        uniform float dt;
        void main () {
            float L = texture2D(uCurl, vL).x;
            float R = texture2D(uCurl, vR).x;
            float T = texture2D(uCurl, vT).x;
            float B = texture2D(uCurl, vB).x;
            float C = texture2D(uCurl, vUv).x;

            vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
            force /= length(force) + 0.0001;
            force *= curl * C;
            force.y *= -1.0;

            vec2 velocity = texture2D(uVelocity, vUv).xy + force * dt;
            velocity = clamp(velocity, -1000.0, 1000.0);
            gl_FragColor = vec4(velocity, 0.0, 1.0);
        }`);

    if (!displayShader || !splatShader || !advectionShader ||
        !curlShader || !vorticityShader) return;

    // ── Full-screen quad ──────────────────────────────────────────────
    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, -1,1, 1,1, 1,-1]), gl.STATIC_DRAW);
    const quadIndex = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, quadIndex);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0,1,2, 0,2,3]), gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);

    function blit(target) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.fbo : null);
        gl.viewport(0, 0,
            target ? target.width  : gl.drawingBufferWidth,
            target ? target.height : gl.drawingBufferHeight);
        gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    }

    // ── Render targets ────────────────────────────────────────────────
    function createFBO(w, h, internal, format, type, filter) {
        gl.activeTexture(gl.TEXTURE0);
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, internal, w, h, 0, format, type, null);

        const fbo = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);

        return {
            texture, fbo, width: w, height: h,
            texelSizeX: 1 / w, texelSizeY: 1 / h,
            attach(id) {
                gl.activeTexture(gl.TEXTURE0 + id);
                gl.bindTexture(gl.TEXTURE_2D, texture);
                return id;
            }
        };
    }

    // "Double" targets are read from one and written to the other, then
    // swapped — a texture cannot be read and written in the same pass.
    function createDoubleFBO(w, h, internal, format, type, filter) {
        let fbo1 = createFBO(w, h, internal, format, type, filter);
        let fbo2 = createFBO(w, h, internal, format, type, filter);
        return {
            width: w, height: h,
            texelSizeX: 1 / w, texelSizeY: 1 / h,
            get read()  { return fbo1; },
            get write() { return fbo2; },
            swap() { const t = fbo1; fbo1 = fbo2; fbo2 = t; }
        };
    }

    const filtering = gl.LINEAR;
    let dye, velocity, curlFBO;

    function initFramebuffers() {
        const simRes = getResolution(CONFIG.SIM_RES);
        const dyeRes = getResolution(CONFIG.DYE_RES);
        dye      = createDoubleFBO(dyeRes.width, dyeRes.height, internalRGBA, gl.RGBA, texType, filtering);
        velocity = createDoubleFBO(simRes.width, simRes.height, internalRG, formatRG, texType, filtering);
        curlFBO  = createFBO(simRes.width, simRes.height, internalRG, formatRG, texType, gl.NEAREST);
    }

    function getResolution(resolution) {
        let aspect = gl.drawingBufferWidth / gl.drawingBufferHeight;
        if (aspect < 1) aspect = 1 / aspect;
        const min = Math.round(resolution);
        const max = Math.round(resolution * aspect);
        return gl.drawingBufferWidth > gl.drawingBufferHeight
            ? { width: max, height: min }
            : { width: min, height: max };
    }

    function resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 1.5); // cap for perf
        const w = Math.floor(window.innerWidth  * dpr);
        const h = Math.floor(window.innerHeight * dpr);
        if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
            initFramebuffers();
        }
    }

    canvas.width = Math.floor(window.innerWidth);
    canvas.height = Math.floor(window.innerHeight);
    initFramebuffers();
    window.addEventListener('resize', resize);

    // ── Pointer input ─────────────────────────────────────────────────
    const pointer = { x: 0, y: 0, dx: 0, dy: 0, moved: false, colour: [0, 0, 0] };

    // Greens drawn from the site palette, with a little variation so the
    // trail is not a flat single colour.
    function trailColour() {
        const shades = [
            [0.05, 0.62, 0.27],   // bootstrap success green
            [0.22, 1.00, 0.08],   // neon #39ff14
            [0.13, 0.77, 0.37]
        ];
        const c = shades[Math.floor(Math.random() * shades.length)];
        return [c[0] * 0.22, c[1] * 0.22, c[2] * 0.22];
    }

    window.addEventListener('mousemove', e => {
        const x = e.clientX / window.innerWidth;
        const y = 1 - e.clientY / window.innerHeight;   // GL origin is bottom-left
        pointer.dx = (x - pointer.x) * CONFIG.SPLAT_FORCE;
        pointer.dy = (y - pointer.y) * CONFIG.SPLAT_FORCE;
        pointer.x = x;
        pointer.y = y;
        pointer.moved = true;
        pointer.colour = trailColour();
    }, { passive: true });

    function splat(x, y, dx, dy, colour) {
        gl.useProgram(splatShader.handle);
        gl.uniform1i(splatShader.uniforms.uTarget, velocity.read.attach(0));
        gl.uniform1f(splatShader.uniforms.aspectRatio, canvas.width / canvas.height);
        gl.uniform2f(splatShader.uniforms.point, x, y);
        gl.uniform3f(splatShader.uniforms.colour, dx, dy, 0.0);
        gl.uniform1f(splatShader.uniforms.radius, CONFIG.SPLAT_RADIUS);
        blit(velocity.write);
        velocity.swap();

        gl.uniform1i(splatShader.uniforms.uTarget, dye.read.attach(0));
        gl.uniform3f(splatShader.uniforms.colour, colour[0], colour[1], colour[2]);
        blit(dye.write);
        dye.swap();
    }

    // ── Frame loop ────────────────────────────────────────────────────
    let lastTime = Date.now();

    function step(dt) {
        gl.disable(gl.BLEND);

        // Curl
        gl.useProgram(curlShader.handle);
        gl.uniform2f(curlShader.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
        gl.uniform1i(curlShader.uniforms.uVelocity, velocity.read.attach(0));
        blit(curlFBO);

        // Vorticity confinement
        gl.useProgram(vorticityShader.handle);
        gl.uniform2f(vorticityShader.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
        gl.uniform1i(vorticityShader.uniforms.uVelocity, velocity.read.attach(0));
        gl.uniform1i(vorticityShader.uniforms.uCurl, curlFBO.attach(1));
        gl.uniform1f(vorticityShader.uniforms.curl, CONFIG.VORTICITY);
        gl.uniform1f(vorticityShader.uniforms.dt, dt);
        blit(velocity.write);
        velocity.swap();

        // Velocity carries itself
        gl.useProgram(advectionShader.handle);
        gl.uniform2f(advectionShader.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
        const velId = velocity.read.attach(0);
        gl.uniform1i(advectionShader.uniforms.uVelocity, velId);
        gl.uniform1i(advectionShader.uniforms.uSource, velId);
        gl.uniform1f(advectionShader.uniforms.dt, dt);
        gl.uniform1f(advectionShader.uniforms.dissipation, CONFIG.VELOCITY_DISSIPATION);
        blit(velocity.write);
        velocity.swap();

        // Dye is carried by the velocity
        gl.uniform1i(advectionShader.uniforms.uVelocity, velocity.read.attach(0));
        gl.uniform1i(advectionShader.uniforms.uSource, dye.read.attach(1));
        gl.uniform1f(advectionShader.uniforms.dissipation, CONFIG.DENSITY_DISSIPATION);
        blit(dye.write);
        dye.swap();
    }

    function render() {
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.useProgram(displayShader.handle);
        gl.uniform1i(displayShader.uniforms.uTexture, dye.read.attach(0));
        blit(null);
    }

    function frame() {
        const now = Date.now();
        let dt = (now - lastTime) / 1000;
        dt = Math.min(dt, 0.016);           // clamp after a tab regains focus
        lastTime = now;

        resize();

        if (pointer.moved) {
            pointer.moved = false;
            splat(pointer.x, pointer.y, pointer.dx, pointer.dy, pointer.colour);
        }

        step(dt);
        render();
        requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
})();
