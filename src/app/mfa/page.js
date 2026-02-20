'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

export default function MFAPage() {
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [qrCode, setQrCode] = useState(null)
    const [verifyCode, setVerifyCode] = useState('')
    const [factorId, setFactorId] = useState(null)
    const [mode, setMode] = useState(null) // 'enroll' or 'challenge'

    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        async function checkAAL() {
            const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
            if (error) {
                setError(error.message)
                return
            }

            if (data.currentLevel === 'aal2') {
                router.push('/')
                return
            }

            if (data.nextLevel === 'aal2') {
                setMode('challenge')
                // Get the existing factor ID
                const { data: factors } = await supabase.auth.mfa.listFactors()
                const totpFactor = factors?.totp[0]
                if (totpFactor) {
                    setFactorId(totpFactor.id)
                }
            } else {
                setMode('enroll')
                // Start enrollment
                const { data: enrollData, error: enrollError } = await supabase.auth.mfa.enroll({
                    factorType: 'totp',
                })
                if (enrollError) {
                    setError(enrollError.message)
                } else {
                    setFactorId(enrollData.id)
                    setQrCode(enrollData.totp.qr_code)
                }
            }
            setLoading(false)
        }

        checkAAL()
    }, [router, supabase])

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')

        try {
            const challenge = await supabase.auth.mfa.challenge({ factorId })
            if (challenge.error) throw challenge.error

            const verify = await supabase.auth.mfa.verify({
                factorId,
                challengeId: challenge.data.id,
                code: verifyCode,
            })
            if (verify.error) throw verify.error

            router.push('/')
        } catch (err) {
            setError(err.message)
        }
    }

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-black">
                <div className="text-zinc-400">Loading MFA security...</div>
            </div>
        )
    }

    return (
        <div className="flex h-screen w-full items-center justify-center bg-black">
            <div className="flex w-full max-w-sm flex-col gap-4 p-8 bg-zinc-900 rounded-lg border border-zinc-800">
                <h2 className="text-2xl text-white font-bold mb-2 text-center">
                    {mode === 'enroll' ? 'Setup Authenticator' : 'Security Verification'}
                </h2>

                {mode === 'enroll' && qrCode && (
                    <div className="flex flex-col items-center gap-4">
                        <p className="text-sm text-zinc-400 text-center">
                            Scan this QR code with your Google Authenticator app to secure your account.
                        </p>
                        <div className="p-4 bg-white rounded-lg">
                            <img src={qrCode} alt="QR Code" className="w-48 h-48" />
                        </div>
                    </div>
                )}

                {mode === 'challenge' && (
                    <p className="text-sm text-zinc-400 text-center mb-4">
                        Enter the 6-digit code from your Google Authenticator app.
                    </p>
                )}

                {error && <div className="text-red-500 text-sm text-center">{error}</div>}

                <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-4">
                    <input
                        type="text"
                        value={verifyCode}
                        onChange={(e) => setVerifyCode(e.target.value.trim())}
                        placeholder="000000"
                        maxLength={6}
                        required
                        className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded text-center text-2xl tracking-widest text-white focus:outline-none focus:border-blue-500"
                    />
                    <button
                        type="submit"
                        className="w-full bg-white text-black font-semibold py-2 px-4 rounded hover:bg-zinc-200 transition-colors"
                    >
                        {mode === 'enroll' ? 'Verify and Enable' : 'Authenticate'}
                    </button>
                </form>
            </div>
        </div>
    )
}
