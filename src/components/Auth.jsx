import { useState } from 'react'
import { auth, googleProvider, db } from '../firebase'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile
} from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'

const months = ['January','February','March','April','May','June','July','August','September','October','November','December']
const days = Array.from({ length: 31 }, (_, i) => i + 1)
const years = Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i)

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [month, setMonth] = useState('')
  const [day, setDay] = useState('')
  const [year, setYear] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    setError('')
    if (!isLogin && (!email || !username || !password || !month || !day || !year)) {
      setError('Please fill in all required fields.')
      return
    }
    setLoading(true)
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password)
      } else {
        const result = await createUserWithEmailAndPassword(auth, email, password)
        await updateProfile(result.user, { displayName: displayName || username })
        await setDoc(doc(db, 'users', result.user.uid), {
          username: username.toLowerCase(),
          displayName: displayName || username,
          email: email,
          photoURL: '',
          dob: `${month}/${day}/${year}`,
          createdAt: serverTimestamp()
        })
      }
    } catch (err) {
      setError(err.message.replace('Firebase: ', ''))
    }
    setLoading(false)
  }

  const handleGoogle = async () => {
    setError('')
    setLoading(true)
    try {
      const result = await signInWithPopup(auth, googleProvider)
      const u = result.user
      await setDoc(doc(db, 'users', u.uid), {
        username: u.email?.split('@')[0].toLowerCase(),
        displayName: u.displayName || u.email?.split('@')[0],
        email: u.email,
        photoURL: u.photoURL || '',
        createdAt: serverTimestamp()
      }, { merge: true })
    } catch (err) {
      setError(err.message.replace('Firebase: ', ''))
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-700 flex items-center justify-center py-8">
      <div className="bg-gray-800 p-8 rounded-xl shadow-xl w-full max-w-md">

        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white">
            {isLogin ? 'Welcome back!' : 'Create an account'}
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            {isLogin ? 'Sign in to continue' : ''}
          </p>
        </div>

        {error && (
          <div className="bg-red-500 bg-opacity-20 border border-red-500 text-red-400 text-sm px-4 py-2 rounded mb-4">
            {error}
          </div>
        )}

        {/* Email */}
        <div className="mb-4">
          <label className="text-gray-400 text-xs font-bold uppercase mb-1 block">
            Email <span className="text-red-400">*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full bg-gray-900 text-white rounded px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {!isLogin && (
          <>
            {/* Display Name */}
            <div className="mb-4">
              <label className="text-gray-400 text-xs font-bold uppercase mb-1 block">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="w-full bg-gray-900 text-white rounded px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Username */}
            <div className="mb-4">
              <label className="text-gray-400 text-xs font-bold uppercase mb-1 block">
                Username <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                className="w-full bg-gray-900 text-white rounded px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </>
        )}

        {/* Password */}
        <div className="mb-4">
          <label className="text-gray-400 text-xs font-bold uppercase mb-1 block">
            Password <span className="text-red-400">*</span>
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            className="w-full bg-gray-900 text-white rounded px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Date of Birth */}
        {!isLogin && (
          <div className="mb-6">
            <label className="text-gray-400 text-xs font-bold uppercase mb-1 block">
              Date of Birth <span className="text-red-400">*</span>
            </label>
            <div className="flex gap-2">
              <select
                value={month}
                onChange={e => setMonth(e.target.value)}
                className="flex-1 bg-gray-900 text-white rounded px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Month</option>
                {months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
              <select
                value={day}
                onChange={e => setDay(e.target.value)}
                className="w-24 bg-gray-900 text-white rounded px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Day</option>
                {days.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <select
                value={year}
                onChange={e => setYear(e.target.value)}
                className="w-28 bg-gray-900 text-white rounded px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Year</option>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 text-white font-bold py-2 rounded transition mb-4"
        >
          {loading ? 'Please wait...' : isLogin ? 'Log In' : 'Continue'}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 border-t border-gray-600"></div>
          <span className="text-gray-500 text-xs">OR</span>
          <div className="flex-1 border-t border-gray-600"></div>
        </div>

        {/* Google */}
        <button
          onClick={handleGoogle}
          disabled={loading}
          className="w-full bg-white hover:bg-gray-100 disabled:opacity-50 text-gray-800 font-bold py-2 rounded flex items-center justify-center gap-2 transition mb-4"
        >
          <img src="https://www.google.com/favicon.ico" className="w-4 h-4" />
          Continue with Google
        </button>

        {/* Toggle */}
        <p className="text-gray-400 text-sm">
          {isLogin ? "Need an account? " : "Already have an account? "}
          <button
            onClick={() => { setIsLogin(!isLogin); setError('') }}
            className="text-indigo-400 hover:underline"
          >
            {isLogin ? 'Register' : 'Log in'}
          </button>
        </p>

      </div>
    </div>
  )
}