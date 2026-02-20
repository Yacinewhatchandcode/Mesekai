import { login } from './actions'

export default function LoginPage() {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-black">
            <form className="flex w-full max-w-sm flex-col gap-4 p-8 bg-zinc-900 rounded-lg border border-zinc-800">
                <h2 className="text-2xl text-white font-bold mb-4 text-center">YaceAVATAR Login</h2>

                <div className="flex flex-col gap-2">
                    <label htmlFor="email" className="text-sm text-zinc-400">Email:</label>
                    <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded text-white focus:outline-none focus:border-blue-500"
                    />
                </div>

                <div className="flex flex-col gap-2 mb-4">
                    <label htmlFor="password" className="text-sm text-zinc-400">Password:</label>
                    <input
                        id="password"
                        name="password"
                        type="password"
                        required
                        className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded text-white focus:outline-none focus:border-blue-500"
                    />
                </div>

                <button
                    formAction={login}
                    className="w-full bg-white text-black font-semibold py-2 px-4 rounded hover:bg-zinc-200 transition-colors"
                >
                    Secure Auth
                </button>
            </form>
        </div>
    )
}
