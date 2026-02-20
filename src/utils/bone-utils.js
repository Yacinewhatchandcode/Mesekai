// Predefined attachment points for the equipment UI
export const ATTACHMENT_POINTS = [
    { label: 'Head', value: 'Head' },
    { label: 'Neck', value: 'Neck' },
    { label: 'Upper Back', value: 'Spine2' },
    { label: 'Mid Back', value: 'Spine1' },
    { label: 'Lower Back', value: 'Spine' },
    { label: 'Hips', value: 'Hips' },
    { label: 'Left Hand', value: 'LeftHand' },
    { label: 'Right Hand', value: 'RightHand' },
    { label: 'Left Arm', value: 'LeftArm' },
    { label: 'Right Arm', value: 'RightArm' },
    { label: 'Left Forearm', value: 'LeftForeArm' },
    { label: 'Right Forearm', value: 'RightForeArm' },
    { label: 'Left Foot', value: 'LeftFoot' },
    { label: 'Right Foot', value: 'RightFoot' },
]

// Extract all bone names from a Three.js scene graph
export function getAllBoneNames(rootObject) {
    const bones = new Set()
    if (!rootObject) return []
    rootObject.traverse((obj) => {
        if (obj.isBone || obj.type === 'Bone') {
            bones.add(obj.name)
        }
    })
    return Array.from(bones).sort()
}

// Resolve a standard bone name across different avatar formats
export function findBoneInScene(scene, standardName) {
    if (!scene) return null
    let found = null

    // Direct name match
    scene.traverse((obj) => {
        if (!found && obj.name === standardName) found = obj
    })
    if (found) return found

    // Mixamo prefix
    scene.traverse((obj) => {
        if (!found && obj.name === `mixamorig:${standardName}`) found = obj
    })
    if (found) return found

    // Case-insensitive fallback
    const lower = standardName.toLowerCase()
    scene.traverse((obj) => {
        if (!found && obj.name.toLowerCase() === lower) found = obj
    })
    return found
}
