import { FloatButton } from 'antd'
import { CameraTwoTone, CameraOutlined } from '@ant-design/icons'
import { useEffect, useRef, useState } from 'react'
import '@/app/globals.css'

export default function CameraDisplay({ video, canvas }) {
    const [hidden, setHidden] = useState(false)
    const localVideoRef = useRef(null)

    // Mirror the hidden video feed into the visible element
    useEffect(() => {
        const srcVideo = video.current
        const destVideo = localVideoRef.current
        if (!srcVideo || !destVideo) return

        // Use the same stream
        const tryMirror = () => {
            if (srcVideo.srcObject) {
                destVideo.srcObject = srcVideo.srcObject
                destVideo.play().catch(() => { })
            } else {
                setTimeout(tryMirror, 200)
            }
        }
        tryMirror()
    }, [video])

    return (
        <>
            <FloatButton
                icon={hidden ? <CameraOutlined /> : <CameraTwoTone />}
                style={{ position: 'absolute', top: 16, right: 16, zIndex: 150 }}
                onClick={() => setHidden(p => !p)}
            />
            <div className="cam-container" hidden={hidden}>
                <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{
                        transform: 'scaleX(-1)',
                        width: 320,
                        borderRadius: 16,
                        border: '1px solid rgba(255,255,255,0.06)',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
                    }}
                />
                <canvas
                    ref={canvas}
                    width={1920}
                    height={1080}
                    style={{
                        position: 'absolute',
                        top: 0, left: 0,
                        transform: 'scaleX(-1)',
                        width: '100%',
                        height: '100%',
                        pointerEvents: 'none',
                    }}
                />
            </div>
        </>
    )
}
