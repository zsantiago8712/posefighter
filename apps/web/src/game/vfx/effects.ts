import * as Phaser from "phaser";

export const DEPTH = { bg: 0, fighters: 10, projectile: 15, vfx: 20, ui: 50, banner: 60, flash: 100 } as const;

/** Freeze the world for a beat. Uses a real timeout because scene time is what we're freezing. */
export function hitStop(scene: Phaser.Scene, ms: number): void {
  scene.time.timeScale = 0.05;
  scene.tweens.timeScale = 0.05;
  scene.anims.globalTimeScale = 0.05;
  window.setTimeout(() => {
    if (!scene.sys || !scene.sys.isActive()) return;
    scene.time.timeScale = 1;
    scene.tweens.timeScale = 1;
    scene.anims.globalTimeScale = 1;
  }, ms);
}

export function shake(scene: Phaser.Scene, intensity: number, duration = 200): void {
  scene.cameras.main.shake(duration, intensity);
}

export function zoomPunch(scene: Phaser.Scene, zoom = 1.12, duration = 90): void {
  const cam = scene.cameras.main;
  cam.zoomTo(zoom, duration, "Quad.easeOut", true, (_cam, progress) => {
    if (progress >= 1) cam.zoomTo(1, duration * 3, "Quad.easeInOut", true);
  });
}

export function flash(scene: Phaser.Scene, color = 0xffffff, alpha = 0.9, duration = 120): void {
  const { width, height } = scene.scale;
  const rect = scene.add.rectangle(width / 2, height / 2, width * 2, height * 2, color, alpha).setDepth(DEPTH.flash).setScrollFactor(0);
  scene.tweens.add({ targets: rect, alpha: 0, duration, onComplete: () => rect.destroy() });
}

/** Expanding ring + radial burst lines. */
export function impactRing(scene: Phaser.Scene, x: number, y: number, color: number, size = 1): void {
  const ring = scene.add.circle(x, y, 40, color, 0).setStrokeStyle(10, color, 1).setDepth(DEPTH.vfx).setScale(0.2);
  scene.tweens.add({ targets: ring, scale: 2.2 * size, alpha: 0, duration: 320, ease: "Cubic.easeOut", onComplete: () => ring.destroy() });
  const g = scene.add.graphics().setDepth(DEPTH.vfx);
  const rays = 8;
  for (let i = 0; i < rays; i++) {
    const a = (i / rays) * Math.PI * 2 + Math.random() * 0.4;
    const len = (60 + Math.random() * 80) * size;
    g.lineStyle(6 * size, i % 2 ? 0xffffff : color, 1);
    g.beginPath();
    g.moveTo(x + Math.cos(a) * 20, y + Math.sin(a) * 20);
    g.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    g.strokePath();
  }
  scene.tweens.add({ targets: g, alpha: 0, scale: 1.4, duration: 220, onComplete: () => g.destroy() });
}

export function burst(scene: Phaser.Scene, x: number, y: number, color: number, quantity = 18, speed = 500): void {
  if (!scene.textures.exists("particle")) return;
  const emitter = scene.add.particles(x, y, "particle", {
    speed: { min: speed * 0.4, max: speed },
    angle: { min: 0, max: 360 },
    scale: { start: 1, end: 0 },
    alpha: { start: 1, end: 0 },
    lifespan: { min: 250, max: 550 },
    gravityY: 600,
    tint: [color, 0xffffff, color],
    emitting: false,
  }).setDepth(DEPTH.vfx);
  emitter.explode(quantity);
  scene.time.delayedCall(700, () => emitter.destroy());
}

export function confetti(scene: Phaser.Scene, color: number): void {
  if (!scene.textures.exists("particle")) return;
  const { width } = scene.scale;
  const emitter = scene.add.particles(width / 2, -20, "particle", {
    x: { min: 0, max: width },
    speedY: { min: 200, max: 500 },
    speedX: { min: -80, max: 80 },
    scale: { start: 1.2, end: 0.6 },
    rotate: { start: 0, end: 360 },
    lifespan: 2200,
    quantity: 3,
    frequency: 30,
    tint: [color, 0xffffff, 0xffd93b, 0xff3b8f],
  }).setDepth(DEPTH.vfx);
  scene.time.delayedCall(1400, () => emitter.stop());
  scene.time.delayedCall(3800, () => emitter.destroy());
}

/** Slow the whole scene (timers, tweens, anims) for `realMs` wall-clock milliseconds. */
export function slowMo(scene: Phaser.Scene, factor: number, realMs: number): void {
  scene.time.timeScale = factor;
  scene.tweens.timeScale = factor;
  scene.anims.globalTimeScale = factor;
  window.setTimeout(() => {
    if (!scene.sys || !scene.sys.isActive()) return;
    scene.time.timeScale = 1;
    scene.tweens.timeScale = 1;
    scene.anims.globalTimeScale = 1;
  }, realMs);
}

/** Spawn a projectile texture and fly it to (tx, ty). Resolves with the travel time in ms. */
export function fireProjectile(
  scene: Phaser.Scene,
  key: string,
  from: { x: number; y: number },
  to: { x: number; y: number },
  speed: number,
  scale = 1,
  tint = 0xffffff,
): Promise<void> {
  return new Promise((resolve) => {
    const textureKey = scene.textures.exists(key) ? key : "orb";
    if (!scene.textures.exists(textureKey)) {
      resolve();
      return;
    }
    const p = scene.add.image(from.x, from.y, textureKey).setDepth(DEPTH.projectile).setScale(scale * 0.4).setTint(tint);
    p.setRotation(Math.atan2(to.y - from.y, to.x - from.x));
    const dist = Phaser.Math.Distance.Between(from.x, from.y, to.x, to.y);
    const duration = Math.max(120, (dist / speed) * 1000);
    let trail: Phaser.GameObjects.Particles.ParticleEmitter | undefined;
    if (scene.textures.exists("particle")) {
      trail = scene.add.particles(0, 0, "particle", {
        follow: p,
        speed: 40,
        scale: { start: 0.9 * scale, end: 0 },
        alpha: { start: 0.8, end: 0 },
        lifespan: 300,
        frequency: 18,
        tint,
      }).setDepth(DEPTH.projectile - 1);
    }
    scene.tweens.add({ targets: p, scale, duration: 120, ease: "Back.easeOut" });
    scene.tweens.add({
      targets: p,
      x: to.x,
      y: to.y,
      duration,
      ease: "Sine.easeIn",
      onComplete: () => {
        p.destroy();
        trail?.stop();
        if (trail) scene.time.delayedCall(400, () => trail?.destroy());
        resolve();
      },
    });
  });
}

/** Explosion spritesheet if loaded, else a big ring. */
export function explosion(scene: Phaser.Scene, x: number, y: number, color: number, scale = 1): void {
  if (scene.textures.exists("explosion") && scene.anims.exists("vfx-explosion")) {
    const s = scene.add.sprite(x, y - 40, "explosion").setDepth(DEPTH.vfx).setScale(3.2 * scale).setBlendMode(Phaser.BlendModes.ADD);
    s.play("vfx-explosion");
    s.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => s.destroy());
  }
  impactRing(scene, x, y, color, 1.6 * scale);
}

/** Runtime textures so we never depend on files for particles/projectiles/shields. */
export function generateRuntimeTextures(scene: Phaser.Scene): void {
  const make = (key: string, size: number, draw: (g: Phaser.GameObjects.Graphics) => void) => {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    draw(g);
    g.generateTexture(key, size, size);
    g.destroy();
  };
  make("particle", 16, (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillCircle(8, 8, 8);
  });
  make("orb", 64, (g) => {
    g.fillStyle(0xffffff, 0.35);
    g.fillCircle(32, 32, 32);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(32, 32, 18);
  });
  make("fireball", 96, (g) => {
    g.fillStyle(0xffffff, 0.3);
    g.fillCircle(48, 48, 48);
    g.fillStyle(0xffffff, 0.7);
    g.fillCircle(48, 48, 34);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(48, 48, 20);
  });
  make("meteor", 96, (g) => {
    g.fillStyle(0xffffff, 0.4);
    g.fillCircle(48, 48, 46);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(48, 48, 28);
  });
  make("wave", 128, (g) => {
    g.lineStyle(14, 0xffffff, 1);
    g.beginPath();
    g.arc(30, 64, 54, Phaser.Math.DegToRad(-70), Phaser.Math.DegToRad(70), false);
    g.strokePath();
    g.lineStyle(6, 0xffffff, 0.6);
    g.beginPath();
    g.arc(20, 64, 60, Phaser.Math.DegToRad(-60), Phaser.Math.DegToRad(60), false);
    g.strokePath();
  });
  make("shield", 256, (g) => {
    g.lineStyle(10, 0xffffff, 1);
    g.strokeCircle(128, 128, 118);
    g.lineStyle(4, 0xffffff, 0.7);
    g.strokeCircle(128, 128, 96);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      g.lineBetween(128, 128, 128 + Math.cos(a) * 96, 128 + Math.sin(a) * 96);
    }
  });
}
