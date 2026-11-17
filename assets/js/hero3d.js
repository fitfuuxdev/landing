(() => {
  'use strict';

  window.initFitfuuxHero3D = function initFitfuuxHero3D({ canvas, stage, reducedMotion = false }) {
    if (!window.THREE || !canvas || !stage || reducedMotion) return;

    const THREE = window.THREE;
    const isMobile = window.matchMedia('(max-width: 720px)').matches;
    const isTablet = window.matchMedia('(max-width: 1100px)').matches;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: !isMobile,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: false
      });
    } catch (error) {
      stage.classList.add('is-fallback');
      return;
    }

    renderer.setClearColor(0x000000, 0);
    if (THREE.SRGBColorSpace) renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    if ('useLegacyLights' in renderer) renderer.useLegacyLights = false;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, .1, 100);
    camera.position.set(0, 0, 9.2);

    const rootGroup = new THREE.Group();
    rootGroup.rotation.order = 'YXZ';
    scene.add(rootGroup);

    const sculpture = new THREE.Group();
    rootGroup.add(sculpture);

    /* ------------------------------------------------------------------
       Studio environment for believable metal reflections
    ------------------------------------------------------------------ */
    const createEnvironment = () => {
      const envScene = new THREE.Scene();
      envScene.background = new THREE.Color(0x030303);
      const plane = new THREE.PlaneGeometry(1, 1);
      const addPanel = (rgb, position, scale, rotation) => {
        const material = new THREE.MeshBasicMaterial({
          color: new THREE.Color(rgb[0], rgb[1], rgb[2]),
          side: THREE.DoubleSide
        });
        const mesh = new THREE.Mesh(plane, material);
        mesh.position.set(...position);
        mesh.scale.set(...scale);
        mesh.rotation.set(...rotation);
        envScene.add(mesh);
      };

      // Tall warm strip on the left — the main highlight
      addPanel([4.2, 2.9, 1.8], [-4.2, 1.4, 1.6], [1.1, 6.2, 1], [0, Math.PI / 2, 0]);
      // Cooler, dimmer strip on the right
      addPanel([1.15, 1.5, 1.8], [4.4, -.4, 2.3], [.8, 6.8, 1], [0, -Math.PI / 2, 0]);
      // Warm overhead bounce
      addPanel([2.1, 1.75, 1.35], [.6, 5.4, -.6], [6, 1.2, 1], [Math.PI / 2, 0, 0]);
      // Small hot spot to create a glint
      addPanel([5.5, 4.1, 2.6], [2.2, 3.0, 3.0], [.28, 2.4, 1], [0, -.35, 0]);
      // Floor bounce
      addPanel([.35, .25, .16], [0, -4.7, 0], [6, 5, 1], [-Math.PI / 2, 0, 0]);

      const pmrem = new THREE.PMREMGenerator(renderer);
      const renderTarget = pmrem.fromScene(envScene, .02, .1, 100);
      scene.environment = renderTarget.texture;

      envScene.traverse((object) => {
        if (object.isMesh) {
          object.geometry.dispose();
          object.material.dispose();
        }
      });
      pmrem.dispose();
      return renderTarget;
    };

    const environment = createEnvironment();

    /* ------------------------------------------------------------------
       Materials
    ------------------------------------------------------------------ */
    const obsidian = new THREE.MeshPhysicalMaterial({
      color: 0x11110f,
      metalness: .92,
      roughness: .19,
      clearcoat: .85,
      clearcoatRoughness: .08,
      envMapIntensity: 1.9,
      side: THREE.DoubleSide
    });

    const champagne = new THREE.MeshPhysicalMaterial({
      color: 0xc9a97c,
      metalness: 1,
      roughness: .27,
      envMapIntensity: 1.7
    });

    const graphite = new THREE.MeshPhysicalMaterial({
      color: 0x4f4b43,
      metalness: .95,
      roughness: .32,
      envMapIntensity: 1.2
    });

    /* ------------------------------------------------------------------
       Twisted monolith — a custom swept superellipse
    ------------------------------------------------------------------ */
    const createTwistedMonolith = () => {
      const segmentsAround = isMobile ? 26 : 42;
      const segmentsHigh = isMobile ? 72 : 150;
      const height = 3.16;
      const width = .57;
      const depth = .18;
      const twistTotal = Math.PI * .84;
      const positions = [];
      const indices = [];
      const uvs = [];

      for (let i = 0; i <= segmentsHigh; i += 1) {
        const t = i / segmentsHigh;
        const normalized = t - .5;
        const y = normalized * height;
        const twist = normalized * twistTotal;

        // Softly rounded ends while keeping a monolithic silhouette
        const endDistance = Math.min(t, 1 - t);
        const endScale = endDistance < .018
          ? .55 + .45 * Math.sin((endDistance / .018) * Math.PI * .5)
          : 1;

        for (let j = 0; j < segmentsAround; j += 1) {
          const theta = (j / segmentsAround) * Math.PI * 2;
          const cos = Math.cos(theta);
          const sin = Math.sin(theta);
          const power = 2 / 4.2;
          const x0 = width * endScale * Math.sign(cos) * Math.pow(Math.abs(cos), power);
          const z0 = depth * endScale * Math.sign(sin) * Math.pow(Math.abs(sin), power);
          const x = x0 * Math.cos(twist) - z0 * Math.sin(twist);
          const z = x0 * Math.sin(twist) + z0 * Math.cos(twist);
          positions.push(x, y, z);
          uvs.push(j / segmentsAround, t);
        }
      }

      for (let i = 0; i < segmentsHigh; i += 1) {
        for (let j = 0; j < segmentsAround; j += 1) {
          const a = i * segmentsAround + j;
          const b = i * segmentsAround + ((j + 1) % segmentsAround);
          const c = (i + 1) * segmentsAround + j;
          const d = (i + 1) * segmentsAround + ((j + 1) % segmentsAround);
          indices.push(a, c, b, b, c, d);
        }
      }

      const bottomCenter = positions.length / 3;
      positions.push(0, -height / 2, 0);
      uvs.push(.5, 0);
      const topCenter = positions.length / 3;
      positions.push(0, height / 2, 0);
      uvs.push(.5, 1);

      for (let j = 0; j < segmentsAround; j += 1) {
        const next = (j + 1) % segmentsAround;
        indices.push(bottomCenter, next, j);
        const topOffset = segmentsHigh * segmentsAround;
        indices.push(topCenter, topOffset + j, topOffset + next);
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      geometry.computeBoundingSphere();

      const mesh = new THREE.Mesh(geometry, obsidian);
      mesh.rotation.y = -.22;
      return mesh;
    };

    const monolith = createTwistedMonolith();
    monolith.position.y = .06;
    sculpture.add(monolith);

    /* A slim, lighter echo of the monolith far behind */
    const echoGeometry = monolith.geometry.clone();
    const echoMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x060606,
      metalness: .8,
      roughness: .3,
      transparent: true,
      opacity: .35,
      envMapIntensity: .9
    });
    const echo = new THREE.Mesh(echoGeometry, echoMaterial);
    echo.position.set(.34, .15, -1.4);
    echo.scale.setScalar(1.08);
    echo.rotation.y = .6;
    sculpture.add(echo);

    /* ------------------------------------------------------------------
       Orbital rings and small satellite
    ------------------------------------------------------------------ */
    const ringGroup = new THREE.Group();
    sculpture.add(ringGroup);

    const ringGeometryA = new THREE.TorusGeometry(1.28, .0105, 8, isMobile ? 110 : 210);
    const ringA = new THREE.Mesh(ringGeometryA, champagne);
    ringA.rotation.set(1.16, .12, -.25);
    ringA.position.y = .1;
    ringGroup.add(ringA);

    const ringGeometryB = new THREE.TorusGeometry(1.58, .006, 8, isMobile ? 96 : 180);
    const ringB = new THREE.Mesh(ringGeometryB, graphite);
    ringB.rotation.set(.96, -.42, .72);
    ringB.position.y = -.1;
    ringGroup.add(ringB);

    const bead = new THREE.Mesh(new THREE.SphereGeometry(.038, 20, 20), champagne);
    bead.position.set(1.06, .34, .77);
    ringGroup.add(bead);

    const shard = new THREE.Mesh(new THREE.OctahedronGeometry(.085, 0), champagne);
    shard.position.set(-1.14, -1.04, .34);
    shard.rotation.set(.4, .7, .3);
    ringGroup.add(shard);

    /* ------------------------------------------------------------------
       Fine dust for scale and atmosphere
    ------------------------------------------------------------------ */
    const dustCount = isMobile ? 32 : 68;
    const dustPositions = new Float32Array(dustCount * 3);
    let seed = 17;
    const random = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    for (let i = 0; i < dustCount; i += 1) {
      const radius = 1.9 + random() * 2.1;
      const angle = random() * Math.PI * 2;
      dustPositions[i * 3] = Math.cos(angle) * radius * .82;
      dustPositions[i * 3 + 1] = (random() - .5) * 4.5;
      dustPositions[i * 3 + 2] = Math.sin(angle) * radius * .5 - .4;
    }
    const dustGeometry = new THREE.BufferGeometry();
    dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    const dustMaterial = new THREE.PointsMaterial({
      color: 0xcbb18b,
      size: .013,
      transparent: true,
      opacity: .55,
      depthWrite: false,
      sizeAttenuation: true
    });
    const dust = new THREE.Points(dustGeometry, dustMaterial);
    sculpture.add(dust);

    /* ------------------------------------------------------------------
       Lighting — a small warm studio around the sculpture
    ------------------------------------------------------------------ */
    const key = new THREE.DirectionalLight(0xffe3c1, 1.1);
    key.position.set(4, 6, 4);
    scene.add(key);

    const cool = new THREE.DirectionalLight(0x8fa9bd, .55);
    cool.position.set(-5, 1, 2);
    scene.add(cool);

    const rim = new THREE.PointLight(0xd1a874, 8, 12, 2);
    rim.position.set(-2.5, 1.8, -2.2);
    scene.add(rim);

    /* ------------------------------------------------------------------
       Layout + interaction
    ------------------------------------------------------------------ */
    const world = {
      baseY: 0,
      baseScale: 1,
      x: 0
    };
    const pointer = { x: 0, y: 0 };
    const tilt = { x: 0, y: 0 };
    let orientationX = 0;
    let orientationY = 0;
    let hasOrientation = false;
    let width = 0;
    let height = 0;
    let isVisible = true;
    let frame = 0;
    let clockTime = 0;
    let lastFrame = performance.now();
    let slowFrameCount = 0;
    let qualityReduced = false;

    const updateLayout = () => {
      const rect = stage.getBoundingClientRect();
      width = Math.max(1, Math.round(rect.width));
      height = Math.max(1, Math.round(rect.height));
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 1.9));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      const viewHeight = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
      const viewWidth = viewHeight * camera.aspect;

      if (width <= 720) {
        world.baseScale = .56;
        world.baseY = viewHeight * .21;
        world.x = 0;
      } else if (width <= 1100) {
        world.baseScale = .72;
        world.baseY = viewHeight * .08;
        world.x = viewWidth * .06;
      } else {
        world.baseScale = THREE.MathUtils.clamp(height / 940, .82, 1.03);
        world.baseY = viewHeight * .015;
        world.x = viewWidth * .155;
      }

      rootGroup.scale.setScalar(world.baseScale);
      rootGroup.position.x = world.x;
      rootGroup.position.y = world.baseY;
    };

    updateLayout();

    const onPointerMove = (event) => {
      if (event.pointerType === 'touch') return;
      pointer.x = THREE.MathUtils.clamp((event.clientX / window.innerWidth - .5) * 2, -1, 1);
      pointer.y = THREE.MathUtils.clamp((event.clientY / window.innerHeight - .5) * 2, -1, 1);
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    const onOrientation = (event) => {
      if (event.gamma == null || event.beta == null) return;
      hasOrientation = true;
      orientationY = THREE.MathUtils.clamp(event.gamma / 32, -1, 1);
      orientationX = THREE.MathUtils.clamp((event.beta - 42) / 35, -1, 1);
    };
    if (window.matchMedia('(pointer: coarse)').matches) {
      window.addEventListener('deviceorientation', onOrientation, { passive: true });
    }

    const onScroll = () => {
      const y = window.scrollY || 0;
      const heroHeight = stage.clientHeight || 1;
      const progress = THREE.MathUtils.clamp(y / heroHeight, 0, 1);
      const viewHeight = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
      rootGroup.position.y = world.baseY + progress * viewHeight * .2;
      rootGroup.rotation.z = progress * .12;
      rootGroup.rotation.x = progress * -.035;
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    /* ------------------------------------------------------------------
       Render loop
    ------------------------------------------------------------------ */
    const render = (now) => {
      if (!isVisible) {
        frame = 0;
        return;
      }

      const delta = Math.min((now - lastFrame) / 1000, .05);
      lastFrame = now;
      clockTime += delta;

      if (!qualityReduced) {
        if (delta > .034) slowFrameCount += 1;
        else slowFrameCount = Math.max(0, slowFrameCount - 1);

        if (slowFrameCount > 48) {
          qualityReduced = true;
          renderer.setPixelRatio(1);
          renderer.setSize(width, height, false);
        }
      }

      const targetY = (hasOrientation ? orientationY : pointer.x) * THREE.MathUtils.degToRad(8);
      const targetX = (hasOrientation ? orientationX : pointer.y) * THREE.MathUtils.degToRad(6);
      tilt.y += (targetY - tilt.y) * .055;
      tilt.x += (targetX - tilt.x) * .055;

      rootGroup.rotation.y = Math.sin(clockTime * .17) * .22 + clockTime * .038 + tilt.y;
      rootGroup.rotation.x = tilt.x;
      sculpture.position.y = Math.sin(clockTime * .72) * .035;
      sculpture.rotation.y = Math.sin(clockTime * .22) * .045;

      ringGroup.rotation.y = clockTime * -.09 + tilt.y * -.28;
      ringGroup.rotation.z = Math.sin(clockTime * .2) * .06;
      ringA.rotation.z = -.25 + Math.sin(clockTime * .34) * .035;
      ringB.rotation.z = .72 + Math.sin(clockTime * .26 + 1) * .025;
      bead.position.x = Math.cos(clockTime * .36) * 1.06;
      bead.position.z = Math.sin(clockTime * .36) * 1.06;
      bead.position.y = .34 + Math.sin(clockTime * .52) * .12;
      shard.rotation.x += delta * .18;
      shard.rotation.y += delta * .13;
      shard.position.y = -1.04 + Math.sin(clockTime * .4 + 2) * .035;
      dust.rotation.y = clockTime * .025;

      renderer.render(scene, camera);
      frame = requestAnimationFrame(render);
    };

    const start = () => {
      if (frame || !isVisible) return;
      lastFrame = performance.now();
      frame = requestAnimationFrame(render);
    };
    const stop = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    };

    const intersectionObserver = 'IntersectionObserver' in window
      ? new IntersectionObserver((entries) => {
          isVisible = entries[0]?.isIntersecting ?? true;
          if (isVisible) start();
          else stop();
        }, { threshold: 0, rootMargin: '80px 0px 80px 0px' })
      : null;
    intersectionObserver?.observe(stage);

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop();
      else if (isVisible) start();
    });

    const resizeObserver = 'ResizeObserver' in window
      ? new ResizeObserver(() => {
          updateLayout();
          onScroll();
          if (!frame && isVisible) start();
        })
      : null;
    resizeObserver?.observe(stage);
    window.addEventListener('resize', () => {
      updateLayout();
      onScroll();
    }, { passive: true });

    canvas.addEventListener('webglcontextlost', (event) => {
      event.preventDefault();
      stop();
      stage.classList.remove('is-ready');
      stage.classList.add('is-fallback');
    });

    // First frame: let the CSS fallback hand over once the sculpture exists.
    renderer.compile(scene, camera);
    renderer.render(scene, camera);
    requestAnimationFrame(() => {
      stage.classList.add('is-ready');
      start();
    });

    // Keep references alive for the lifetime of the scene.
    window.__fitfuuxHero = {
      scene,
      renderer,
      environment,
      destroy: () => {
        stop();
        intersectionObserver?.disconnect();
        resizeObserver?.disconnect();
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('deviceorientation', onOrientation);
        window.removeEventListener('scroll', onScroll);
        environment.dispose();
        scene.traverse((object) => {
          if (!object.isMesh && !object.isPoints) return;
          object.geometry?.dispose?.();
          if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose?.());
          else object.material?.dispose?.();
        });
        renderer.dispose();
      }
    };
  };
})();
