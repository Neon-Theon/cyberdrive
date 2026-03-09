import React, { useMemo } from 'react';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { Grid, Instances, Instance } from '@react-three/drei';
import { useGameStore } from './store';
import { useFrame } from '@react-three/fiber';
import { TRACKS } from './data';
import * as THREE from 'three';

export function Track() {
  const selectedTrackId = useGameStore(state => state.selectedTrackId);
  const trackData = TRACKS[selectedTrackId] || TRACKS['neon-loop'];

  const { trackGeometry, neonLeftGeometry, neonRightGeometry, checkpoints, curve } = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(trackData.points, true, 'catmullrom', 0.5);
    
    // Create track cross-section shape
    const shape = new THREE.Shape();
    const w = trackData.width / 2;
    const wallHeight = 2;
    const wallThick = 1;
    
    shape.moveTo(-w - wallThick, wallHeight);
    shape.lineTo(-w, wallHeight);
    shape.lineTo(-w, 0);
    shape.lineTo(w, 0);
    shape.lineTo(w, wallHeight);
    shape.lineTo(w + wallThick, wallHeight);
    shape.lineTo(w + wallThick, -1);
    shape.lineTo(-w - wallThick, -1);
    shape.lineTo(-w - wallThick, wallHeight);

    const frenetFrames = curve.computeFrenetFrames(200, false);
    
    // Force the up vector (binormal) to be exactly [0, 1, 0] to prevent twisting
    for (let i = 0; i <= 200; i++) {
      const tangent = frenetFrames.tangents[i];
      const up = new THREE.Vector3(0, 1, 0);
      const normal = new THREE.Vector3().crossVectors(up, tangent).normalize();
      const binormal = new THREE.Vector3().crossVectors(tangent, normal).normalize();
      
      frenetFrames.normals[i].copy(normal);
      frenetFrames.binormals[i].copy(binormal);
    }

    const trackGeometry = new THREE.BufferGeometry();
    const vertices = [];
    const indices = [];
    
    const shapePoints = shape.getPoints();
    const pointsCount = 200;
    const curvePoints = curve.getSpacedPoints(pointsCount);
    
    for (let i = 0; i <= pointsCount; i++) {
      const pt = curvePoints[i];
      const normal = frenetFrames.normals[i];
      const binormal = frenetFrames.binormals[i];
      
      for (let j = 0; j < shapePoints.length; j++) {
        const shapePt = shapePoints[j];
        const vertex = pt.clone()
          .add(normal.clone().multiplyScalar(shapePt.x))
          .add(binormal.clone().multiplyScalar(shapePt.y));
        vertices.push(vertex.x, vertex.y, vertex.z);
      }
    }
    
    const shapePts = shapePoints.length;
    for (let i = 0; i < pointsCount; i++) {
      for (let j = 0; j < shapePts - 1; j++) {
        const a = i * shapePts + j;
        const b = i * shapePts + j + 1;
        const c = (i + 1) * shapePts + j;
        const d = (i + 1) * shapePts + j + 1;
        
        indices.push(a, b, d);
        indices.push(a, d, c);
      }
    }
    
    trackGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    trackGeometry.setIndex(indices);
    trackGeometry.computeVertexNormals();

    // Create neon strips
    // We can just use TubeGeometry for the neon strips, but we need to offset the points
    const points = curve.getSpacedPoints(200);
    
    const leftPoints = [];
    const rightPoints = [];
    
    for (let i = 0; i <= 200; i++) {
      const pt = points[i];
      const normal = frenetFrames.normals[i];
      
      const leftPt = pt.clone().add(normal.clone().multiplyScalar(-w + 0.1));
      leftPt.y += 0.1; // Slightly above floor
      leftPoints.push(leftPt);
      
      const rightPt = pt.clone().add(normal.clone().multiplyScalar(w - 0.1));
      rightPt.y += 0.1;
      rightPoints.push(rightPt);
    }
    
    const leftCurve = new THREE.CatmullRomCurve3(leftPoints, true);
    const rightCurve = new THREE.CatmullRomCurve3(rightPoints, true);
    
    const neonLeftGeometry = new THREE.TubeGeometry(leftCurve, 200, 0.2, 8, true);
    const neonRightGeometry = new THREE.TubeGeometry(rightCurve, 200, 0.2, 8, true);

    // Checkpoints (Start/Finish at 0, Halfway at 0.5)
    const startPt = curve.getPointAt(0);
    const startTangent = curve.getTangentAt(0);
    const startRotation = new THREE.Euler().setFromQuaternion(
      new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), startTangent)
    );

    const halfPt = curve.getPointAt(0.5);
    const halfTangent = curve.getTangentAt(0.5);
    const halfRotation = new THREE.Euler().setFromQuaternion(
      new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), halfTangent)
    );

    return { 
      trackGeometry, 
      neonLeftGeometry, 
      neonRightGeometry, 
      checkpoints: {
        start: { position: startPt, rotation: startRotation },
        half: { position: halfPt, rotation: halfRotation }
      },
      curve
    };
  }, [trackData]);

  React.useEffect(() => {
    return () => {
      trackGeometry.dispose();
      neonLeftGeometry.dispose();
      neonRightGeometry.dispose();
    };
  }, [trackGeometry, neonLeftGeometry, neonRightGeometry]);

  const obstacleColors = React.useMemo(() => {
    return {
      pink: new THREE.Color(2, 0, 2),
      wall: new THREE.Color(...trackData.wallColor)
    };
  }, [trackData.wallColor]);

  const obstacles = React.useMemo(() => {
    const points = curve.getPoints(1000);
    return Array.from({ length: 150 }).map((_, i) => {
      let x = (Math.random() - 0.5) * 1000;
      let z = (Math.random() - 0.5) * 1000;
      
      // Keep clear of the track
      // Find closest point on curve
      const pt = new THREE.Vector3(x, 0, z);
      let minDistance = Infinity;
      for (const p of points) {
        const dist = p.distanceTo(pt);
        if (dist < minDistance) minDistance = dist;
      }
      
      if (minDistance < trackData.width / 2 + 20) {
        return null;
      }
      
      const height = 10 + Math.random() * 40;
      const isPink = Math.random() > 0.5;
      
      return { id: i, x, z, height, isPink };
    }).filter(Boolean);
  }, [curve, trackData.width]);

  const pendingUpdates = React.useRef<{
    type: 'checkpoint' | 'finish';
  }[]>([]);

  const countdownRef = React.useRef<number | null>(null);

  const lastCheckpointTime = React.useRef(0);
  const lastTimeRef = React.useRef(performance.now());

  useFrame((_, delta) => {
    const now = performance.now();
    const realDelta = now - lastTimeRef.current;
    lastTimeRef.current = now;

    const gameState = useGameStore.getState();
    
    // Initialize ref from state if needed
    if (gameState.countdown !== null && countdownRef.current === null) {
      countdownRef.current = gameState.countdown;
    } else if (gameState.countdown === null && countdownRef.current !== null) {
      countdownRef.current = null;
    }
    
    // Handle countdown logic
    if (countdownRef.current !== null && !gameState.isPaused) {
      const oldCeil = Math.ceil(countdownRef.current);
      countdownRef.current -= realDelta / 1000;
      const newCeil = Math.ceil(countdownRef.current);
      
      if (countdownRef.current <= -1) {
        countdownRef.current = null;
        useGameStore.setState({ countdown: null, lapStarted: true });
      } else if (oldCeil !== newCeil) {
        useGameStore.setState({ countdown: countdownRef.current });
      }
    }

    if (gameState.lapStarted && !gameState.isPaused && countdownRef.current === null) {
      gameState.addLapTime(realDelta);
    }
    
    if (pendingUpdates.current.length > 0) {
      const updates = [...pendingUpdates.current];
      pendingUpdates.current = [];
      
      setTimeout(() => {
        updates.forEach(update => {
          if (update.type === 'checkpoint') {
            useGameStore.setState({ checkpointPassed: true });
          } else if (update.type === 'finish') {
            useGameStore.setState((state) => {
              if (state.checkpointPassed) {
                const currentLapTime = state.lapTime;
                const stateUpdates: any = {
                  lapTime: 0,
                  checkpointPassed: false,
                  pastLaps: [...state.pastLaps, currentLapTime]
                };
                
                if (!state.bestLap || currentLapTime < state.bestLap) {
                  stateUpdates.bestLap = currentLapTime;
                }
                
                if (state.currentLap < state.totalLaps) {
                  stateUpdates.currentLap = state.currentLap + 1;
                  stateUpdates.lapStarted = true;
                  return stateUpdates;
                } else {
                  stateUpdates.lapStarted = false;
                  stateUpdates.raceFinished = true;
                  
                  // Call actions outside of setState by using setTimeout, or just return the new state and call actions later.
                  // Actually, it's better to just call the actions after setState.
                  setTimeout(() => {
                    const latestState = useGameStore.getState();
                    latestState.addCredits(trackData.reward);
                    const totalTime = latestState.pastLaps.reduce((a, b) => a + b, 0);
                    latestState.completeTrack(trackData.id, totalTime);
                  }, 0);
                  
                  return stateUpdates;
                }
              } else if (!state.lapStarted && state.countdown === null) {
                return { lapTime: 0, lapStarted: true };
              }
              return state;
            });
          }
        });
      }, 0);
    }
  });

  return (
    <group>
      {/* Floor */}
      <RigidBody type="fixed" friction={0}>
        <mesh position={[0, -2, 0]}>
          <boxGeometry args={[2000, 1, 2000]} />
          <meshStandardMaterial color="#020005" roughness={0.8} metalness={0.2} />
        </mesh>
      </RigidBody>
      
      {/* Neon Grid */}
      <Grid
        position={[0, -1.49, 0]}
        args={[2000, 2000]}
        cellSize={2}
        cellThickness={1}
        cellColor={trackData.gridColor}
        sectionSize={10}
        sectionThickness={1.5}
        sectionColor={trackData.sectionColor}
        fadeDistance={400}
        fadeStrength={1}
      />

      {/* Track Mesh */}
      <RigidBody type="fixed" colliders="trimesh" friction={0} restitution={0}>
        <mesh geometry={trackGeometry}>
          <meshStandardMaterial color="#444455" roughness={0.7} metalness={0.3} side={THREE.DoubleSide} />
        </mesh>
      </RigidBody>

      {/* Invisible Smooth Driving Surface (Overrides trimesh floor) */}
      <RigidBody type="fixed" friction={0} restitution={0}>
        <CuboidCollider args={[2000, 0.1, 2000]} position={[0, -0.09, 0]} />
      </RigidBody>

      {/* Neon Strips */}
      <mesh geometry={neonLeftGeometry}>
        <meshBasicMaterial color={trackData.wallColor} />
      </mesh>
      <mesh geometry={neonRightGeometry}>
        <meshBasicMaterial color={trackData.wallColor} />
      </mesh>

      {/* Start/Finish Line */}
      <RigidBody type="fixed" colliders={false} position={checkpoints.start.position} rotation={checkpoints.start.rotation}>
        <CuboidCollider 
          args={[trackData.width / 2, 5, 2]} 
          position={[0, 5, 0]} 
          sensor 
          onIntersectionEnter={(e) => {
            const now = performance.now();
            if (now - lastCheckpointTime.current > 1000 && e.other?.rigidBodyObject?.name === 'car') {
              lastCheckpointTime.current = now;
              pendingUpdates.current.push({ type: 'finish' });
            }
          }} 
        />
        <mesh position={[0, 0.1, 0]}>
          <boxGeometry args={[trackData.width, 0.1, 4]} />
          <meshBasicMaterial color="#ffffff" wireframe />
        </mesh>
        {/* Finish Line Arch */}
        <mesh position={[0, 10, 0]}>
          <boxGeometry args={[trackData.width + 2, 1, 1]} />
          <meshBasicMaterial color={trackData.wallColor} />
        </mesh>
        <mesh position={[-trackData.width/2 - 0.5, 5, 0]}>
          <boxGeometry args={[1, 10, 1]} />
          <meshBasicMaterial color={trackData.wallColor} />
        </mesh>
        <mesh position={[trackData.width/2 + 0.5, 5, 0]}>
          <boxGeometry args={[1, 10, 1]} />
          <meshBasicMaterial color={trackData.wallColor} />
        </mesh>
      </RigidBody>

      {/* Checkpoint (Halfway) */}
      <RigidBody type="fixed" colliders={false} position={checkpoints.half.position} rotation={checkpoints.half.rotation}>
        <CuboidCollider 
          args={[trackData.width / 2, 5, 2]} 
          position={[0, 5, 0]} 
          sensor 
          onIntersectionEnter={(e) => {
            const now = performance.now();
            if (now - lastCheckpointTime.current > 1000 && e.other?.rigidBodyObject?.name === 'car') {
              lastCheckpointTime.current = now;
              pendingUpdates.current.push({ type: 'checkpoint' });
            }
          }} 
        />
        <mesh position={[0, 0.1, 0]}>
          <boxGeometry args={[trackData.width, 0.1, 4]} />
          <meshBasicMaterial color={trackData.gridColor} wireframe opacity={0.5} transparent />
        </mesh>
        {/* Checkpoint Arch */}
        <mesh position={[0, 10, 0]}>
          <boxGeometry args={[trackData.width + 2, 1, 1]} />
          <meshBasicMaterial color={trackData.gridColor} />
        </mesh>
        <mesh position={[-trackData.width/2 - 0.5, 5, 0]}>
          <boxGeometry args={[1, 10, 1]} />
          <meshBasicMaterial color={trackData.gridColor} />
        </mesh>
        <mesh position={[trackData.width/2 + 0.5, 5, 0]}>
          <boxGeometry args={[1, 10, 1]} />
          <meshBasicMaterial color={trackData.gridColor} />
        </mesh>
      </RigidBody>

      {/* Some Obstacles / Buildings */}
      <RigidBody type="fixed">
        {obstacles.map((obs: any) => (
          <CuboidCollider key={obs.id} args={[2.5, obs.height / 2, 2.5]} position={[obs.x, obs.height / 2 - 1, obs.z]} />
        ))}
      </RigidBody>

      <Instances limit={150}>
        <boxGeometry args={[5, 1, 5]} />
        <meshStandardMaterial color="#050505" roughness={0.2} metalness={0.8} />
        {obstacles.map((obs: any) => (
          <Instance key={`b-${obs.id}`} position={[obs.x, obs.height / 2 - 1, obs.z]} scale={[1, obs.height, 1]} />
        ))}
      </Instances>

      <Instances limit={150}>
        <boxGeometry args={[1, 1, 0.02]} />
        <meshBasicMaterial />
        {obstacles.map((obs: any) => (
          <Instance key={`f1-${obs.id}`} position={[obs.x, obs.height / 2 - 1, obs.z + 2.51]} scale={[1, obs.height, 1]} color={obs.isPink ? obstacleColors.pink : obstacleColors.wall} />
        ))}
      </Instances>

      <Instances limit={150}>
        <boxGeometry args={[1, 1, 0.02]} />
        <meshBasicMaterial />
        {obstacles.map((obs: any) => (
          <Instance key={`f2-${obs.id}`} position={[obs.x, obs.height / 2 - 1, obs.z - 2.51]} scale={[1, obs.height, 1]} color={obs.isPink ? obstacleColors.pink : obstacleColors.wall} />
        ))}
      </Instances>

      <Instances limit={150}>
        <boxGeometry args={[0.02, 1, 1]} />
        <meshBasicMaterial />
        {obstacles.map((obs: any) => (
          <Instance key={`f3-${obs.id}`} position={[obs.x + 2.51, obs.height / 2 - 1, obs.z]} scale={[1, obs.height, 1]} color={obs.isPink ? obstacleColors.pink : obstacleColors.wall} />
        ))}
      </Instances>

      <Instances limit={150}>
        <boxGeometry args={[0.02, 1, 1]} />
        <meshBasicMaterial />
        {obstacles.map((obs: any) => (
          <Instance key={`f4-${obs.id}`} position={[obs.x - 2.51, obs.height / 2 - 1, obs.z]} scale={[1, obs.height, 1]} color={obs.isPink ? obstacleColors.pink : obstacleColors.wall} />
        ))}
      </Instances>
    </group>
  );
}
