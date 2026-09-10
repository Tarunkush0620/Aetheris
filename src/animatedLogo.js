import * as THREE from 'three';

let animationFrameId = null;

export function initAnimatedLogo(container) {
  const scene = new THREE.Scene();
  // Using transparent background instead of solid color to blend with loading screen
  scene.background = null; 

  const { width, height } = container.getBoundingClientRect();
  
  const camera = new THREE.PerspectiveCamera(
    45,
    width / height,
    0.1,
    100
  );
  camera.position.z = 7;

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true // Alpha true so it layers nicely
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  
  renderer.domElement.style.position = 'absolute';
  renderer.domElement.style.top = '0';
  renderer.domElement.style.left = '0';
  renderer.domElement.style.zIndex = '0'; 
  container.appendChild(renderer.domElement);

  const content = container.querySelector('.loader-content');
  if (content) {
    content.style.position = 'relative';
    content.style.zIndex = '1';
  }

  // Background glow
  const glowCanvas = document.createElement("canvas");
  glowCanvas.width = glowCanvas.height = 256;
  const g = glowCanvas.getContext("2d");
  const grd = g.createRadialGradient(128,128,0,128,128,128);
  grd.addColorStop(0, "rgba(0,220,255,.28)");
  grd.addColorStop(.35, "rgba(0,110,255,.12)");
  grd.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grd;
  g.fillRect(0,0,256,256);

  const glowTexture = new THREE.CanvasTexture(glowCanvas);
  const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
          map: glowTexture,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending
      })
  );
  glow.scale.set(8,8,1);
  glow.position.z = -1;
  scene.add(glow);

  const loader = new THREE.TextureLoader();

  let mx = 0, my = 0;
  
  const onPointerMove = (e) => {
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    mx = (x / rect.width) * 2 - 1;
    my = (y / rect.height) * 2 - 1;
  };

  const onResize = () => {
    const { width: w, height: h } = container.getBoundingClientRect();
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  };

  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('resize', onResize);

  loader.load(
      "/logo.png",
      (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;

          const imageAspect = texture.image.width / texture.image.height;
          const h = 4.25;
          const w = h * imageAspect;

          const group = new THREE.Group();
          scene.add(group);

          const material = new THREE.MeshBasicMaterial({
              map: texture,
              transparent: true,
              depthWrite: false,
              blending: THREE.NormalBlending
          });

          const mesh = new THREE.Mesh(
              new THREE.PlaneGeometry(w, h),
              material
          );
          group.add(mesh);

          const glowMaterial = new THREE.MeshBasicMaterial({
              map: texture,
              transparent: true,
              opacity: 0.22,
              color: 0x00dfff,
              depthWrite: false,
              blending: THREE.AdditiveBlending
          });

          const glowMesh = new THREE.Mesh(
              new THREE.PlaneGeometry(w * 1.035, h * 1.035),
              glowMaterial
          );
          glowMesh.position.z = -0.03;
          group.add(glowMesh);

          const ring1 = new THREE.Mesh(
              new THREE.TorusGeometry(2.62, 0.012, 12, 180),
              new THREE.MeshBasicMaterial({
                  color: 0x00d9ff,
                  transparent: true,
                  opacity: 0.28,
                  depthWrite: false,
                  blending: THREE.AdditiveBlending
              })
          );
          ring1.rotation.x = Math.PI / 2;
          ring1.scale.y = 0.42;
          group.add(ring1);

          const ring2 = new THREE.Mesh(
              new THREE.TorusGeometry(2.9, 0.009, 12, 180),
              new THREE.MeshBasicMaterial({
                  color: 0x238cff,
                  transparent: true,
                  opacity: 0.20,
                  depthWrite: false,
                  blending: THREE.AdditiveBlending
              })
          );
          ring2.rotation.set(1.15, 0.2, 0.4);
          ring2.scale.y = 0.43;
          group.add(ring2);

          const dot = new THREE.Mesh(
              new THREE.SphereGeometry(0.035, 16, 16),
              new THREE.MeshBasicMaterial({
                  color: 0x8fffff,
                  blending: THREE.AdditiveBlending
              })
          );
          group.add(dot);

          const clock = new THREE.Clock();

          function animate() {
              animationFrameId = requestAnimationFrame(animate);
              const t = clock.getElapsedTime();

              group.position.y = Math.sin(t * 0.8) * 0.08;
              group.rotation.y += ((mx * 0.22) - group.rotation.y) * 0.035;
              group.rotation.x += ((-my * 0.14) - group.rotation.x) * 0.035;
              group.rotation.z = Math.sin(t * 0.25) * 0.018;

              ring1.rotation.z = t * 0.18;
              ring2.rotation.z = 0.4 + t * 0.11;

              const pulse = 0.18 + (Math.sin(t * 2.0) + 1) * 0.035;
              glowMaterial.opacity = pulse;

              const a = t * 0.55;
              dot.position.set(
                  Math.cos(a) * 2.72,
                  Math.sin(a) * 2.72 * 0.42,
                  0.05
              );

              glow.material.opacity =
                  0.75 + Math.sin(t * 1.2) * 0.08;

              renderer.render(scene, camera);
          }

          animate();
      },
      undefined,
      (error) => {
          console.error("Could not load logo.png:", error);
      }
  );

  return function cleanup() {
      if (animationFrameId !== null) {
          cancelAnimationFrame(animationFrameId);
      }
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('resize', onResize);
      if (renderer.domElement && container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
      }
      renderer.dispose();
  };
}
