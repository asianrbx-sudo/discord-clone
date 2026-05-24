import { useState, useEffect } from 'react'
import { db, auth } from '../firebase'
import {
  collection,
  query,
  where,
  onSnapshot,
  getDoc,
  doc,
  deleteDoc
} from 'firebase/firestore'

export default function FriendsList({ onOpenDM }) {
  const [friends, setFriends] = useState([])
  const [confirmUnfriend, setConfirmUnfriend] = useState(null)

  useEffect(() => {
    const q = query(
      collection(db, 'friends'),
      where('users', 'array-contains', auth.currentUser.uid)
    )
    const unsub = onSnapshot(q, async (snap) => {
      const friendList = await Promise.all(snap.docs.map(async (d) => {
        const otherUid = d.data().users.find(uid => uid !== auth.currentUser.uid)
        const userDoc = await getDoc(doc(db, 'users', otherUid))
        return { id: d.id, uid: otherUid, ...userDoc.data() }
      }))
      setFriends(friendList)
    })
    return unsub
  }, [])

  const handleUnfriend = async (friend) => {
    await deleteDoc(doc(db, 'friends', friend.id))
    setConfirmUnfriend(null)
  }

  if (friends.length === 0) return (
    <div className="flex-1 h-full flex items-center justify-center flex-col gap-3 text-gray-500">
      <span className="text-5xl">👥</span>
      <p className="font-bold text-white">No friends yet!</p>
      <p className="text-sm">Click Add Friend to get started.</p>
    </div>
  )

  return (
    <div className="p-4">
      <p className="text-gray-400 text-xs font-bold uppercase mb-4">
        All Friends — {friends.length}
      </p>

      {friends.map(friend => (
        <div
          key={friend.id}
          className="flex items-center gap-3 p-2 hover:bg-gray-600 rounded-lg group border-t border-gray-600"
        >
          {friend.photoURL ? (
            <img src={friend.photoURL} className="w-9 h-9 rounded-full object-cover" />
          ) : (
            <div className="w-9 h-9 bg-indigo-500 rounded-full flex items-center justify-center font-bold">
              {friend.displayName?.[0]?.toUpperCase()}
            </div>
          )}
          <div className="flex-1">
            <p className="font-bold text-white">{friend.displayName}</p>
            <p className="text-gray-400 text-xs">@{friend.username}</p>
          </div>

          {/* Action Buttons */}
          <div className="hidden group-hover:flex gap-2">
            <button
              onClick={() => onOpenDM(friend)}
              title="Message"
              className="w-8 h-8 bg-gray-700 hover:bg-indigo-500 rounded-full flex items-center justify-center text-gray-300 hover:text-white transition"
            >
              💬
            </button>
            <button
              onClick={() => setConfirmUnfriend(friend)}
              title="Unfriend"
              className="w-8 h-8 bg-gray-700 hover:bg-red-500 rounded-full flex items-center justify-center text-gray-300 hover:text-white transition"
            >
              ✕
            </button>
          </div>
        </div>
      ))}

      {/* Confirm Unfriend Modal */}
      {confirmUnfriend && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-xl font-bold text-white mb-2">Unfriend {confirmUnfriend.displayName}?</h2>
            <p className="text-gray-400 text-sm mb-6">
              Are you sure you want to remove <span className="text-white font-bold">{confirmUnfriend.displayName}</span> as a friend? This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmUnfriend(null)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUnfriend(confirmUnfriend)}
                className="flex-1 bg-red-500 hover:bg-red-400 text-white font-bold py-2 rounded transition"
              >
                Unfriend
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}