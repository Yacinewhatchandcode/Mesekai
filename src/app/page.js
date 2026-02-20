'use client'

import { Button, Dropdown, Space, Switch } from 'antd'
import { DownOutlined } from '@ant-design/icons'
import { Camera } from '@mediapipe/camera_utils'
import { DrawingUtils } from '@mediapipe/tasks-vision'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Environment } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'

import Avatar, { resetFace, resetBody, resetLegs, resetHands } from '@/components/avatar'
import CameraDisplay from '@/components/camera'
import Controls from '@/components/controls'
import SetupPanel from '@/components/setup-panel'
import {
    CAM_WIDTH, CAM_HEIGHT, SCENES, DEFAULT_SCENE,
    FULLBODY_LOOKAT, HALFBODY_LOOKAT, HEADONLY_LOOKAT,
    LM_VIS_THRESH, lHIP, rHIP,
    BODY_SMOOTHING_FRAMES, HAND_SMOOTHING_FRAMES
} from '@/utils/constants'
import {
    createTrackers,
    drawFaceLandmarks,
    drawBodyLandmarks,
    drawHandLandmarks,
    computeAvgLandmarks
} from '@/utils/tracker'
import './globals.css'

const DEFAULT_AVATAR = 'https://models.readyplayer.me/622952275de1ae64c9ebe969.glb?morphTargets=ARKit'

let trackersCreated = false
let faceTracker, bodyTracker, handTracker
let trackFace = true, trackBody = true, trackHands = true
const bodyFrames = [], lHandFrames = [], rHandFrames = []

function processFrame(frame, drawingUtils, setters, isLiveRef) {
    if (!isLiveRef.current) return
    const { setFaceLandmarks, setBodyLandmarks, setlHandLandmarks, setrHandLandmarks, setLegsVisible } = setters

    if (trackFace) {
        const r = faceTracker.detectForVideo(frame, performance.now())
        setFaceLandmarks(r)
        drawFaceLandmarks(r.faceLandmarks, drawingUtils, CAM_HEIGHT / 1000)
    }
    if (trackBody) {
        const r = bodyTracker.detectForVideo(frame, performance.now())
        if (r.worldLandmarks?.length > 0) {
            const lm = r.worldLandmarks[0]
            bodyFrames.push(lm)
            if (bodyFrames.length === BODY_SMOOTHING_FRAMES) {
                computeAvgLandmarks(bodyFrames)
                setBodyLandmarks(bodyFrames[0])
                bodyFrames.shift()
                setLegsVisible(lm[lHIP].visibility > LM_VIS_THRESH && lm[rHIP].visibility > LM_VIS_THRESH)
            }
        }
        drawBodyLandmarks(r.landmarks, drawingUtils, CAM_HEIGHT / 1000, CAM_HEIGHT / 500)
    }
    if (trackHands) {
        const r = handTracker.detectForVideo(frame, performance.now())
        for (let i = 0; i < r.handedness.length; i++) {
            const hand = r.handedness[i][0]['categoryName']
            const hf = hand === 'Left' ? lHandFrames : rHandFrames
            hf.push(r.worldLandmarks[i])
            if (hf.length === HAND_SMOOTHING_FRAMES) {
                computeAvgLandmarks(hf)
                    ; (hand === 'Left' ? setlHandLandmarks : setrHandLandmarks)(hf[0])
                hf.shift()
            }
        }
        drawHandLandmarks(r.landmarks, drawingUtils, CAM_HEIGHT / 1000, CAM_HEIGHT / 1000)
    }
}

function useFPS() {
    const [fps, setFps] = useState(0)
    const fc = useRef(0), lt = useRef(performance.now())
    const tick = useCallback(() => {
        fc.current++
        const now = performance.now(), el = now - lt.current
        if (el >= 1000) { setFps(Math.round((fc.current * 1000) / el)); fc.current = 0; lt.current = now }
    }, [])
    return { fps, tick }
}

export default function Home() {
    // Mode: 'setup' or 'live'
    const [mode, setMode] = useState('setup')
    const isLiveRef = useRef(false)
    useEffect(() => { isLiveRef.current = mode === 'live' }, [mode])

    // Avatar
    const [avatarUrl, setAvatarUrl] = useState(DEFAULT_AVATAR)
    const [photoUrl, setPhotoUrl] = useState(null)
    const [accessories, setAccessories] = useState([])
    const [availableBones, setAvailableBones] = useState([])

    // Tracking state
    const [faceLandmarks, setFaceLandmarks] = useState(null)
    const [bodyLandmarks, setBodyLandmarks] = useState(null)
    const [lHandLandmarks, setlHandLandmarks] = useState(null)
    const [rHandLandmarks, setrHandLandmarks] = useState(null)
    const [legsVisible, setLegsVisible] = useState(false)
    const [trackLegs, setTrackLegs] = useState(true)
    const [scene, setScene] = useState(DEFAULT_SCENE)
    const [lookAt, setLookAt] = useState(FULLBODY_LOOKAT)

    // Loading
    const [loading, setLoading] = useState(true)
    const [loadProgress, setLoadProgress] = useState(0)
    const [loadStatus, setLoadStatus] = useState('Initializing...')

    const { fps, tick } = useFPS()
    const video = useRef(null)
    const canvas = useRef(null)

    // Handlers
    const handleAvatarUpload = useCallback((file) => {
        if (!file) return
        setAvatarUrl(URL.createObjectURL(file))
    }, [])

    const handlePhotoUpload = useCallback((file) => {
        if (!file) return
        setPhotoUrl(URL.createObjectURL(file))
    }, [])

    const handleAddAccessory = useCallback((file) => {
        if (!file) return
        setAccessories(prev => [...prev, {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: file.name.replace(/\.[^.]+$/, ''),
            url: URL.createObjectURL(file),
            boneName: 'Head',
            position: [0, 0, 0],
            rotation: [0, 0, 0],
            scale: 1,
        }])
    }, [])

    const handleUpdateAccessory = useCallback((id, updates) => {
        setAccessories(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a))
    }, [])

    const handleRemoveAccessory = useCallback((id) => {
        setAccessories(prev => {
            const acc = prev.find(a => a.id === id)
            if (acc) URL.revokeObjectURL(acc.url)
            return prev.filter(a => a.id !== id)
        })
    }, [])

    const handleBonesDetected = useCallback((bones) => {
        setAvailableBones(bones)
    }, [])

    // Camera / tracker init
    useEffect(() => {
        const canvasCtx = canvas.current.getContext('2d')
        const drawingUtils = new DrawingUtils(canvasCtx)
        let lastVideoTime = -1
        const setters = { setFaceLandmarks, setBodyLandmarks, setlHandLandmarks, setrHandLandmarks, setLegsVisible }

        setLoadStatus('Starting camera...'); setLoadProgress(10)

        const cam = new Camera(video.current, {
            onFrame: async () => {
                if (!trackersCreated) {
                    setLoadStatus('Loading AI models...'); setLoadProgress(30)
                        ;[faceTracker, bodyTracker, handTracker] = await createTrackers()
                    trackersCreated = true
                    setLoadStatus('Ready'); setLoadProgress(100)
                    setTimeout(() => setLoading(false), 400)
                }
                if (video.current && lastVideoTime !== video.current.currentTime) {
                    lastVideoTime = video.current.currentTime
                    if (canvasCtx && canvas.current) {
                        canvasCtx.save()
                        canvasCtx.clearRect(0, 0, canvas.current.width, canvas.current.height)
                        processFrame(video.current, drawingUtils, setters, isLiveRef)
                        canvasCtx.restore()
                    }
                    if (isLiveRef.current) tick()
                }
            },
            width: CAM_WIDTH, height: CAM_HEIGHT
        })
        cam.start()
        return () => cam.stop()
    }, [tick])

    return (
        <>
            {/* ═══ LOADING ═══ */}
            <div className={`loading-screen ${!loading ? 'hidden' : ''}`}>
                <div className="loading-logo">YaceAVATAR</div>
                <div className="loading-subtitle">Real-Time Motion Tracking</div>
                <div className="loading-progress">
                    <div className="loading-spinner"></div>
                    <div className="loading-bar-container">
                        <div className="loading-bar" style={{ width: `${loadProgress}%` }}></div>
                    </div>
                    <div className="loading-status">{loadStatus}</div>
                </div>
            </div>

            {/* ═══ 3D CANVAS (always rendered) ═══ */}
            <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
                <Canvas style={{ position: 'absolute', inset: 0 }}>
                    <Avatar
                        avatarUrl={avatarUrl}
                        accessories={accessories}
                        userFace={faceLandmarks}
                        userBody={bodyLandmarks}
                        userLHand={lHandLandmarks}
                        userRHand={rHandLandmarks}
                        legsVisible={legsVisible}
                        trackLegs={trackLegs}
                        isLive={mode === 'live'}
                        onBonesDetected={handleBonesDetected}
                    />
                    <Environment preset={scene} background={true} />
                    <Controls lookAt={lookAt} />
                </Canvas>

                {/* Camera overlay (visible in live mode) */}
                {mode === 'live' && <CameraDisplay video={video} canvas={canvas} />}

                {/* FPS (live mode) */}
                {mode === 'live' && !loading && (
                    <div className="fps-counter">
                        <div className="fps-dot"></div>
                        <span>{fps} FPS</span>
                    </div>
                )}

                {/* ═══ SETUP PANEL (setup mode) ═══ */}
                {mode === 'setup' && !loading && (
                    <SetupPanel
                        avatarUrl={avatarUrl}
                        onAvatarUpload={handleAvatarUpload}
                        photoUrl={photoUrl}
                        onPhotoUpload={handlePhotoUpload}
                        accessories={accessories}
                        onAddAccessory={handleAddAccessory}
                        onUpdateAccessory={handleUpdateAccessory}
                        onRemoveAccessory={handleRemoveAccessory}
                        availableBones={availableBones}
                        onGoLive={() => setMode('live')}
                    />
                )}

                {/* ═══ LIVE CONTROLS (live mode) ═══ */}
                {mode === 'live' && !loading && (
                    <div className="control-panel">
                        <div className="control-group">
                            <div className="control-group-title">Tracking</div>
                            {[
                                { label: 'Face', get: () => trackFace, set: (v) => { trackFace = v; if (!v) { setFaceLandmarks(null); resetFace() } } },
                                {
                                    label: 'Body', get: () => trackBody, set: (v) => {
                                        trackBody = v
                                        if (v) { setLookAt(trackLegs ? FULLBODY_LOOKAT : HALFBODY_LOOKAT) }
                                        else { setBodyLandmarks(null); resetBody(); resetLegs(); setLookAt(HEADONLY_LOOKAT) }
                                    }
                                },
                                { label: 'Hands', get: () => trackHands, set: (v) => { trackHands = v; if (!v) { setlHandLandmarks(null); setrHandLandmarks(null); resetHands() } } },
                            ].map(t => (
                                <div key={t.label} className="control-row">
                                    <Switch size="small" checkedChildren='✓' unCheckedChildren='✕' defaultChecked onChange={t.set} />
                                    <span className="control-label">{t.label}</span>
                                </div>
                            ))}
                            <div className="control-row">
                                <Switch size="small" checkedChildren='✓' unCheckedChildren='✕' defaultChecked
                                    checked={trackLegs && bodyLandmarks} disabled={!bodyLandmarks}
                                    onChange={(v) => { setTrackLegs(v); setLookAt(v ? FULLBODY_LOOKAT : HALFBODY_LOOKAT); if (!v) resetLegs() }}
                                />
                                <span className="control-label">Legs</span>
                            </div>
                        </div>
                        <div className="control-group">
                            <div className="control-group-title">Environment</div>
                            <Dropdown menu={{ items: SCENES, selectable: true, defaultSelectedKeys: [DEFAULT_SCENE], onClick: (e) => setScene(e.key) }}>
                                <Button size='small'><Space>Scene <DownOutlined /></Space></Button>
                            </Dropdown>
                        </div>
                    </div>
                )}

                <div className="watermark">YaceAVATAR</div>
            </div>

            {/* Hidden webcam elements (always in DOM for camera feed) */}
            <div style={{ position: 'fixed', top: -9999, left: -9999, pointerEvents: 'none' }}>
                <video ref={video} id='cam-video-hidden'></video>
                <canvas ref={canvas} width={CAM_WIDTH} height={CAM_HEIGHT}></canvas>
            </div>

            {/* ═══ BOTTOM MODE TOGGLE ═══ */}
            {!loading && (
                <div className="bottom-bar">
                    <div className="mode-toggle">
                        <button className={`mode-btn ${mode === 'setup' ? 'active' : ''}`} onClick={() => setMode('setup')}>
                            Studio
                        </button>
                        <button className={`mode-btn ${mode === 'live' ? 'active' : ''}`} onClick={() => setMode('live')}>
                            Live View
                        </button>
                    </div>
                    {mode === 'live' && accessories.length > 0 && (
                        <div className="equip-badge">{accessories.length} item{accessories.length > 1 ? 's' : ''} equipped</div>
                    )}
                </div>
            )}
        </>
    )
}
