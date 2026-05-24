import { useState } from 'react'
import { db, auth } from '../firebase'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'

export default function CreateServer({ onClose, onCreated }) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCreate = async () => {
    if (!name.trim()) { setError('Please enter a server name.'); return }
    setLoading(true)
    try {
      const serverRef = await addDoc(collection(db, 'servers'), {
        name: name.trim(),
        icon: name.trim()[0].toUpperCase(),
        ownerId: auth.currentUser.uid,
        members: [auth.currentUser.uid],
        createdAt: serverTimestamp()
      })
      // Create default channels
      await addDoc(collection(db, 'channels'), {
        name: 'general',
        serverId: serverRef.id,
        createdAt: serverTimestamp()
      })
      await addDoc(collection(db, 'channels'), {
        name: 'random',
        serverId: serverRef.id,
        createdAt: serverTimestamp()
      })
      onCreated(serverRef.id)
      onClose()
    } catch (err) {
      setError('Failed to create server.')
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl p-8 w-full max-w-md shadow-xl">
        <h2 className="text-2xl font-bold text-white text-center mb-1">Create a Server</h2>
        <p className="text-gray-400 text-sm text-center mb-6">Give your server a name to get started.</p>

        {/* Icon Preview */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-indigo-500 rounded-full flex items-center justify-center text-3xl font-bold text-white">
            {name ? name[0].toUpperCase() : '?'}
          </div>
        </div>

        {/* Server Name */}
        <div className="mb-6">
          <label className="text-gray-400 text-xs font-bold uppercase mb-1 block">Server Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            className="w-full bg-gray-900 text-white rounded px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="My Awesome Server"
            maxLength={100}
          />
        </div>

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded transition">
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={loading}
            className="flex-1 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 text-white font-bold py-2 rounded transition"
          >
            {loading ? 'Creating...' : 'Create Server'}
          </button>
        </div>
      </div>
    </div>
  )
}