import React, { useRef, useState, useLayoutEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { Physics, useTrimesh } from '@react-three/cannon'
import { Environment, useGLTF } from '@react-three/drei'
import { Joystick } from 'react-joystick-component'
import { Vector3, Quaternion } from 'three'
import Car from './Car'

/**
 * 🛠️ ActualTrackPhysics (The Baker Solution 👨‍🍳)
 * Den vinnande koden! Rör inte denna.
 */
function ActualTrackPhysics({ geometry, matrixWorld }) {
  const geo = geometry.clone()
  geo.applyMatrix4(matrixWorld)
  const nonIndexedGeo = geo.toNonIndexed()
  const vertices = nonIndexedGeo.attributes.position.array
  const vertexCount = vertices.length / 3
  const indices = new Uint32Array(vertexCount)
  for (let i = 0; i < vertexCount; i++) {
    indices[i] = i
  }

useTrimesh(() => ({
    args: [vertices, indices], 
    type: 'Static',
    position: [0, 0, 0], 
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    // ÄNDRING 1: Sänk friktionen från 0.8 till 0.01!
    // Vi gör asfalten superhal så bilen glider över skarvarna istället för att fastna.
    friction: 0.01, 
  }))

  return null
}

/**
 * 🏁 Track (Clean Version)
 * Inga röda linjer, bara ren racing!
 */
function Track() {
  const { scene } = useGLTF('/models/track-v1.glb')
  const [physicsParts, setPhysicsParts] = useState([])

  useLayoutEffect(() => {
    const partsToHarden = []
    scene.traverse((child) => {
      if (child.isMesh) {
        const name = child.name.toLowerCase()
        const isDrivable = 
          name.includes('road') ||          
          name.includes('tarmac') ||        
          name.includes('runoff') ||        
          name.includes('white_line') ||    
          name.includes('grass') ||         
          name.includes('sand_patches') ||  
          name.includes('barriers') ||
          name.includes('collision')

        if (isDrivable) {
          // Vi har tagit bort "debugMaterial" här -> Banan ser snygg ut igen!
          partsToHarden.push({
            geometry: child.geometry,
            matrixWorld: child.matrixWorld.clone()
          })
        }
      }
    })
    setPhysicsParts(partsToHarden)
  }, [scene])

  return (
    <group>
      <primitive object={scene} />
      {physicsParts.map((data, i) => (
        <ActualTrackPhysics key={i} geometry={data.geometry} matrixWorld={data.matrixWorld} />
      ))}
    </group>
  )
}

export default function App() {
  const joystickRef = useRef({ x: 0, y: 0 })

  const handleMove = (evt) => { joystickRef.current = { x: evt.x, y: evt.y } }
  const handleStop = () => { joystickRef.current = { x: 0, y: 0 } }

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#1a1a1a', position: 'relative' }}>
      
      <Canvas camera={{ position: [0, 20, 10], fov: 45 }}>
        <ambientLight intensity={0.4} />
        <Environment preset="sunset" />
        
        {/* Vi behåller step={1/120} för att fysiken ska vara mjuk och fin */}
        <Physics iterations={50} broadphase="SAP" gravity={[0, -9.82, 0]} step={1/120}>
            <Track />
            <Car joystickRef={joystickRef} />
        </Physics>

      </Canvas>

      <div style={{ position: 'absolute', bottom: 50, left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}>
        <Joystick size={120} baseColor="rgba(255, 255, 255, 0.2)" stickColor="#FFD700" move={handleMove} stop={handleStop} />
      </div>
    </div>
  )
}