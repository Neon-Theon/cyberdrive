import { useFrame } from '@react-three/fiber';
import { useBeforePhysicsStep } from '@react-three/rapier';
import React, { useRef } from 'react';
import { RigidBody, RapierRigidBody, CapsuleCollider } from '@react-three/rapier';
import { Edges } from '@react-three/drei';
import * as THREE from 'three';
import { useKeyboard } from './useKeyboard';
import { useGameStore, getUpgradedCarStats } from './store';
import { CARS, TRACKS } from './data';

interface SkidMark {
  id: number;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  opacity: number;
}

const _velocityVec = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _lateralVelocity = new THREE.Vector3();
const _lateralImpulse = new THREE.Vector3();
const _impulse = new THREE.Vector3();
const _cameraOffset = new THREE.Vector3();
const _cameraTarget = new THREE.Vector3();
const _idealLookAt = new THREE.Vector3();
const _currentLookAt = new THREE.Vector3();
const _euler = new THREE.Euler();
const _wheelOffset = new THREE.Vector3();

const MAX_SKID_MARKS = 200;
const _skidMatrix = new THREE.Matrix4();
const _skidPosition = new THREE.Vector3();
const _skidRotation = new THREE.Euler();
const _skidQuaternion = new THREE.Quaternion();
const _skidScale = new THREE.Vector3(1, 1, 1);

export function Car() {
  const bodyRef = useRef<RapierRigidBody>(null);
  const tailLightsRef = useRef<THREE.MeshBasicMaterial>(null);
  const exhaustLeftRef = useRef<THREE.Mesh>(null);
  const exhaustRightRef = useRef<THREE.Mesh>(null);
  const keys = useKeyboard();
  
  const selectedCarId = useGameStore(state => state.selectedCarId);
  const ownedCars = useGameStore(state => state.ownedCars);
  const carData = React.useMemo(() => getUpgradedCarStats(selectedCarId, ownedCars) || CARS['retro-hatch'], [selectedCarId, ownedCars]);
  const selectedTrackId = useGameStore(state => state.selectedTrackId);
  const trackData = TRACKS[selectedTrackId] || TRACKS['neon-loop'];

  const curve = React.useMemo(() => new THREE.CatmullRomCurve3(trackData.points, true, 'catmullrom', 0.5), [trackData]);
  const curvePoints = React.useMemo(() => curve.getPoints(100), [curve]);

  const startTransform = React.useMemo(() => {
    const startPt = curve.getPointAt(0);
    const startTangent = curve.getTangentAt(0);
    const startRotation = new THREE.Euler().setFromQuaternion(
      new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), startTangent)
    );
    return {
      position: [startPt.x, startPt.y + 1, startPt.z] as [number, number, number],
      rotation: [startRotation.x, startRotation.y, startRotation.z] as [number, number, number]
    };
  }, [curve]);

  // Skid marks state
  const skidMarksRef = useRef<THREE.InstancedMesh>(null);
  const skidIndexRef = useRef(0);
  const lastSkidTime = useRef(0);
  const isDriftingRef = useRef(false);
  const resetPressedRef = useRef(false);
  
  const carStateRef = useRef({
    position: new THREE.Vector3(),
    rotation: new THREE.Quaternion(),
    velocity: new THREE.Vector3(),
    speed: 0
  });

  useBeforePhysicsStep((world) => {
    if (useGameStore.getState().isPaused) return;
    const delta = world.timestep || 1 / 60;
    if (!bodyRef.current) return;

    const body = bodyRef.current;
    const rawPos = body.translation();
    const rawRot = body.rotation();
    const position = { 
      x: Number.isFinite(rawPos.x) ? rawPos.x : 0, 
      y: Number.isFinite(rawPos.y) ? rawPos.y : 0, 
      z: Number.isFinite(rawPos.z) ? rawPos.z : 0 
    };
    const rotation = { 
      x: Number.isFinite(rawRot.x) ? rawRot.x : 0, 
      y: Number.isFinite(rawRot.y) ? rawRot.y : 0, 
      z: Number.isFinite(rawRot.z) ? rawRot.z : 0, 
      w: Number.isFinite(rawRot.w) ? rawRot.w : 1 
    };
    
    const rawVel = body.linvel();
    _velocityVec.set(
      Number.isFinite(rawVel.x) ? rawVel.x : 0, 
      Number.isFinite(rawVel.y) ? rawVel.y : 0, 
      Number.isFinite(rawVel.z) ? rawVel.z : 0 
    );
    const currentSpeed = _velocityVec.length() || 0;
    
    carStateRef.current.position.set(position.x, position.y, position.z);
    carStateRef.current.rotation.set(rotation.x, rotation.y, rotation.z, rotation.w);
    carStateRef.current.velocity.copy(_velocityVec);
    carStateRef.current.speed = currentSpeed;

    const mass = body.mass();
    
    // Calculate forward and right vectors based on car's rotation
    _forward.set(0, 0, -1).applyQuaternion(carStateRef.current.rotation);
    _right.set(1, 0, 0).applyQuaternion(carStateRef.current.rotation);
    
    const speedKmH = Math.round(currentSpeed * 3.6) || 0;

    // --- INPUT HANDLING (Keyboard + Gamepad) ---
    let accelInput = keys.forward ? 1 : 0;
    let brakeInput = keys.brake ? 1 : 0;
    let reverseInput = keys.backward ? 1 : 0;
    let steerInput = 0;

    if (keys.left) steerInput += 1;
    if (keys.right) steerInput -= 1;

    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    let gp: Gamepad | null = null;
    for (let i = 0; i < gamepads.length; i++) {
      if (gamepads[i]) {
        gp = gamepads[i];
        break;
      }
    }

    if (gp) {
      if (Math.abs(gp.axes[0]) > 0.05) steerInput -= gp.axes[0];
      if (gp.buttons[7]) accelInput = Math.max(accelInput, gp.buttons[7].value);
      if (gp.buttons[6]) brakeInput = Math.max(brakeInput, gp.buttons[6].value);
    }

    const resetPressed = keys.reset || (gp && gp.buttons[3] && gp.buttons[3].pressed);
    if (resetPressed && !resetPressedRef.current) {
      resetPressedRef.current = true;
      
      // Find closest point on curve
      let closestPoint = curvePoints[0];
      let minDistance = Infinity;
      let closestT = 0;
      
      for (let i = 0; i < curvePoints.length; i++) {
        const dist = carStateRef.current.position.distanceTo(curvePoints[i]);
        if (dist < minDistance) {
          minDistance = dist;
          closestPoint = curvePoints[i];
          closestT = i / (curvePoints.length - 1);
        }
      }
      
      const tangent = curve.getTangentAt(closestT);
      const startRotation = new THREE.Euler().setFromQuaternion(
        new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), tangent)
      );
      
      body.setTranslation({ x: closestPoint.x, y: closestPoint.y + 1.5, z: closestPoint.z }, true);
      body.setRotation(new THREE.Quaternion().setFromEuler(startRotation), true);
      body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    } else if (!resetPressed) {
      resetPressedRef.current = false;
    }

    steerInput = Math.max(-1, Math.min(1, steerInput));

    const countdown = useGameStore.getState().countdown;
    if (countdown !== null && countdown > 0) {
      accelInput = 0;
      brakeInput = 0;
      reverseInput = 0;
      steerInput = 0;
      
      // Keep the car completely stationary on X/Z axes during countdown
      if (bodyRef.current) {
        const linvel = bodyRef.current.linvel();
        bodyRef.current.setLinvel({ x: 0, y: linvel.y, z: 0 }, true);
        bodyRef.current.setAngvel({ x: 0, y: 0, z: 0 }, true);
      }
    }

    // --- PHYSICS PARAMETERS ---
    const maxSpeedMs = carData.maxSpeed;
    const accelRate = carData.accelRate;
    const brakeRate = carData.brakeRate;
    const coastRate = 2.0;
    
    // Wrong way detection
    let minDistance = Infinity;
    let closestT = 0;
    for (let i = 0; i < curvePoints.length; i++) {
      const dist = carStateRef.current.position.distanceTo(curvePoints[i]);
      if (dist < minDistance) {
        minDistance = dist;
        closestT = i / (curvePoints.length - 1);
      }
    }
    const tangent = curve.getTangentAt(closestT);
    if (currentSpeed > 5) {
      const dot = _forward.dot(tangent);
      // forward vector points in -Z direction relative to car.
      // let's check if dot product is positive or negative.
      // Actually, if the car is moving forward, _forward is the direction it's facing.
      // If dot < -0.5, it's facing the wrong way.
      const isWrongWay = dot < -0.5;
      if (useGameStore.getState().wrongWay !== isWrongWay) {
        useGameStore.setState({ wrongWay: isWrongWay });
      }
    } else if (useGameStore.getState().wrongWay) {
      useGameStore.setState({ wrongWay: false });
    }

    const forwardVelocity = _velocityVec.dot(_forward);
    
    let force = 0;
    if (accelInput > 0 && currentSpeed < maxSpeedMs) {
      force += mass * accelRate * accelInput;
    }
    
    if (brakeInput > 0) {
      if (forwardVelocity > 1) {
        force -= mass * brakeRate * brakeInput;
      } else {
        force -= mass * accelRate * 0.5 * brakeInput;
      }
    } else if (reverseInput > 0) {
      force -= mass * accelRate * 0.5 * reverseInput;
    } else if (accelInput === 0) {
      if (Math.abs(forwardVelocity) > 0.5) {
        force -= mass * coastRate * Math.sign(forwardVelocity);
      }
    }

    _impulse.copy(_forward).multiplyScalar(force * delta);
    const impulseX = Number.isFinite(_impulse.x) ? _impulse.x : 0;
    const impulseY = Number.isFinite(_impulse.y) ? _impulse.y : 0;
    const impulseZ = Number.isFinite(_impulse.z) ? _impulse.z : 0;
    body.applyImpulse({ x: impulseX, y: impulseY, z: impulseZ }, true);

    // Steering
    const understeerFactor = 1 - (carData.understeer * Math.min(currentSpeed / maxSpeedMs, 1));
    const steeringTorque = mass * 15 * carData.grip * understeerFactor;
    const speedFactor = Math.min(Math.max(currentSpeed / 5, 0.1), 1) * (1 - Math.min(currentSpeed / maxSpeedMs, 0.5)); 
    const directionMultiplier = forwardVelocity < -0.5 ? -1 : 1;
    const torque = steeringTorque * speedFactor * steerInput * directionMultiplier;
    
    if (currentSpeed > 1) {
      const torqueY = Number.isFinite(torque * delta) ? torque * delta : 0;
      body.applyTorqueImpulse({ x: 0, y: torqueY, z: 0 }, true);
    }

    // Simulate grip
    _lateralVelocity.copy(_right).multiplyScalar(_velocityVec.dot(_right));
    let gripFactor = 0.95 * carData.grip;
    
    const turnIntensity = Math.abs(steerInput);
    const oversteerSlide = carData.oversteer * turnIntensity * Math.min(currentSpeed / 30, 1);
    
    const isDrifting = (brakeInput > 0 && currentSpeed > 20) || oversteerSlide > 0.4;
    isDriftingRef.current = isDrifting;
    
    if (isDrifting) {
      gripFactor = Math.max(0.1, (0.4 - oversteerSlide * 0.2)) * carData.grip; // Drift when braking or oversteering
      
      // Add a bit of extra rotation when drifting to simulate the tail stepping out
      if (currentSpeed > 5 && turnIntensity > 0) {
        const driftTorque = mass * 5 * carData.oversteer * steerInput * delta;
        body.applyTorqueImpulse({ x: 0, y: driftTorque, z: 0 }, true);
      }
    }
    
    _lateralImpulse.copy(_lateralVelocity).multiplyScalar(-mass * Math.min(gripFactor * delta * 60, 1));
    const latX = Number.isFinite(_lateralImpulse.x) ? _lateralImpulse.x : 0;
    const latY = Number.isFinite(_lateralImpulse.y) ? _lateralImpulse.y : 0;
    const latZ = Number.isFinite(_lateralImpulse.z) ? _lateralImpulse.z : 0;
    body.applyImpulse({ x: latX, y: latY, z: latZ }, true);
  });

  useFrame((state, delta) => {
    if (!bodyRef.current) return;
    
    const gameState = useGameStore.getState();
    if (gameState.isPaused) return;

    const rawPos = bodyRef.current.translation();
    const rawRot = bodyRef.current.rotation();
    
    const position = carStateRef.current.position.set(rawPos.x, rawPos.y, rawPos.z);
    const rotation = carStateRef.current.rotation.set(rawRot.x, rawRot.y, rawRot.z, rawRot.w);
    
    const currentSpeed = carStateRef.current.speed;
    const maxSpeedMs = carData.maxSpeed;
    const speedKmH = Math.round(currentSpeed * 3.6) || 0;

    // Fake RPM and Gear logic
    const maxGears = 6;
    const topSpeedKmh = carData.maxSpeed * 3.6;
    const gearSpeedStep = topSpeedKmh / maxGears;
    const gear = Math.min(maxGears, Math.max(1, Math.ceil(speedKmH / gearSpeedStep))) || 1;
    
    const gearMaxSpeed = gear * gearSpeedStep;
    const gearMinSpeed = (gear - 1) * gearSpeedStep;
    const rpm = 1000 + Math.max(0, Math.min(1, (speedKmH - gearMinSpeed) / (gearMaxSpeed - gearMinSpeed))) * 7000 || 1000;
    
    // Only update state if it changed significantly to avoid spamming renders
    if (Math.abs(gameState.speed - speedKmH) > 2 || gameState.gear !== gear || Math.abs(gameState.rpm - rpm) > 100) {
        useGameStore.setState({ speed: speedKmH, gear, rpm });
    }

    // --- INPUT HANDLING (Keyboard + Gamepad) ---
    let accelInput = keys.forward ? 1 : 0;
    let brakeInput = keys.brake ? 1 : 0;

    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    let gp: Gamepad | null = null;
    for (let i = 0; i < gamepads.length; i++) {
      if (gamepads[i]) {
        gp = gamepads[i];
        break;
      }
    }

    if (gp) {
      if (gp.buttons[7]) accelInput = Math.max(accelInput, gp.buttons[7].value);
      if (gp.buttons[6]) brakeInput = Math.max(brakeInput, gp.buttons[6].value);
    }

    if (tailLightsRef.current) {
      const intensity = brakeInput > 0 ? 5 : 1;
      tailLightsRef.current.color.setRGB(intensity, 0, 0);
    }

    // Update exhaust flames visually
    const flameScale = accelInput > 0 ? accelInput * (0.5 + Math.random() * 0.5) : 0.1;
    if (exhaustLeftRef.current) exhaustLeftRef.current.scale.set(1, 1, flameScale);
    if (exhaustRightRef.current) exhaustRightRef.current.scale.set(1, 1, flameScale);

    // --- SKID MARKS LOGIC ---
    const now = state.clock.getElapsedTime();
    const isDrifting = isDriftingRef.current;
    if (isDrifting && now - lastSkidTime.current > 0.05) {
      lastSkidTime.current = now;
      
      _euler.setFromQuaternion(rotation);
      
      // Calculate wheel positions relative to car center
      const w = 2, l = 4; // approximate dimensions
      const wheelOffsets = [
        [-w/2 - 0.1, -0.45, l/2 - 0.5], // Back Left
        [w/2 + 0.1, -0.45, l/2 - 0.5],  // Back Right
        [-w/2 - 0.1, -0.45, -l/2 + 0.5],// Front Left
        [w/2 + 0.1, -0.45, -l/2 + 0.5]  // Front Right
      ];

      if (skidMarksRef.current) {
        wheelOffsets.forEach(offset => {
          _wheelOffset.set(offset[0], offset[1], offset[2]);
          _skidPosition.copy(_wheelOffset).applyQuaternion(rotation).add(position);
          _skidPosition.y = -1.48; // Flat on ground (track is at -1.5)
          
          _skidRotation.set(-Math.PI / 2, 0, _euler.y);
          _skidQuaternion.setFromEuler(_skidRotation);
          
          _skidMatrix.compose(_skidPosition, _skidQuaternion, _skidScale);
          
          skidMarksRef.current!.setMatrixAt(skidIndexRef.current, _skidMatrix);
          skidIndexRef.current = (skidIndexRef.current + 1) % MAX_SKID_MARKS;
        });
        skidMarksRef.current.instanceMatrix.needsUpdate = true;
      }
    }

    // --- CAMERA DYNAMICS ---
    // Dynamic FOV for sense of speed
    const targetFov = 60 + (currentSpeed / maxSpeedMs) * 35; // FOV goes from 60 to 95
    const camera = state.camera as THREE.PerspectiveCamera;
    camera.fov = THREE.MathUtils.damp(camera.fov, targetFov, 5, delta);
    camera.updateProjectionMatrix();

    // Camera follow with slight shake at high speeds
    const shake = currentSpeed > 50 ? (Math.random() - 0.5) * ((currentSpeed - 50) / maxSpeedMs) * 0.1 : 0;
    _cameraOffset.set(shake, 2.5 + shake, 6).applyQuaternion(rotation);
    _cameraTarget.copy(position).add(_cameraOffset);
    
    // Smoothly interpolate camera position
    camera.position.lerp(_cameraTarget, 1 - Math.exp(-10 * delta));
    
    // Smoothly interpolate look-at target to prevent micro-stutters
    _idealLookAt.set(position.x, position.y + 1, position.z);
    if (_currentLookAt.lengthSq() === 0) _currentLookAt.copy(_idealLookAt);
    _currentLookAt.lerp(_idealLookAt, 1 - Math.exp(-15 * delta));
    
    camera.lookAt(_currentLookAt);
  });

  const w = 2, h = 0.8, l = 4; // approximate dimensions

  const actualL = carData.modelType === 'muscle' || carData.modelType === 'hyper' ? l * 1.1 :
                  carData.modelType === 'rally' ? l * 0.9 :
                  carData.modelType === 'f1' ? l * 1.2 : l;
                  
  const actualW = carData.modelType === 'muscle' ? w * 1.1 :
                  carData.modelType === 'hyper' ? w * 1.2 :
                  carData.modelType === 'rally' ? w * 0.9 :
                  carData.modelType === 'f1' ? w * 0.4 : w;

  const neonColorObj = React.useMemo(() => new THREE.Color(...carData.neonColor), [carData.neonColor]);

  return (
    <>
      <RigidBody 
        ref={bodyRef} 
        colliders={false} 
        linearDamping={0} 
        angularDamping={5} 
        friction={0}
        restitution={0}
        enabledRotations={[false, true, false]}
        position={startTransform.position}
        rotation={startTransform.rotation}
        name="car"
      >
        {/* Main Body Collider - Capsule prevents catching on trimesh edges */}
        <CapsuleCollider args={[l/2 - w/2, w/2]} position={[0, 0.2, 0]} rotation={[Math.PI/2, 0, 0]} />

        {/* Car Body */}
        <group>
          {carData.modelType === 'sports' && (
            <>
              <mesh position={[0, -0.1, 0]}>
                <boxGeometry args={[w, h * 0.8, l]} />
                <meshStandardMaterial color={carData.color} roughness={0.4} metalness={0.5} />
                <Edges color={neonColorObj} />
              </mesh>
              <mesh position={[0, h * 0.4, -0.2]}>
                <boxGeometry args={[w * 0.8, h * 0.6, l * 0.5]} />
                <meshStandardMaterial color="#050505" roughness={0.2} metalness={0.6} />
              </mesh>
              {/* Spoiler - only for non-retro-hatch sports cars */}
              {carData.id !== 'retro-hatch' && (
                <>
                  <mesh position={[0, h * 0.6, l/2 - 0.2]}>
                    <boxGeometry args={[w * 0.9, 0.1, 0.4]} />
                    <meshStandardMaterial color={carData.color} />
                    <Edges color={neonColorObj} />
                  </mesh>
                  <mesh position={[-w/2 + 0.2, h * 0.2, l/2 - 0.2]}>
                    <boxGeometry args={[0.1, 0.8, 0.2]} />
                    <meshStandardMaterial color={carData.color} />
                  </mesh>
                  <mesh position={[w/2 - 0.2, h * 0.2, l/2 - 0.2]}>
                    <boxGeometry args={[0.1, 0.8, 0.2]} />
                    <meshStandardMaterial color={carData.color} />
                  </mesh>
                </>
              )}
            </>
          )}

          {carData.modelType === 'muscle' && (
            <>
              <mesh position={[0, 0, 0]}>
                <boxGeometry args={[w * 1.1, h, l * 1.1]} />
                <meshStandardMaterial color={carData.color} roughness={0.4} metalness={0.4} />
                <Edges color={neonColorObj} />
              </mesh>
              <mesh position={[0, h * 0.6, 0]}>
                <boxGeometry args={[w * 0.9, h * 0.5, l * 0.4]} />
                <meshStandardMaterial color="#050505" roughness={0.2} metalness={0.6} />
              </mesh>
              {/* Engine block sticking out */}
              <mesh position={[0, h * 0.6, -l/2 + 0.8]}>
                <boxGeometry args={[0.6, 0.4, 0.8]} />
                <meshStandardMaterial color="#888" metalness={1} roughness={0.2} />
                <Edges color={neonColorObj} />
              </mesh>
            </>
          )}

          {carData.modelType === 'hyper' && (
            <>
              <mesh position={[0, -0.2, 0]}>
                <boxGeometry args={[w * 1.2, h * 0.5, l * 1.1]} />
                <meshStandardMaterial color={carData.color} roughness={0.3} metalness={0.6} />
                <Edges color={neonColorObj} />
              </mesh>
              <mesh position={[0, h * 0.2, -0.4]}>
                <boxGeometry args={[w * 0.7, h * 0.4, l * 0.6]} />
                <meshStandardMaterial color="#050505" roughness={0.2} metalness={0.6} />
              </mesh>
              {/* Aerodynamic fins */}
              <mesh position={[-w/2, h * 0.2, l/2 - 0.5]}>
                <boxGeometry args={[0.1, 0.6, 1]} />
                <meshStandardMaterial color={carData.color} />
                <Edges color={neonColorObj} />
              </mesh>
              <mesh position={[w/2, h * 0.2, l/2 - 0.5]}>
                <boxGeometry args={[0.1, 0.6, 1]} />
                <meshStandardMaterial color={carData.color} />
                <Edges color={neonColorObj} />
              </mesh>
            </>
          )}

          {carData.modelType === 'rally' && (
            <>
              <mesh position={[0, 0.1, 0]}>
                <boxGeometry args={[w * 0.9, h * 1.2, l * 0.9]} />
                <meshStandardMaterial color={carData.color} roughness={0.6} metalness={0.2} />
                <Edges color={neonColorObj} />
              </mesh>
              <mesh position={[0, h * 0.8, -0.2]}>
                <boxGeometry args={[w * 0.8, h * 0.6, l * 0.5]} />
                <meshStandardMaterial color="#050505" roughness={0.1} metalness={0.9} />
              </mesh>
              {/* Roof scoop */}
              <mesh position={[0, h * 1.5, -0.2]}>
                <boxGeometry args={[0.6, 0.2, 0.6]} />
                <meshStandardMaterial color={carData.color} />
              </mesh>
              {/* Big spoiler */}
              <mesh position={[0, h * 1.2, l/2 - 0.2]}>
                <boxGeometry args={[w, 0.1, 0.5]} />
                <meshStandardMaterial color={carData.color} />
                <Edges color={neonColorObj} />
              </mesh>
            </>
          )}

          {carData.modelType === 'f1' && (
            <>
              {/* Main body */}
              <mesh position={[0, -0.2, 0]}>
                <boxGeometry args={[w * 0.4, h * 0.4, l * 1.2]} />
                <meshStandardMaterial color={carData.color} roughness={0.2} metalness={0.8} />
                <Edges color={neonColorObj} />
              </mesh>
              {/* Front wing */}
              <mesh position={[0, -0.3, -l/2 - 0.4]}>
                <boxGeometry args={[w * 1.1, 0.1, 0.6]} />
                <meshStandardMaterial color={carData.color} />
                <Edges color={neonColorObj} />
              </mesh>
              {/* Rear wing */}
              <mesh position={[0, h * 0.5, l/2 + 0.2]}>
                <boxGeometry args={[w * 1.1, 0.1, 0.6]} />
                <meshStandardMaterial color={carData.color} />
                <Edges color={neonColorObj} />
              </mesh>
              <mesh position={[-w/2, 0, l/2 + 0.2]}>
                <boxGeometry args={[0.1, h, 0.6]} />
                <meshStandardMaterial color={carData.color} />
              </mesh>
              <mesh position={[w/2, 0, l/2 + 0.2]}>
                <boxGeometry args={[0.1, h, 0.6]} />
                <meshStandardMaterial color={carData.color} />
              </mesh>
              {/* Cockpit */}
              <mesh position={[0, h * 0.2, 0]}>
                <boxGeometry args={[w * 0.3, h * 0.3, l * 0.3]} />
                <meshStandardMaterial color="#050505" />
              </mesh>
            </>
          )}
        </group>
        
        {/* Neon Strips */}
        <mesh position={[0, -h/2 + 0.1, 0]}>
          <boxGeometry args={[w + 0.1, 0.1, l + 0.1]} />
          <meshBasicMaterial color={carData.neonColor} />
        </mesh>
        
        {/* Tail Lights */}
        <mesh position={[0, 0, actualL/2 + 0.01]}>
          <boxGeometry args={[actualW * 0.9, 0.2, 0.1]} />
          <meshBasicMaterial ref={tailLightsRef} color={[1, 0, 0]} />
        </mesh>
        
        {/* Headlights */}
        <mesh position={[0, 0, -actualL/2 - 0.01]}>
          <boxGeometry args={[actualW * 0.9, 0.2, 0.1]} />
          <meshBasicMaterial color={[2, 2, 2]} />
        </mesh>

        {/* Exhaust Flames */}
        <mesh ref={exhaustLeftRef} position={[-actualW/3, -h/2 + 0.2, actualL/2 + 0.1]} rotation={[-Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.15, 0.8, 8]} />
          <meshBasicMaterial color={[0, 2, 3]} />
        </mesh>
        <mesh ref={exhaustRightRef} position={[actualW/3, -h/2 + 0.2, actualL/2 + 0.1]} rotation={[-Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.15, 0.8, 8]} />
          <meshBasicMaterial color={[0, 2, 3]} />
        </mesh>

        {/* Wheels */}
        <mesh position={[-w/2 - 0.1, -h/2, l/2 - 0.5]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.4, 0.4, 0.3, 16]} />
          <meshStandardMaterial color="#050505" roughness={0.9} />
        </mesh>
        <mesh position={[w/2 + 0.1, -h/2, l/2 - 0.5]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.4, 0.4, 0.3, 16]} />
          <meshStandardMaterial color="#050505" roughness={0.9} />
        </mesh>
        <mesh position={[-w/2 - 0.1, -h/2, -l/2 + 0.5]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.4, 0.4, 0.3, 16]} />
          <meshStandardMaterial color="#050505" roughness={0.9} />
        </mesh>
        <mesh position={[w/2 + 0.1, -h/2, -l/2 + 0.5]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.4, 0.4, 0.3, 16]} />
          <meshStandardMaterial color="#050505" roughness={0.9} />
        </mesh>
      </RigidBody>

      {/* Render Skid Marks */}
      <instancedMesh ref={skidMarksRef} args={[undefined, undefined, MAX_SKID_MARKS]}>
        <planeGeometry args={[0.3, 1]} />
        <meshBasicMaterial color={0x000000} transparent opacity={0.4} depthWrite={false} />
      </instancedMesh>
    </>
  );
}
