import { useState, useEffect } from 'react'
import { db, auth } from '../firebase'
import {
  collection,
  query,
  where,
  onSnapshot,
  getDoc,
  doc,
  deleteDoc,
  addDoc,
  getDocs,
  serverTimestamp
} from 'firebase/firestore'

export default function FriendsList({ onOpenDM, activeTab }) {
  const [friends, setFriends] = useState([])
  const [blocked, setBlocked] = useState([])
  const [confirmUnfriend, setConfirmUnfriend] = useState(null)
  const [confirmBlock, setConfirmBlock] = useState(null)

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

  useEffect(() => {
    const q = query(
      collection(db, 'blocked'),
      where('blockedBy', '==', auth.currentUser.uid)
    )
    const unsub = onSnapshot(q, async (snap) => {
      const blockedList = await Promise.all(snap.docs.map(async (d) => {
        const userDoc = await getDoc(doc(db, 'users', d.data().blockedUid))
        return { id: d.id, ...d.data(), ...userDoc.data() }
      }))
      setBlocked(blockedList)
    })
    return unsub
  }, [])

  const handleUnfriend = async (friend) => {
    await deleteDoc(doc(db, 'friends', friend.id))
    setConfirmUnfriend(null)
  }

  const handleBlock = async (friend) => {
    // Remove from friends first
    await deleteDoc(doc(db, 'friends', friend.id))
    // Add to blocked
    await addDoc(collection(db, 'blocked'), {
      blockedBy: auth.currentUser.uid,
      blockedUid: friend.uid,
      displayName: friend.displayName,
      username: friend.username,
      photoURL: friend.photoURL || '',
      createdAt: serverTimestamp()
    })
    setConfirmBlock(null)
  }

  const handleUnblock = async (blockedUser) => {
    await deleteDoc(doc(db, 'blocked', blockedUser.id))
  }

  if (activeTab === 'Blocked') {
    return (
      <div className="p-4">
        <p className="text-gray-400 text-xs font-bold uppercase mb-4">
          Blocked — {blocked.length}
        </p>
        {blocked.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500 gap-2">
            <span className="text-5xl">🚫</span>
            <p className="font-bold text-white">No blocked users</p>
            <p className="text-sm">You haven't blocked anyone.</p>
          </div>
        )}
        {blocked.map(user => (
          <div key={user.id} className="flex items-center gap-3 p-2 hover:bg-gray-600 rounded-lg group border-t border-gray-600">
            {user.photoURL ? (
              <img src={user.photoURL} className="w-9 h-9 rounded-full object-cover opacity-50" />
            ) : (
              <div className="w-9 h-9 bg-gray-600 rounded-full flex items-center justify-center font-bold text-gray-400">
                {user.displayName?.[0]?.toUpperCase()}
              </div>
            )}
            <div className="flex-1">
              <p className="font-bold text-gray-400">{user.displayName}</p>
              <p className="text-gray-500 text-xs">@{user.username}</p>
            </div>
            <button
              onClick={() => handleUnblock(user)}
              className="hidden group-hover:flex px-3 py-1 bg-gray-700 hover:bg-green-600 text-gray-300 hover:text-white rounded text-xs font-bold transition"
            >
              Unblock
            </button>
          </div>
        ))}
      </div>
    )
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

          <div className="hidden group-hover:flex gap-2">
            <button
              onClick={() => onOpenDM(friend)}
              title="Message"
              className="w-8 h-8 bg-gray-700 hover:bg-indigo-500 rounded-full flex items-center justify-center text-gray-300 hover:text-white transition"
            >
              💬
            </button>
            <button
              onClick={() => setConfirmBlock(friend)}
              title="Block"
              className="w-8 h-8 bg-gray-700 hover:bg-orange-500 rounded-full flex items-center justify-center text-gray-300 hover:text-white transition"
            >
              🚫
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
              Are you sure you want to remove <span className="text-white font-bold">{confirmUnfriend.displayName}</span> as a friend?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmUnfriend(null)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded transition">
                Cancel
              </button>
              <button onClick={() => handleUnfriend(confirmUnfriend)} className="flex-1 bg-red-500 hover:bg-red-400 text-white font-bold py-2 rounded transition">
                Unfriend
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Block Modal */}
      {confirmBlock && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-xl font-bold text-white mb-2">Block {confirmBlock.displayName}?</h2>
            <p className="text-gray-400 text-sm mb-6">
              Blocking <span className="text-white font-bold">{confirmBlock.displayName}</span> will remove them as a friend and prevent them from sending you friend requests.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmBlock(null)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded transition">
                Cancel
              </button>
              <button onClick={() => handleBlock(confirmBlock)} className="flex-1 bg-orange-500 hover:bg-orange-400 text-white font-bold py-2 rounded transition">
                Block
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}