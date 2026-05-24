import { useState, useEffect } from 'react'
import { db, auth } from '../firebase'
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  deleteDoc,
  addDoc,
  serverTimestamp
} from 'firebase/firestore'

export default function FriendRequests() {
  const [requests, setRequests] = useState([])

  useEffect(() => {
    const q = query(
      collection(db, 'friendRequests'),
      where('to', '==', auth.currentUser.uid),
      where('status', '==', 'pending')
    )
    const unsub = onSnapshot(q, (snap) => {
      setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return unsub
  }, [])

  const accept = async (req) => {
    await addDoc(collection(db, 'friends'), {
      users: [req.from, req.to],
      createdAt: serverTimestamp()
    })
    await deleteDoc(doc(db, 'friendRequests', req.id))
  }

  const decline = async (req) => {
    await deleteDoc(doc(db, 'friendRequests', req.id))
  }

  if (requests.length === 0) return (
    <div className="flex-1 h-full flex items-center justify-center flex-col gap-3 text-gray-500 p-6">
      <span className="text-5xl">📭</span>
      <p className="font-bold text-white">No pending requests</p>
      <p className="text-sm">You're all caught up!</p>
    </div>
  )

  return (
    <div className="p-6">
      <p className="text-gray-400 text-xs font-bold uppercase mb-4">
        Pending — {requests.length}
      </p>
      {requests.map(req => (
        <div key={req.id} className="flex items-center gap-3 p-3 hover:bg-gray-600 rounded-lg group border-t border-gray-600">
          <div className="w-9 h-9 bg-indigo-500 rounded-full flex items-center justify-center font-bold shrink-0">
            {req.fromUsername?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1">
            <p className="font-bold text-white">{req.fromUsername}</p>
            <p className="text-gray-400 text-xs">Incoming Friend Request</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => accept(req)}
              title="Accept"
              className="w-8 h-8 bg-gray-700 hover:bg-green-600 rounded-full flex items-center justify-center text-gray-300 hover:text-white transition"
            >
              ✓
            </button>
            <button
              onClick={() => decline(req)}
              title="Decline"
              className="w-8 h-8 bg-gray-700 hover:bg-red-600 rounded-full flex items-center justify-center text-gray-300 hover:text-white transition"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}