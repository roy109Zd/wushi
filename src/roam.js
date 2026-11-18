import * as THREE from 'three';

const WALK_SPEED = 2.6;
const RUN_SPEED = 5.2;
const TURN_SPEED = 2.6;
const FOLLOW_DISTANCE = 7.2;
const FOLLOW_HEIGHT = 4.0;

/**
 * 角色漫游：让舞狮本人走进展厅。
 * 直接把 stageRoot 当作角色容器移动，播 Walk / Run / Jump 骨骼动画，
 * 相机跟在角色身后，相当于第三人称探索。
 */
export class RoamController {
  constructor({ stageRoot, stageTop, camera, actionTheater, viewerControls, onExit = () => {} }) {
    this.stageRoot = stageRoot;
    this.stageTop = stageTop;
    this.camera = camera;
    this.actionTheater = actionTheater;
    this.viewerControls = viewerControls;
    this.onExit = onExit;

    this.active = false;
    this.keys = new Set();
    this.heading = Math.PI;
    this.velocity = 0;
    this.currentClip = null;
    this.jumping = false;
    this.jumpTimer = 0;
    this.crouching = false;
    this.sliding = false;
    this.slideTimer = 0;
    this.desiredPosition = new THREE.Vector3();
    this.lookTarget = new THREE.Vector3();

    this.onKeyDown = (event) => {
      if (!this.active) return;
      if (event.code === 'Escape' || event.code === 'KeyQ') {
        this.exit();
        return;
      }
      if (event.code === 'Space') {
        event.preventDefault();
        this.jump();
        return;
      }
      if (event.code === 'KeyX') {
        event.preventDefault();
        this.slide();
        return;
      }
      if (event.code === 'KeyC') {
        this.crouching = true;
        event.preventDefault();
        return;
      }
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'ShiftRight'].includes(event.code)) {
        event.preventDefault();
        this.keys.add(event.code);
      }
    };
    this.onKeyUp = (event) => {
      if (event.code === 'KeyC') this.crouching = false;
      this.keys.delete(event.code);
    };
  }

  enter(spawn = null) {
    if (this.active) return;
    this.active = true;
    this.keys.clear();
    this.currentClip = null;
    this.jumping = false;
    this.crouching = false;
    this.sliding = false;
    this.heading = spawn?.heading ?? Math.PI;
    this.velocity = 0;

    const x = spawn?.x ?? 0;
    const z = spawn?.z ?? 6.5;
    this.stageRoot.position.set(x, this.stageTop, z);
    this.stageRoot.rotation.y = this.heading;

    this.viewerControls.setSuspended(true);
    this.viewerControls.orbit.enabled = false;

    this.camera.position.set(
      x - Math.sin(this.heading) * FOLLOW_DISTANCE,
      this.stageTop + FOLLOW_HEIGHT,
      z - Math.cos(this.heading) * FOLLOW_DISTANCE
    );
    this.camera.lookAt(x, this.stageTop + 1.7, z);

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);

    this.playClip('walk');
  }

  teleport({ x, z, heading = this.heading }) {
    if (!this.active) return;
    this.heading = heading;
    this.stageRoot.position.set(x, this.stageTop, z);
    this.stageRoot.rotation.y = heading;
    this.velocity = 0;
    this.jumping = false;
    this.sliding = false;
    this.currentClip = null;
    this.camera.position.set(
      x - Math.sin(heading) * FOLLOW_DISTANCE,
      this.stageTop + FOLLOW_HEIGHT,
      z - Math.cos(heading) * FOLLOW_DISTANCE
    );
    this.camera.lookAt(x, this.stageTop + 1.7, z);
  }

  exit() {
    if (!this.active) return;
    this.active = false;
    this.keys.clear();
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);

    this.actionTheater.stop();
    this.currentClip = null;
    this.jumping = false;
    this.crouching = false;
    this.sliding = false;

    this.stageRoot.position.set(0, this.stageTop, 0);
    this.stageRoot.rotation.y = 0;

    this.viewerControls.setSuspended(false);
    this.viewerControls.orbit.enabled = true;
    this.viewerControls.resetView();
    this.onExit();
  }

  playClip(id) {
    if (this.currentClip === id) return;
    this.currentClip = id;
    this.actionTheater.play(id).catch(() => {
      this.currentClip = null;
    });
  }

  jump() {
    if (this.jumping || this.sliding) return;
    this.jumping = true;
    this.jumpTimer = 5.2;
    this.currentClip = 'jump';
    this.actionTheater.play('jump').catch(() => {});
  }

  slide() {
    if (this.sliding || this.jumping) return;
    this.sliding = true;
    this.slideTimer = 3.4;
    this.currentClip = 'slide';
    this.actionTheater.play('slide').catch(() => {});
  }

  collides(x, z) {
    return this.viewerControls.collides(x, z, 0.62);
  }

  update(delta) {
    if (!this.active) return;

    const forward = (this.keys.has('KeyW') ? 1 : 0) - (this.keys.has('KeyS') ? 1 : 0);
    const turn = (this.keys.has('KeyA') ? 1 : 0) - (this.keys.has('KeyD') ? 1 : 0);
    const moving = forward !== 0;
    const running = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');

    // 以角色自身朝向为准：W/S 前后，A/D 原地转身
    if (turn !== 0) this.heading += turn * TURN_SPEED * delta;
    this.stageRoot.rotation.y = this.heading;

    if (this.jumping) {
      this.jumpTimer -= delta;
      if (this.jumpTimer <= 0) {
        this.jumping = false;
        this.currentClip = null;
      }
    }

    // 滑铲：一段时间内自动向前冲，结束回到普通移动
    if (this.sliding) {
      this.slideTimer -= delta;
      const step = 6.0 * delta;
      const dx = Math.sin(this.heading);
      const dz = Math.cos(this.heading);
      const nextX = this.stageRoot.position.x + dx * step;
      const nextZ = this.stageRoot.position.z + dz * step;
      if (!this.collides(nextX, this.stageRoot.position.z)) this.stageRoot.position.x = nextX;
      if (!this.collides(this.stageRoot.position.x, nextZ)) this.stageRoot.position.z = nextZ;
      if (this.slideTimer <= 0) {
        this.sliding = false;
        this.currentClip = null;
      }
    }

    const crouchSpeed = this.crouching ? 1.2 : (running ? RUN_SPEED : WALK_SPEED);
    const speed = crouchSpeed;

    if (!this.sliding) {
      // 速度做阻尼，起步和收步都不生硬
      const targetSpeed = moving ? speed * (forward > 0 ? 1 : -1) : 0;
      this.velocity += (targetSpeed - this.velocity) * (1 - Math.exp(-9 * delta));
      if (Math.abs(this.velocity) < 0.02) this.velocity = 0;

      if (this.velocity !== 0) {
        const direction = this.velocity > 0 ? 1 : -1;
        const dx = Math.sin(this.heading) * direction;
        const dz = Math.cos(this.heading) * direction;
        const step = Math.abs(this.velocity) * delta;

        const nextX = this.stageRoot.position.x + dx * step;
        const nextZ = this.stageRoot.position.z + dz * step;

        if (!this.collides(nextX, this.stageRoot.position.z)) this.stageRoot.position.x = nextX;
        if (!this.collides(this.stageRoot.position.x, nextZ)) this.stageRoot.position.z = nextZ;
      }
    }

    if (!this.jumping && !this.sliding) {
      const speedNow = Math.abs(this.velocity);
      if (speedNow > 0.25) {
        this.playClip(this.crouching ? 'crouch' : (speedNow > 3.6 ? 'run' : 'walk'));
      } else if (this.currentClip) {
        this.currentClip = null;
        this.actionTheater.stop();
      }
    }

    const targetX = this.stageRoot.position.x - Math.sin(this.heading) * FOLLOW_DISTANCE;
    const targetZ = this.stageRoot.position.z - Math.cos(this.heading) * FOLLOW_DISTANCE;

    this.desiredPosition.set(targetX, this.stageTop + FOLLOW_HEIGHT, targetZ);
    const blend = 1 - Math.exp(-9 * delta);
    this.camera.position.lerp(this.desiredPosition, blend);

    this.lookTarget.set(
      this.stageRoot.position.x,
      this.stageTop + 1.75,
      this.stageRoot.position.z
    );
    this.camera.lookAt(this.lookTarget);
  }

  dispose() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }
}
