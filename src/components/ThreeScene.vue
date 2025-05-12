<!-- src/components/ThreeScene.vue -->
<template>
    <div ref="canvasContainer" class="viewer-container"></div>
  </template>
  
  <script setup>
  import { onMounted, ref } from 'vue'
  import * as THREE from 'three'
  import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
  import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
  
  const canvasContainer = ref(null)
  
  onMounted(() => {
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xf0f0f0)
  
    const camera = new THREE.PerspectiveCamera(75, canvasContainer.value.clientWidth / canvasContainer.value.clientHeight, 0.1, 1000)
    camera.position.set(0, 1, 3)
  
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(canvasContainer.value.clientWidth, canvasContainer.value.clientHeight)
    canvasContainer.value.appendChild(renderer.domElement)
  
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
  
    // LIGHTS
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
    scene.add(ambientLight)
  
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
    directionalLight.position.set(2, 1, 7)
    scene.add(directionalLight)

    const loader = new GLTFLoader()
      loader.load(
        '/models/Couch.glb', // <-- Replace this with your filename
        gltf => {
          const model = gltf.scene
          model.position.set(0, 0, 0)
          scene.add(model)
        },
        xhr => {
          console.log((xhr.loaded / xhr.total) * 100 + '% loaded')
        },
        error => {
          console.error('An error happened', error)
        }
      )
  
    // OBJECT (for now, a cube)
    // const geometry = new THREE.BoxGeometry()
    // const material = new THREE.MeshStandardMaterial({ color: 0x00aaff })
    // const cube = new THREE.Mesh(geometry, material)
    
    // scene.add(cube)

    camera.position.set(2, 1, 7)
camera.lookAt(0, 0, 0) // 🔥 Add this
scene.background = new THREE.Color(0x90EE90) // bright red

  
    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
  
    animate()
  
    // Resize handling
    window.addEventListener('resize', () => {
      camera.aspect = canvasContainer.value.clientWidth / canvasContainer.value.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(canvasContainer.value.clientWidth, canvasContainer.value.clientHeight)
    })
  })
  </script>
  
  <style scoped>
.viewer-container {
  width: 100vw; /* Full width */
  height: 100vh; /* Full height */
  display: block;
  overflow: hidden;
}

  </style>
  