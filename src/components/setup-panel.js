'use client'

import { useState, useRef, useCallback } from 'react'
import { ATTACHMENT_POINTS } from '@/utils/bone-utils'

export default function SetupPanel({
    avatarUrl,
    onAvatarUpload,
    photoUrl,
    onPhotoUpload,
    onGenerate3D,
    isGenerating,
    accessories,
    onAddAccessory,
    onUpdateAccessory,
    onRemoveAccessory,
    availableBones,
    onGoLive,
}) {
    const avatarInputRef = useRef(null)
    const accessoryInputRef = useRef(null)
    const photoInputRef = useRef(null)
    const [avatarDragOver, setAvatarDragOver] = useState(false)
    const [accDragOver, setAccDragOver] = useState(false)
    const [aiMessage, setAiMessage] = useState('')
    const [isAiLoading, setIsAiLoading] = useState(false)

    const prevent = (e) => { e.preventDefault(); e.stopPropagation() }

    const talkToAgent = async () => {
        setIsAiLoading(true)
        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [{ role: 'user', content: "I'm setting up my 3D Livestream Avatar. Act as my Sovereign technical assistant and give me a brief, one-sentence hyped confirmation." }]
                })
            })
            const data = await res.json()
            if (data.content) setAiMessage(data.content)
        } catch (e) {
            console.error(e)
        }
        setIsAiLoading(false)
    }

    return (
        <div className="setup-sidebar">
            <div className="setup-header">
                <h2 className="setup-title">Avatar Studio</h2>
                <p className="setup-subtitle">Upload, equip, go live</p>
            </div>

            <div className="setup-scroll">
                {/* ── STEP 1: Reference Photo ── */}
                <div className="setup-section">
                    <div className="setup-section-header">
                        <span className="step-badge">1</span>
                        <span className="section-title">Your Photo</span>
                        <span className="optional-tag">optional</span>
                    </div>
                    <div
                        className="drop-zone small"
                        onClick={() => photoInputRef.current?.click()}
                    >
                        {photoUrl ? (
                            <img src={photoUrl} alt="Ref" className="photo-preview-img" />
                        ) : (
                            <>
                                <span className="drop-icon">📸</span>
                                <span className="drop-text">Upload reference photo</span>
                            </>
                        )}
                    </div>
                    <input ref={photoInputRef} type="file" accept="image/*" hidden
                        onChange={(e) => e.target.files[0] && onPhotoUpload(e.target.files[0])} />

                    {photoUrl && (
                        <button
                            className={`go-live-btn ${isGenerating ? 'generating' : ''}`}
                            style={{ marginTop: 10, background: isGenerating ? '#666' : '#8855ff', fontSize: 13, height: 35 }}
                            onClick={() => window.open('https://prime-ai.fr/checkout?product=yace-avatar-generator', '_blank')}
                            disabled={isGenerating}
                        >
                            {isGenerating ? 'Loading TRELLIS...' : '🔒 Unlock 3D Generator (149€ HT)'}
                        </button>
                    )}

                    <div style={{ marginTop: 15, padding: 10, background: '#111', borderRadius: 8, border: '1px solid #333' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                            <span style={{ fontSize: 12, color: '#8855ff', fontWeight: 'bold' }}>Qwen Sovereign Agent</span>
                            <button onClick={talkToAgent} disabled={isAiLoading} style={{ fontSize: 10, padding: '2px 6px', background: '#333', color: '#fff', borderRadius: 4, cursor: 'pointer' }}>
                                {isAiLoading ? 'Connecting...' : 'Query'}
                            </button>
                        </div>
                        <p style={{ fontSize: 12, color: '#aaa', margin: 0, minHeight: 18 }}>
                            {aiMessage || "Agent standby. Click Query to execute neural bridge."}
                        </p>
                    </div>
                </div>

                {/* ── STEP 2: Avatar GLB ── */}
                <div className="setup-section">
                    <div className="setup-section-header">
                        <span className="step-badge">2</span>
                        <span className="section-title">3D Avatar</span>
                    </div>
                    <div
                        className={`drop-zone ${avatarDragOver ? 'active' : ''}`}
                        onClick={() => avatarInputRef.current?.click()}
                        onDragOver={(e) => { prevent(e); setAvatarDragOver(true) }}
                        onDragLeave={() => setAvatarDragOver(false)}
                        onDrop={(e) => {
                            prevent(e); setAvatarDragOver(false)
                            e.dataTransfer?.files?.[0] && onAvatarUpload(e.dataTransfer.files[0])
                        }}
                    >
                        <span className="drop-icon">🎭</span>
                        <span className="drop-text">
                            {avatarUrl ? '✓ Avatar loaded — drop to replace' : 'Drop .GLB avatar here'}
                        </span>
                        <span className="drop-hint">or click to browse</span>
                    </div>
                    <input ref={avatarInputRef} type="file" accept=".glb,.gltf" hidden
                        onChange={(e) => e.target.files[0] && onAvatarUpload(e.target.files[0])} />
                </div>

                {/* ── STEP 3: Equipment ── */}
                <div className="setup-section">
                    <div className="setup-section-header">
                        <span className="step-badge">3</span>
                        <span className="section-title">Equipment</span>
                    </div>
                    <div
                        className={`drop-zone ${accDragOver ? 'active' : ''}`}
                        onClick={() => accessoryInputRef.current?.click()}
                        onDragOver={(e) => { prevent(e); setAccDragOver(true) }}
                        onDragLeave={() => setAccDragOver(false)}
                        onDrop={(e) => {
                            prevent(e); setAccDragOver(false)
                            e.dataTransfer?.files?.[0] && onAddAccessory(e.dataTransfer.files[0])
                        }}
                    >
                        <span className="drop-icon">🎽</span>
                        <span className="drop-text">Drop clothing / objects</span>
                        <span className="drop-hint">.GLB or .OBJ files</span>
                    </div>
                    <input ref={accessoryInputRef} type="file" accept=".glb,.gltf,.obj" hidden
                        onChange={(e) => e.target.files[0] && onAddAccessory(e.target.files[0])} />

                    {/* Accessory list with controls */}
                    {accessories.length > 0 && (
                        <div className="acc-list">
                            {accessories.map((acc) => (
                                <div key={acc.id} className="acc-item">
                                    <div className="acc-item-header">
                                        <span className="acc-name">{acc.name}</span>
                                        <button className="acc-remove" onClick={() => onRemoveAccessory(acc.id)}>×</button>
                                    </div>

                                    <div className="acc-control">
                                        <label>Bone</label>
                                        <select value={acc.boneName}
                                            onChange={(e) => onUpdateAccessory(acc.id, { boneName: e.target.value })}>
                                            {availableBones.length > 0 && (
                                                <optgroup label="Detected">
                                                    {availableBones.map(b => <option key={b} value={b}>{b}</option>)}
                                                </optgroup>
                                            )}
                                            <optgroup label="Standard">
                                                {ATTACHMENT_POINTS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                                            </optgroup>
                                        </select>
                                    </div>

                                    <div className="acc-control">
                                        <label>Scale: {acc.scale.toFixed(2)}</label>
                                        <input type="range" min="0.01" max="5" step="0.01" value={acc.scale}
                                            onChange={(e) => onUpdateAccessory(acc.id, { scale: parseFloat(e.target.value) })} />
                                    </div>

                                    {['X', 'Y', 'Z'].map((axis, i) => (
                                        <div key={axis} className="acc-control">
                                            <label>Pos {axis}: {acc.position[i].toFixed(2)}</label>
                                            <input type="range" min="-2" max="2" step="0.01" value={acc.position[i]}
                                                onChange={(e) => {
                                                    const p = [...acc.position]; p[i] = parseFloat(e.target.value)
                                                    onUpdateAccessory(acc.id, { position: p })
                                                }} />
                                        </div>
                                    ))}

                                    {['X', 'Y', 'Z'].map((axis, i) => (
                                        <div key={`r${axis}`} className="acc-control">
                                            <label>Rot {axis}: {(acc.rotation[i] * 180 / Math.PI).toFixed(0)}°</label>
                                            <input type="range" min={-Math.PI} max={Math.PI} step="0.05" value={acc.rotation[i]}
                                                onChange={(e) => {
                                                    const r = [...acc.rotation]; r[i] = parseFloat(e.target.value)
                                                    onUpdateAccessory(acc.id, { rotation: r })
                                                }} />
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="setup-footer">
                <button className="go-live-btn" onClick={onGoLive}>
                    <span>⚡</span> Enter Live Mode
                </button>
            </div>
        </div>
    )
}
