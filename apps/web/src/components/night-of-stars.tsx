'use client';

import React, { useEffect, useRef } from 'react';
import { Camera, Geometry, Mesh, Program, Renderer } from 'ogl';

// Define props for particle system
interface NightOfStarsProps {
  particleCount?: number; // Number of stars
  meteorCount?: number; // Number of meteors
  particleSpread?: number; // Spread of particles
  speed?: number; // Star movement speed
  meteorSpeed?: number; // Meteor movement speed
  particleColors?: string[]; // Star colors
  meteorColors?: string[]; // Meteor colors
  backgroundMode?: 'night' | 'light'; // Background mode
  moveParticlesOnHover?: boolean; // Move on mouse hover
  particleHoverFactor?: number; // Hover movement factor
  alphaParticles?: boolean; // Enable alpha blending
  particleBaseSize?: number; // Base size for stars
  meteorBaseSize?: number; // Base size for meteors
  sizeRandomness?: number; // Size variation
  cameraDistance?: number; // Camera distance
  disableRotation?: boolean; // Disable rotation
  className?: string; // CSS class
}

// Default color palettes
const nightColors: string[] = ['#ffffff', '#d0d0ff', '#a0a0ff', '#e0e0e0']; // White, light blue, gray for night
const lightColors: string[] = ['#333333', '#5555aa', '#7777cc', '#222222']; // Dark gray, blue for light
const nightMeteorColors: string[] = ['#ffffff', '#ffffcc', '#ffeedd']; // White, light yellow for night meteors
const lightMeteorColors: string[] = ['#000000', '#333300', '#222200']; // Black, dark gray for light meteors

// Convert hex color to RGB
const hexToRgb = (hex: string): [number, number, number] => {
  hex = hex.replace(/^#/, '');
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const int = parseInt(hex, 16);
  const r = ((int >> 16) & 255) / 255;
  const g = ((int >> 8) & 255) / 255;
  const b = (int & 255) / 255;
  return [r, g, b];
};

// Vertex shader for particle movement
const vertex = /* glsl */ `
  attribute vec3 position;
  attribute vec4 random;
  attribute vec3 color;
  attribute float isMeteor;
  
  uniform mat4 modelMatrix;
  uniform mat4 viewMatrix;
  uniform mat4 projectionMatrix;
  uniform float uTime;
  uniform float uSpread;
  uniform float uBaseSize;
  uniform float uMeteorBaseSize;
  uniform float uSizeRandomness;
  uniform float uSpeed;
  uniform float uMeteorSpeed;
  
  varying vec4 vRandom;
  varying vec3 vColor;
  varying float vIsMeteor;
  
  void main() {
    vRandom = random;
    vColor = color;
    vIsMeteor = isMeteor;
    
    vec3 pos = position * uSpread;
    
    // Linear movement with random speed
    float speed = mix(0.1, 0.5, random.y) * uSpeed;
    if (isMeteor > 0.5) {
      speed = mix(1.0, 2.0, random.y) * uMeteorSpeed; // Faster for meteors
      pos.x -= uTime * speed; // Move left
      pos.y -= uTime * speed; // Move down
      // Reset meteor when out of bounds (bottom-left)
      if (pos.x < -uSpread || pos.y < -uSpread) {
        pos.x = uSpread * random.x; // Start from right
        pos.y = uSpread * random.y; // Start from top
        pos.z = uSpread * (2.0 * random.z - 1.0); // Random z
      }
    } else {
      pos.x += uTime * speed; // Normal star movement (rightward)
      if (pos.x > uSpread) {
        pos.x -= 2.0 * uSpread;
      }
    }
    
    vec4 mPos = modelMatrix * vec4(pos, 1.0);
    vec4 mvPos = viewMatrix * mPos;
    
    // Set particle size
    float size = isMeteor > 0.5 ? uMeteorBaseSize : uBaseSize;
    gl_PointSize = (size * (1.0 + uSizeRandomness * (random.x - 0.5))) / length(mvPos.xyz);
    
    gl_Position = projectionMatrix * mvPos;
  }
`;

// Fragment shader for particle appearance
const fragment = /* glsl */ `
  precision highp float;
  
  uniform float uTime;
  uniform float uAlphaParticles;
  varying vec4 vRandom;
  varying vec3 vColor;
  varying float vIsMeteor;
  
  void main() {
    vec2 uv = gl_PointCoord.xy;
    float d = length(uv - vec2(0.5));
    
    if (vIsMeteor > 0.5) {
      // Meteor: stretched shape with glowing tail
      vec2 stretchedUV = vec2((uv.x - 0.5) * 6.0 + 0.5, uv.y); // Stretch along x for tail
      float meteorD = length(stretchedUV - vec2(0.5));
      float circle = smoothstep(0.5, 0.4, meteorD) * 0.9;
      float tailFade = smoothstep(0.0, 1.0, 1.0 - uv.x); // Brighter at head, dimmer at tail
      float flare = 0.4 * sin(uTime * vRandom.z * 6.0); // Flare effect
      gl_FragColor = vec4(vColor + flare, circle * tailFade);
    } else {
      // Star: normal shape with slight blink
      if (uAlphaParticles < 0.5) {
        if (d > 0.5) {
          discard;
        }
        float blink = 0.1 * sin(uTime * vRandom.z * 2.0);
        gl_FragColor = vec4(vColor + blink, 1.0);
      } else {
        float circle = smoothstep(0.5, 0.4, d) * 0.8;
        float blink = 0.1 * sin(uTime * vRandom.z * 2.0);
        gl_FragColor = vec4(vColor + blink, circle);
      }
    }
  }
`;

export const NightOfStars: React.FC<NightOfStarsProps> = ({
  particleCount = 1000, // Default star count
  meteorCount = 10, // Default meteor count
  particleSpread = 20, // Spread for particles
  speed = 0.05, // Star speed
  meteorSpeed = 0.5, // Meteor speed
  particleColors, // Custom star colors
  meteorColors, // Custom meteor colors
  backgroundMode = 'night', // Default to night mode
  moveParticlesOnHover = false, // Disable hover by default
  particleHoverFactor = 0, // Hover factor
  alphaParticles = true, // Enable alpha
  particleBaseSize = 10, // Star size
  meteorBaseSize = 20, // Meteor size
  sizeRandomness = 0.5, // Size variation
  cameraDistance = 30, // Camera distance
  disableRotation = true, // Disable rotation
  className, // CSS class
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Set up renderer
    const renderer = new Renderer({ depth: false, alpha: true });
    const gl = renderer.gl;
    container.appendChild(gl.canvas);
    gl.clearColor(0, 0, 0, 0);

    // Set up camera
    const camera = new Camera(gl, { fov: 15 });
    camera.position.set(0, 0, cameraDistance);

    // Handle resize
    const resize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      renderer.setSize(width, height);
      camera.perspective({ aspect: gl.canvas.width / gl.canvas.height });
    };
    window.addEventListener('resize', resize, false);
    resize();

    // Handle mouse movement
    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouseRef.current = { x, y };
    };

    if (moveParticlesOnHover) {
      container.addEventListener('mousemove', handleMouseMove);
    }

    // Select color palette based on background mode
    const starPalette =
      particleColors && particleColors.length > 0
        ? particleColors
        : backgroundMode === 'night'
        ? nightColors
        : lightColors;
    const _meteorPalette =
      meteorColors && meteorColors.length > 0
        ? meteorColors
        : backgroundMode === 'night'
        ? nightMeteorColors
        : lightMeteorColors;

    // Data for stars
    const starCount = particleCount;
    const starPositions = new Float32Array(starCount * 3);
    const starRandoms = new Float32Array(starCount * 4);
    const starColors = new Float32Array(starCount * 3);
    const starIsMeteor = new Float32Array(starCount).fill(0.0);

    // Data for meteors
    const totalMeteorCount = meteorCount;
    const meteorPositions = new Float32Array(totalMeteorCount * 3);
    const meteorRandoms = new Float32Array(totalMeteorCount * 4);
    const _meteorColors = new Float32Array(totalMeteorCount * 3);
    const meteorIsMeteor = new Float32Array(totalMeteorCount).fill(1.0);

    // Initialize stars
    for (let i = 0; i < starCount; i++) {
      let x: number, y: number, z: number, len: number;
      do {
        x = Math.random() * 2 - 1;
        y = Math.random() * 2 - 1;
        z = Math.random() * 2 - 1;
        len = x * x + y * y + z * z;
      } while (len > 1 || len === 0);
      const r = Math.cbrt(Math.random());
      starPositions.set([x * r, y * r, z * r], i * 3);
      starRandoms.set(
        [Math.random(), Math.random(), Math.random(), Math.random()],
        i * 4
      );
      const col = hexToRgb(
        starPalette[Math.floor(Math.random() * starPalette.length)]
      );
      starColors.set(col, i * 3);
    }

    // Initialize meteors (start from top-right)
    for (let i = 0; i < totalMeteorCount; i++) {
      let x: number, y: number, z: number, len: number;
      do {
        x = Math.random(); // Start from right half
        y = Math.random(); // Start from top half
        z = Math.random() * 2 - 1;
        len = x * x + y * y + z * z;
      } while (len > 1 || len === 0);
      const r = Math.cbrt(Math.random());
      meteorPositions.set([x * r, y * r, z * r], i * 3);
      meteorRandoms.set(
        [Math.random(), Math.random(), Math.random(), Math.random()],
        i * 4
      );
      const col = hexToRgb(
        _meteorPalette[Math.floor(Math.random() * _meteorPalette.length)]
      );
      _meteorColors.set(col, i * 3);
    }

    // Combine star and meteor data
    const positions = new Float32Array([...starPositions, ...meteorPositions]);
    const randoms = new Float32Array([...starRandoms, ...meteorRandoms]);
    const colors = new Float32Array([...starColors, ..._meteorColors]);
    const isMeteor = new Float32Array([...starIsMeteor, ...meteorIsMeteor]);

    // Create geometry
    const geometry = new Geometry(gl, {
      position: { size: 3, data: positions },
      random: { size: 4, data: randoms },
      color: { size: 3, data: colors },
      isMeteor: { size: 1, data: isMeteor },
    });

    // Create shader program
    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        uTime: { value: 0 },
        uSpread: { value: particleSpread },
        uBaseSize: { value: particleBaseSize },
        uMeteorBaseSize: { value: meteorBaseSize },
        uSizeRandomness: { value: sizeRandomness },
        uSpeed: { value: speed },
        uMeteorSpeed: { value: meteorSpeed },
        uAlphaParticles: { value: alphaParticles ? 1 : 0 },
      },
      transparent: true,
      depthTest: false,
    });

    // Create mesh
    const particles = new Mesh(gl, { mode: gl.POINTS, geometry, program });

    let animationFrameId: number;
    let lastTime = performance.now();
    let elapsed = 0;

    // Animation loop
    const update = (t: number) => {
      animationFrameId = requestAnimationFrame(update);
      const delta = t - lastTime;
      lastTime = t;
      elapsed += delta;

      program.uniforms.uTime.value = elapsed * 0.001;

      // Apply hover effect if enabled
      if (moveParticlesOnHover) {
        particles.position.x = -mouseRef.current.x * particleHoverFactor;
        particles.position.y = -mouseRef.current.y * particleHoverFactor;
      } else {
        particles.position.x = 0;
        particles.position.y = 0;
      }

      // Apply rotation if enabled
      if (!disableRotation) {
        particles.rotation.x = Math.sin(elapsed * 0.0002) * 0.1;
        particles.rotation.y = Math.cos(elapsed * 0.0005) * 0.15;
        particles.rotation.z += 0.01 * speed;
      }

      renderer.render({ scene: particles, camera });
    };

    animationFrameId = requestAnimationFrame(update);

    // Cleanup
    return () => {
      window.removeEventListener('resize', resize);
      if (moveParticlesOnHover) {
        container.removeEventListener('mousemove', handleMouseMove);
      }
      cancelAnimationFrame(animationFrameId);
      if (container.contains(gl.canvas)) {
        container.removeChild(gl.canvas);
      }
    };
  }, [
    particleCount,
    meteorCount,
    particleSpread,
    speed,
    meteorSpeed,
    particleColors,
    meteorColors,
    backgroundMode,
    moveParticlesOnHover,
    particleHoverFactor,
    alphaParticles,
    particleBaseSize,
    meteorBaseSize,
    sizeRandomness,
    cameraDistance,
    disableRotation,
  ]);

  return (
    <div ref={containerRef} className={`relative w-full h-full ${className}`} />
  );
};
