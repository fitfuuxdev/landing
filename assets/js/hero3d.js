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

    const lime = new THREE.MeshPhysicalMaterial({
      color: 0xF0A93E,
      metalness: .92,
      roughness: .28,
      envMapIntensity: 1.8,
      emissive: 0x2a1900,
      emissiveIntensity: .4
    });

    const graphite = new THREE.MeshPhysicalMaterial({
      color: 0x4f4b43,
      metalness: .95,
      roughness: .32,
      envMapIntensity: 1.2
    });

    /* ------------------------------------------------------------------
       Neon core — a compact glowing orb with an inner wireframe,
       sits well on both desktop and mobile (no tall vertical shape)
    ------------------------------------------------------------------ */
    const coreGroup = new THREE.Group();
    sculpture.add(coreGroup);

    const coreShell = new THREE.Mesh(
      isMobile
        ? new THREE.IcosahedronGeometry(.86, 2)
        : new THREE.IcosahedronGeometry(.9, 3),
      obsidian
    );
    coreGroup.add(coreShell);

    const wire = new THREE.Mesh(
      new THREE.IcosahedronGeometry(isMobile ? 1.0 : 1.08, 1),
      new THREE.MeshBasicMaterial({
        color: 0xF0A93E,
        wireframe: true,
        transparent: true,
        opacity: .35
      })
    );
    coreGroup.add(wire);

    const glint = new THREE.Mesh(
      new THREE.SphereGeometry(.1, 20, 20),
      new THREE.MeshBasicMaterial({ color: 0xF0A93E })
    );
    glint.position.set(.62, .42, .62);
    coreGroup.add(glint);

    /* ------------------------------------------------------------------
       Orbital rings and small satellite
    ------------------------------------------------------------------ */
    const ringGroup = new THREE.Group();
    sculpture.add(ringGroup);

    const ringGeometryA = new THREE.TorusGeometry(1.28, .0105, 8, isMobile ? 110 : 210);
    const ringA = new THREE.Mesh(ringGeometryA, lime);
    ringA.rotation.set(1.16, .12, -.25);
    ringA.position.y = .1;
    ringGroup.add(ringA);

    const ringGeometryB = new THREE.TorusGeometry(1.58, .006, 8, isMobile ? 96 : 180);
    const ringB = new THREE.Mesh(ringGeometryB, graphite);
    ringB.rotation.set(.96, -.42, .72);
    ringB.position.y = -.1;
    ringGroup.add(ringB);

    const bead = new THREE.Mesh(new THREE.SphereGeometry(.038, 20, 20), lime);
    bead.position.set(1.06, .34, .77);
    ringGroup.add(bead);

    const shard = new THREE.Mesh(new THREE.OctahedronGeometry(.085, 0), lime);
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
      color: 0xF0A93E,
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

    /* Drag control: the user can spin the sculpture by dragging over the stage.
       While dragging we take over rotation; on release we ease back to the idle motion. */
    let dragging = false;
    let pointerDown = false;
    let pStartX = 0;
    let pStartY = 0;
    let holdY = 0;
    let holdX = 0;

    const userRot = { x: 0, y: 0 };
    let userWeight = 0;

    const easeOut = (a, b, t) => a + (b - a) * t;
    const damp = (current, target, lambda, dt) => easeOut(current, target, 1 - Math.exp(-lambda * dt));

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
        world.x = viewWidth * .105;
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

    const down = (event) => {
      if (event.pointerType === 'touch' || event.button !== 0) return;
      event.preventDefault();
      pointerDown = true;
      pStartX = event.clientX;
      pStartY = event.clientY;
      stage.classList.add('is-dragging');
      try { stage.setPointerCapture(event.pointerId); } catch (error) { /* noop */ }
    };
    const move = (event) => {
      if (!pointerDown) return;
      const dx = event.clientX - pStartX;
      const dy = event.clientY - pStartY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragging = true;
      if (!dragging) return;
      holdY = holdY + dx * .0085;
      holdX = holdX + dy * .0055;
      pStartX = event.clientX;
      pStartY = event.clientY;
    };
    const up = () => {
      dragging = false;
      pointerDown = false;
      stage.classList.remove('is-dragging');
    };
    if (window.matchMedia('(pointer: fine)').matches) {
      stage.classList.add('is-draggable');
      stage.addEventListener('pointerdown', down);
      stage.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
      // Finish the hand-over to WebGL, then let the user grab the model.
      const handover = () => {
        if (stage.classList.contains('is-ready')) {
          stage.style.pointerEvents = 'auto';
        } else {
          setTimeout(handover, 150);
        }
      };
      handover();
    }

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

      const idleY = Math.sin(clockTime * .17) * .22 + clockTime * .038 + tilt.y;
      const idleX = tilt.x;

      if (dragging) {
        userRot.x = damp(userRot.x, holdX, 12, delta);
        userWeight = Math.min(1, userWeight + delta * 6);
      } else {
        userRot.x = damp(userRot.x, 0, 5, delta);
        userWeight = damp(userWeight, 0, 6, delta);
      }
      userRot.y = holdY * userWeight;
      rootGroup.rotation.y = idleY * (1 - userWeight) + userRot.y * userWeight;
      rootGroup.rotation.x = idleX * (1 - userWeight) + userRot.x * userWeight;

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
