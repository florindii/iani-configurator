/**
 * Face Tracking Service using MediaPipe Face Mesh
 * Provides real-time face detection and landmark tracking for virtual try-on
 */

import { FaceMesh, type Results } from '@mediapipe/face_mesh'
import { Camera } from '@mediapipe/camera_utils'

// Key facial landmarks for glasses positioning
// MediaPipe Face Mesh provides 468 landmarks
const LANDMARKS = {
  // Eye corners (for glasses width)
  LEFT_EYE_OUTER: 33,
  LEFT_EYE_INNER: 133,
  RIGHT_EYE_OUTER: 263,
  RIGHT_EYE_INNER: 362,

  // Nose bridge (for glasses position)
  NOSE_BRIDGE_TOP: 6,
  NOSE_BRIDGE_BOTTOM: 4,
  NOSE_TIP: 1,

  // Eye centers (for pupil distance)
  LEFT_EYE_CENTER: 468, // Actually use iris landmarks if available
  RIGHT_EYE_CENTER: 473,

  // Forehead (for hats)
  FOREHEAD_TOP: 10,
  FOREHEAD_CENTER: 151,

  // Ears (for earrings)
  LEFT_EAR: 127,
  RIGHT_EAR: 356,

  // Chin (for face rotation calculation)
  CHIN: 152,

  // Face oval points for face detection boundary
  FACE_OVAL: [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109]
}

export interface FaceLandmarks {
  // Eye positions (normalized 0-1)
  leftEye: { x: number; y: number; z: number }
  rightEye: { x: number; y: number; z: number }

  // Nose bridge (where glasses sit)
  noseBridge: { x: number; y: number; z: number }

  // Forehead (for hats)
  foreheadTop: { x: number; y: number; z: number }

  // Ears (for earrings)
  leftEar: { x: number; y: number; z: number }
  rightEar: { x: number; y: number; z: number }

  // Face rotation (in radians)
  rotation: {
    pitch: number  // Looking up/down
    yaw: number    // Looking left/right
    roll: number   // Head tilt
  }

  // Distance between eyes (for scaling)
  eyeDistance: number

  // Face bounding box
  boundingBox: {
    x: number
    y: number
    width: number
    height: number
  }

  // All raw landmarks (468 points)
  rawLandmarks: Array<{ x: number; y: number; z: number }>
}

export type FaceDetectedCallback = (landmarks: FaceLandmarks) => void
export type FaceLostCallback = () => void

export class FaceTrackingService {
  private faceMesh: FaceMesh | null = null
  private camera: Camera | null = null
  private isTracking = false
  private onFaceDetectedCallback: FaceDetectedCallback | null = null
  private onFaceLostCallback: FaceLostCallback | null = null
  private lastFaceDetected = false
  private initialized = false

  /**
   * Initialize MediaPipe Face Mesh
   */
  async initialize(): Promise<void> {
    if (this.initialized) return

    console.log('Initializing Face Tracking Service...')

    this.faceMesh = new FaceMesh({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
      }
    })

    this.faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true, // Enable iris tracking for better eye positions
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    })

    this.faceMesh.onResults(this.handleResults.bind(this))

    // Wait for model to load
    await this.faceMesh.initialize()

    this.initialized = true
    console.log('Face Tracking Service initialized')
  }

  /**
   * Start tracking with a video element
   */
  async startTracking(videoElement: HTMLVideoElement): Promise<void> {
    if (!this.initialized) {
      await this.initialize()
    }

    if (!this.faceMesh) {
      throw new Error('FaceMesh not initialized')
    }

    this.isTracking = true

    // Create camera instance to continuously send frames
    this.camera = new Camera(videoElement, {
      onFrame: async () => {
        if (this.isTracking && this.faceMesh) {
          await this.faceMesh.send({ image: videoElement })
        }
      },
      width: 640,
      height: 480
    })

    await this.camera.start()
    console.log('Face tracking started')
  }

  /**
   * Stop tracking
   */
  stopTracking(): void {
    this.isTracking = false

    if (this.camera) {
      this.camera.stop()
      this.camera = null
    }

    console.log('Face tracking stopped')
  }

  /**
   * Set callback for when a face is detected
   */
  onFaceDetected(callback: FaceDetectedCallback): void {
    this.onFaceDetectedCallback = callback
  }

  /**
   * Set callback for when face is lost
   */
  onFaceLost(callback: FaceLostCallback): void {
    this.onFaceLostCallback = callback
  }

  /**
   * Process face mesh results
   */
  private handleResults(results: Results): void {
    if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
      // No face detected
      if (this.lastFaceDetected && this.onFaceLostCallback) {
        this.onFaceLostCallback()
      }
      this.lastFaceDetected = false
      return
    }

    // Face detected
    this.lastFaceDetected = true
    const landmarks = results.multiFaceLandmarks[0]

    // Extract key landmarks
    const faceLandmarks = this.extractLandmarks(landmarks)

    if (this.onFaceDetectedCallback) {
      this.onFaceDetectedCallback(faceLandmarks)
    }
  }

  /**
   * Extract structured landmarks from raw MediaPipe data
   */
  private extractLandmarks(landmarks: Array<{ x: number; y: number; z: number }>): FaceLandmarks {
    // Get key points
    const leftEyeOuter = landmarks[LANDMARKS.LEFT_EYE_OUTER]
    const leftEyeInner = landmarks[LANDMARKS.LEFT_EYE_INNER]
    const rightEyeOuter = landmarks[LANDMARKS.RIGHT_EYE_OUTER]
    const rightEyeInner = landmarks[LANDMARKS.RIGHT_EYE_INNER]

    // Calculate eye centers
    const leftEye = {
      x: (leftEyeOuter.x + leftEyeInner.x) / 2,
      y: (leftEyeOuter.y + leftEyeInner.y) / 2,
      z: (leftEyeOuter.z + leftEyeInner.z) / 2
    }

    const rightEye = {
      x: (rightEyeOuter.x + rightEyeInner.x) / 2,
      y: (rightEyeOuter.y + rightEyeInner.y) / 2,
      z: (rightEyeOuter.z + rightEyeInner.z) / 2
    }

    const noseBridge = landmarks[LANDMARKS.NOSE_BRIDGE_TOP]
    const foreheadTop = landmarks[LANDMARKS.FOREHEAD_TOP]
    const leftEar = landmarks[LANDMARKS.LEFT_EAR]
    const rightEar = landmarks[LANDMARKS.RIGHT_EAR]
    // chin not needed here, calculated in rotation function

    // Calculate eye distance (for scaling)
    const eyeDistance = Math.sqrt(
      Math.pow(rightEye.x - leftEye.x, 2) +
      Math.pow(rightEye.y - leftEye.y, 2)
    )

    // Calculate face rotation
    const rotation = this.calculateRotation(landmarks)

    // Calculate bounding box
    const boundingBox = this.calculateBoundingBox(landmarks)

    return {
      leftEye,
      rightEye,
      noseBridge: { ...noseBridge },
      foreheadTop: { ...foreheadTop },
      leftEar: { ...leftEar },
      rightEar: { ...rightEar },
      rotation,
      eyeDistance,
      boundingBox,
      rawLandmarks: landmarks.map(l => ({ ...l }))
    }
  }

  /**
   * Calculate face rotation from landmarks
   */
  private calculateRotation(landmarks: Array<{ x: number; y: number; z: number }>): { pitch: number; yaw: number; roll: number } {
    const noseTip = landmarks[LANDMARKS.NOSE_TIP]
    const leftEye = landmarks[LANDMARKS.LEFT_EYE_OUTER]
    const rightEye = landmarks[LANDMARKS.RIGHT_EYE_OUTER]
    const chin = landmarks[LANDMARKS.CHIN]
    const forehead = landmarks[LANDMARKS.FOREHEAD_TOP]

    // Yaw (looking left/right) - based on nose position relative to eyes center
    const eyeCenterX = (leftEye.x + rightEye.x) / 2
    const yaw = (noseTip.x - eyeCenterX) * Math.PI * 2

    // Pitch (looking up/down) - based on nose-chin vs nose-forehead ratio
    const noseToChinY = chin.y - noseTip.y
    const noseToForeheadY = noseTip.y - forehead.y
    const pitch = (noseToChinY - noseToForeheadY) * Math.PI

    // Roll (head tilt) - based on eye line angle
    const roll = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x)

    return { pitch, yaw, roll }
  }

  /**
   * Calculate face bounding box
   */
  private calculateBoundingBox(landmarks: Array<{ x: number; y: number; z: number }>): { x: number; y: number; width: number; height: number } {
    const faceOvalPoints = LANDMARKS.FACE_OVAL.map(i => landmarks[i])

    let minX = 1, maxX = 0, minY = 1, maxY = 0

    for (const point of faceOvalPoints) {
      minX = Math.min(minX, point.x)
      maxX = Math.max(maxX, point.x)
      minY = Math.min(minY, point.y)
      maxY = Math.max(maxY, point.y)
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stopTracking()

    if (this.faceMesh) {
      this.faceMesh.close()
      this.faceMesh = null
    }

    this.initialized = false
    console.log('Face Tracking Service destroyed')
  }
}

// Singleton instance
let instance: FaceTrackingService | null = null

export function getFaceTrackingService(): FaceTrackingService {
  if (!instance) {
    instance = new FaceTrackingService()
  }
  return instance
}

export function destroyFaceTrackingService(): void {
  if (instance) {
    instance.destroy()
    instance = null
  }
}
