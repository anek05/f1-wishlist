import { useSphere } from '@react-three/cannon'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { Vector3, Quaternion, MathUtils } from 'three' 
import { useEffect, useRef } from 'react'

export default function Car({ joystickRef }) {
  const { scene } = useGLTF('/models/car.glb')
  const { camera } = useThree() 

const [ref, api] = useSphere(() => ({ 
    mass: 500, 
    position: [-24, 2, 3.5], 
    args: [0.7], 
    friction: 0,      // Bilen har redan 0 friktion, vilket är bra.
    
    // ÄNDRING: Lägg till dämpning!
    // Detta suger upp vibrations-energi så bilen slutar skaka.
    linearDamping: 0.5,  
    angularDamping: 0.5,

    angularFactor: [0, 1, 0], 
    allowSleep: false
  }))

  const velocity = useRef([0, 0, 0])
  useEffect(() => {
    const unsubscribe = api.velocity.subscribe((v) => (velocity.current = v))
    return unsubscribe
  }, [api.velocity])

  const worldPosition = new Vector3()
  const worldQuaternion = new Quaternion()
  const cameraOffset = new Vector3()
  
  const chassisRef = useRef()

  useFrame((state, delta) => {
    const { x, y } = joystickRef.current
    
    // --- 1. STYRNING & GAS ---
    if (!x && !y) {
       api.angularVelocity.set(0, 0, 0)
       api.velocity.set(
         velocity.current[0] * 0.95, 
         velocity.current[1], 
         velocity.current[2] * 0.95
       )
    } else {
       // SVÄNGA
       api.angularVelocity.set(0, -x * 3.0, 0)

       // GASA
       const forward = new Vector3(0, 0, 1)
       if(ref.current) {
         ref.current.getWorldQuaternion(worldQuaternion)
         forward.applyQuaternion(worldQuaternion)
       }
       
       forward.y = 0 
       forward.normalize() 

       // FIX 1: La till MINUS här! 
       // Nu betyder "Upp" på spaken att vi åker mot minus-Z (Framåt i 3D-världen)
       forward.multiplyScalar(-y * 25) 
       
       api.velocity.set(forward.x, velocity.current[1], forward.z) 
    }

    // --- 2. BACK-LUTNING ---
    if (chassisRef.current) {
        const speed = Math.sqrt(velocity.current[0]**2 + velocity.current[2]**2)
        let tilt = Math.atan2(velocity.current[1], speed + 0.1) 
        chassisRef.current.rotation.x = MathUtils.lerp(chassisRef.current.rotation.x, -tilt, 0.1)
    }

    // --- 3. KAMERA ---
    if(ref.current) {
        ref.current.getWorldPosition(worldPosition)
        ref.current.getWorldQuaternion(worldQuaternion)
        
        // Kameran ligger på +Z (10 meter bakom)
        cameraOffset.set(0, 6, 10) 
        cameraOffset.applyQuaternion(worldQuaternion)
        cameraOffset.add(worldPosition)
        
        camera.position.lerp(cameraOffset, 0.1)
        camera.lookAt(worldPosition)
    }
    
    // RESPAWN
    if (ref.current.position.y < -10) {
        api.position.set(-24, 2, 3.5)
        api.velocity.set(0,0,0)
    }
  })

  return (
    <mesh ref={ref}>
      <group ref={chassisRef} position={[0, -0.6, 0]}>
          <primitive 
            object={scene} 
            scale={1} 
            // FIX 2: Ändrade rotation till 0 (tog bort Math.PI)
            // Nu pekar bilens nos bort från kameran
            rotation={[0, 0, 0]} 
          />
      </group>
    </mesh>
  )
}