import { useState } from 'react'
import { db, auth } from '../firebase'
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp
} from 'firebase/firestore'

export default function AddFriend({ onClose }) {
  const [input, setInput] = useState('')
  const [status, setStatus] = useState(null) // 'success' | 'error' | 'loading'
  const [message, setMessage] = useState('')

  const handleSend = async () => {
    if (!input.trim()) return
    setStatus('loading')
    setMessage('')

    try {
      // Search for user by username
      const q = query(collection(db, 'users'), where('username', '==', input.trim().toLowerCase()))
      const snap = await getDocs(q)

      if (snap.empty) {
        setStatus('error')
        setMessage(`Hm, didn't work. Double check that the username is correct.`)
        return
      }

      const targetUser = snap.docs[0].data()
      const targetUid = snap.docs[0].id

      if (targetUid === auth.currentUser.uid) {
        setStatus('error')
        setMessage("You can't send a friend request to yourself.")
        return
      }

      // Check if request already exists
      const existingQ = query(
        collection(db, 'friendRequests'),
        where('from', '==', auth.currentUser.uid),
        where('to', '==', targetUid)
      )
      const existingSnap = await getDocs(existingQ)

      if (!existingSnap.empty) {
        setStatus('error')
        setMessage('You already sent a friend request to this user.')
        return
      }

      // Send request
      await addDoc(collection(db, 'friendRequests'), {
        from: auth.currentUser.uid,
        fromUsername: auth.currentUser.displayName || auth.currentUser.email,
        fromPhoto: auth.currentUser.photoURL || '',
        to: targetUid,
        toUsername: targetUser.username,
        status: 'pending',
        createdAt: serverTimestamp()
      })

      setStatus('success')
      setMessage(`Friend request sent to @${targetUser.username}!`)
      setInput('')
    } catch (err) {
      setStatus('error')
      setMessage('Something went wrong. Try again.')
    }
  }

  return (
    <div className="flex-1 flex flex-col p-6">
      <h2 className="text-xl font-bold text-white mb-1">Add Friend</h2>
      <p className="text-gray-400 text-sm mb-4">You can add friends with their username.</p>

      {/* Input */}
      <div className={`flex items-center bg-gray-900 rounded-lg px-4 py-3 border ${
        status === 'error' ? 'border-red-500' :
        status === 'success' ? 'border-green-500' :
        'border-gray-700'
      }`}>
        <input
          className="flex-1 bg-transparent text-white outline-none text-sm placeholder-gray-500"
          placeholder="Enter a username"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
        />
        <button
          onClick={handleSend}
          disabled={status === 'loading'}
          className="bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 text-white text-sm font-bold px-4 py-1.5 rounded ml-3"
        >
          {status === 'loading' ? 'Sending...' : 'Send Friend Request'}
        </button>
      </div>

      {/* Feedback */}
      {message && (
        <p className={`text-sm mt-3 ${status === 'success' ? 'text-green-400' : 'text-red-400'}`}>
          {message}
        </p>
      )}
    </div>
  )
}