/**
 * A tiny spring animation engine.
 *
 * CSS transitions and `@keyframes` cannot be interrupted gracefully: once a
 * 300 ms fade has started, a new gesture has to wait for it to finish, and
 * restarting it from the *target* value makes the element jump. A spring
 * solves both problems: it always starts from the element's live on-screen
 * value and it carries the current velocity into the new motion, so a
 * reversal blends instead of hitting a wall.
 *
 * The physics follow Apple's mapping from a designer-friendly pair
 * (damping ratio + response time) to mass/stiffness/damping:
 *
 *   stiffness = (2π / response)²
 *   damping   = 2 · ζ · √(stiffness · mass)
 *
 * where ζ = 1 is critically damped (no overshoot) and ζ < 1 overshoots.
 */

export interface SpringConfig {
  /** Higher is snappier. Derived from Apple's "response" time. */
  stiffness: number;
  /** Damping coefficient. Derived from Apple's damping ratio. */
  damping: number;
  /** Mass of the animated value. */
  mass: number;
}

export interface SpringTuning {
  /** Apple's damping ratio: 1 = critically damped, below 1 overshoots. */
  damping: number;
  /** Apple's response time in seconds. Lower is snappier. */
  response: number;
}

/** The house style: critically damped, no overshoot. */
export const CRITICAL: SpringTuning = { damping: 1, response: 0.4 };
/** Momentum-driven motion (a flick): a touch of overshoot. */
export const BOUNCY: SpringTuning = { damping: 0.8, response: 0.4 };
/** Drawers and sheets: quicker, with a little bounce. */
export const SHEET: SpringTuning = { damping: 0.8, response: 0.3 };

/** Turns a designer tuning into raw spring constants. */
export function springConfig(tuning: SpringTuning, mass = 1): SpringConfig {
  const stiffness = (2 * Math.PI / tuning.response) ** 2;
  const damping = 2 * tuning.damping * Math.sqrt(stiffness * mass);
  return { stiffness, damping, mass };
}

export interface SpringHandle {
  /** Retargets the animation, starting from the live value and blending velocity. */
  retarget(to: number, velocity?: number): void;
  /** Stops the animation where it is. */
  stop(): void;
  /** The current animated value. */
  readonly value: number;
  /** The current velocity, in units per second. */
  readonly velocity: number;
  /** True while the animation is running. */
  readonly active: boolean;
}

export interface SpringOptions {
  from: number;
  to: number;
  /** Initial velocity, in units per second. */
  velocity?: number;
  config: SpringConfig;
  onUpdate: (value: number, velocity: number) => void;
  onRest?: () => void;
}

/**
 * Apple's deceleration projection. Used to decide where a flick *lands*
 * instead of snapping to whatever is closest to the release point.
 *
 * @param velocity   release velocity in units per second
 * @param rate       deceleration rate; 0.998 is the standard scroll feel
 */
export function projectMomentum(velocity: number, rate = 0.998): number {
  return (velocity / 1000) * (rate / (1 - rate));
}

/**
 * Progressive resistance past a boundary. A hard stop reads as "frozen";
 * resistance reads as "there is nothing more here".
 */
export function rubberband(overshoot: number, dimension: number, constant = 0.55): number {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

/** Fixed simulation step. Small enough for stiff springs to stay stable. */
const FIXED_STEP = 1 / 240;
/** Below this distance the spring is considered at rest. */
const REST_DISPLACEMENT = 0.01;
const REST_VELOCITY = 0.05;

/**
 * Runs a spring animation on `requestAnimationFrame`.
 *
 * The simulation uses a fixed timestep so the motion is identical on a 60 Hz
 * and a 120 Hz display.
 */
export function runSpring(options: SpringOptions): SpringHandle {
  let value = options.from;
  let velocity = options.velocity ?? 0;
  let target = options.to;
  let running = false;
  let lastTime = 0;
  let lastTick = 0;
  let accumulator = 0;
  let frame = 0;
  let timer: ReturnType<typeof setInterval> | null = null;

  const { stiffness, damping, mass } = options.config;

  const step = (dt: number) => {
    const displacement = value - target;
    const springForce = -stiffness * displacement;
    const dampingForce = -damping * velocity;
    const acceleration = (springForce + dampingForce) / mass;
    velocity += acceleration * dt;
    value += velocity * dt;
  };

  /** Advances the simulation to `time` and reports the new value. */
  const advance = (time: number) => {
    if (lastTime === 0) lastTime = time;
    // A long stall (a backgrounded tab starves requestAnimationFrame) is
    // clamped so the motion resumes from where it stopped instead of jumping.
    const elapsed = Math.min(0.064, (time - lastTime) / 1000);
    lastTime = time;
    lastTick = time;
    accumulator += elapsed;

    while (accumulator >= FIXED_STEP) {
      step(FIXED_STEP);
      accumulator -= FIXED_STEP;
    }

    options.onUpdate(value, velocity);

    const displacement = Math.abs(value - target);
    if (displacement < REST_DISPLACEMENT && Math.abs(velocity) < REST_VELOCITY) {
      value = target;
      velocity = 0;
      running = false;
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
      options.onUpdate(value, velocity);
      options.onRest?.();
    }
  };

  const tick = (time: number) => {
    if (!running) return;
    advance(time);
    if (running) scheduleFrame();
  };

  /** Schedules the next animation frame, when the platform has one. */
  const scheduleFrame = () => {
    if (typeof requestAnimationFrame === 'function') {
      frame = requestAnimationFrame(tick);
    }
  };

  /**
   * Fallback clock. requestAnimationFrame is throttled to a crawl in a
   * backgrounded tab, which would leave a page turn frozen half-way. The
   * timer picks the motion up whenever the animation frame clock goes quiet.
   */
  const fallback = () => {
    if (!running) return;
    const now = performance.now();
    if (now - lastTick > 40) advance(now);
  };

  const start = () => {
    if (running) return;
    running = true;
    lastTime = 0;
    lastTick = performance.now();
    accumulator = 0;
    scheduleFrame();
  };

  start();
  timer = setInterval(fallback, 16);

  return {
    get value() {
      return value;
    },
    get velocity() {
      return velocity;
    },
    get active() {
      return running;
    },
    retarget(to: number, nextVelocity?: number) {
      target = to;
      // Blend, don't cut: the current velocity carries into the new motion so
      // a reversal does not slam into a wall.
      velocity = nextVelocity ?? velocity;
      if (!running) start();
    },
    stop() {
      running = false;
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
      if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(frame);
    },
  };
}
