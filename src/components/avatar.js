import { useEffect, useMemo, useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import { createPortal } from '@react-three/fiber'

import {
    animateBody,
    animateFace,
    animateHand,
    rotateHead,
    resetBlendshapes,
    resetRotations
} from '@/utils/solver'
import { getAllBoneNames } from '@/utils/bone-utils'

let headBones = []
let bodyBones = []
let lHandBones = []
let rHandBones = []
let legBones = []
let meshes = []
const defaultHeadQuats = []
const defaultBodyQuats = []
const defaultLHandQuats = []
const defaultRHandQuats = []
const defaultLegQuats = []


function getHandBones(bone, handBones) {
    if (!bone) return
    for (const child of bone.children) {
        handBones.push(child)
        getHandBones(child, handBones)
    }
}

function getDefaultHandQuats(bone, defaultHandQuats) {
    if (!bone) return
    for (const child of bone.children) {
        defaultHandQuats.push(child.quaternion.clone())
        getDefaultHandQuats(child, defaultHandQuats)
    }
}

function clearDefaults() {
    defaultHeadQuats.length = 0
    defaultBodyQuats.length = 0
    defaultLHandQuats.length = 0
    defaultRHandQuats.length = 0
    defaultLegQuats.length = 0
}

export function resetFace() {
    resetBlendshapes(meshes)
    resetRotations(headBones, defaultHeadQuats)
}

export function resetBody() {
    resetRotations(bodyBones, defaultBodyQuats)
}

export function resetLegs() {
    resetRotations(legBones, defaultLegQuats)
}

export function resetHands() {
    resetRotations(lHandBones, defaultLHandQuats)
    resetRotations(rHandBones, defaultRHandQuats)
}


// Renders a single accessory portaled into its target bone
function AccessoryRenderer({ url, bone, position, rotation, scale }) {
    const { scene } = useGLTF(url)
    const clone = useMemo(() => scene.clone(true), [scene])

    if (!bone) return null

    return createPortal(
        <group position={position} rotation={rotation} scale={[scale, scale, scale]}>
            <primitive object={clone} />
        </group>,
        bone
    )
}


export default function Avatar({
    avatarUrl, accessories = [],
    userFace, userBody, userLHand, userRHand,
    legsVisible, trackLegs, isLive,
    onBonesDetected
}) {
    const { nodes, scene } = useGLTF(avatarUrl)

    // Detect bones on avatar load and notify parent
    useEffect(() => {
        if (scene && onBonesDetected) {
            const boneNames = getAllBoneNames(scene)
            onBonesDetected(boneNames)
        }
    }, [scene, onBonesDetected])

    useEffect(() => {
        clearDefaults()

        // Find meshes for blendshapes (RPM-specific, graceful fallback)
        meshes = [nodes.EyeLeft, nodes.EyeRight, nodes.Wolf3D_Head, nodes.Wolf3D_Teeth].filter(Boolean)

        // Find head/body/leg bones
        headBones = [nodes.Head, nodes.Neck, nodes.Spine2].filter(Boolean)
        bodyBones = [
            nodes.Spine, nodes.Spine1,
            nodes.RightArm, nodes.RightForeArm, nodes.RightHand,
            nodes.LeftArm, nodes.LeftForeArm, nodes.LeftHand
        ].filter(Boolean)
        legBones = [
            nodes.RightUpLeg, nodes.RightLeg, nodes.RightFoot,
            nodes.LeftUpLeg, nodes.LeftLeg, nodes.LeftFoot
        ].filter(Boolean)

        lHandBones = []; rHandBones = []
        if (nodes.LeftHand) getHandBones(nodes.LeftHand, lHandBones)
        if (nodes.RightHand) getHandBones(nodes.RightHand, rHandBones)

        // Store default quaternions
        for (const bone of headBones) defaultHeadQuats.push(bone.quaternion.clone())
        for (const bone of bodyBones) defaultBodyQuats.push(bone.quaternion.clone())
        for (const bone of legBones) defaultLegQuats.push(bone.quaternion.clone())
        if (nodes.LeftHand) getDefaultHandQuats(nodes.LeftHand, defaultLHandQuats)
        if (nodes.RightHand) getDefaultHandQuats(nodes.RightHand, defaultRHandQuats)
    }, [nodes])

    // Apply tracking only in live mode
    if (isLive) {
        if (userFace) {
            if (userFace.faceBlendshapes?.length > 0 && meshes.length > 0) {
                animateFace(meshes, userFace.faceBlendshapes[0].categories)
            }
            if (userFace.facialTransformationMatrixes?.length > 0 && headBones.length > 0) {
                rotateHead(headBones, userFace.facialTransformationMatrixes[0].data)
            }
        }

        if (userBody && bodyBones.length >= 8) {
            animateBody(bodyBones, legBones, userBody, legsVisible, trackLegs, defaultLegQuats)
        }

        if (userLHand && nodes.RightHand) {
            animateHand(nodes.RightHand, userLHand, 'Left')
        }

        if (userRHand && nodes.LeftHand) {
            animateHand(nodes.LeftHand, userRHand, 'Right')
        }
    }

    return (
        <>
            <primitive object={nodes.Scene || scene} />
            {/* Render each accessory portaled into its target bone */}
            {accessories.map((acc) => {
                const bone = nodes[acc.boneName] || scene.getObjectByName(acc.boneName)
                if (!bone) return null
                return (
                    <AccessoryRenderer
                        key={acc.id}
                        url={acc.url}
                        bone={bone}
                        position={acc.position}
                        rotation={acc.rotation}
                        scale={acc.scale}
                    />
                )
            })}
        </>
    )
}
