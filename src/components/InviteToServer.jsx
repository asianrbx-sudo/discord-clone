import { useState, useEffect } from 'react'
import { db, auth } from '../firebase'
import {
  collection, query, where, onSnapshot,
  getDoc, doc, updateDoc, arrayUnion
} from 'firebase/firestore'

export default function InviteToServer({ server, onClose }) {
  const [friends, setFriends] = useState([])
  const [invited, setInvited] = useState([])

  useEffect(() => {
    const q = query(
      collection(db, 'friends'),
      where('users', 'array-contains', auth.currentUser.uid)
    )
    const unsub = onSnapshot(q, async (snap) => {
      const list = await Promise.all(snap.docs.map(async (d) => {
        const otherUid = d.data().users.find(uid => uid !== auth.currentUser.uid)
        const userDoc = await getDoc(doc(db, 'users', otherUid))
        return { id: d.id, uid: otherUid, ...userDoc.data() }
      }))
      setFriends(list)
    })
    return unsub
  }, [])

  const handleInvite = async (friend) => {
    await updateDoc(doc(db, 'servers', server.id), {
      members: arrayUnion(friend.uid)
    })
    setInvited(prev => [...prev, friend.uid])
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-xl">
        <h2 className="text-xl font-bold text-white mb-1">Invite Friends</h2>
        <p className="text-gray-400 text-sm mb-4">Invite your friends to <span className="text-white font-bold">{server.name}</span></p>

        {friends.length === 0 && (
          <p className="text-gray-500 text-sm">No friends to invite yet.</p>
        )}

        <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
          {friends.map(friend => {
            const isInServer = server.members?.includes(friend.uid)
            const isInvited = invited.includes(friend.uid)

            return (
              <div key={friend.uid} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-700">
                {friend.photoURL ? (
                  <img src={friend.photoURL} className="w-9 h-9 rounded-full object-cover" />
                ) : (
                  <div className="w-9 h-9 bg-indigo-500 rounded-full flex items-center justify-center font-bold text-white">
                    {friend.displayName?.[0]?.toUpperCase()}
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-white text-sm font-bold">{friend.displayName}</p>
                  <p className="text-gray-400 text-xs">@{friend.username}</p>
                </div>
                <button
                  onClick={() => handleInvite(friend)}
                  disabled={isInServer || isInvited}
                  className={`px-3 py-1 rounded text-sm font-bold transition ${
                    isInServer || isInvited
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-indigo-500 hover:bg-indigo-400 text-white'
                  }`}
                >
                  {isInServer ? 'Already in server' : isInvited ? 'Invited ✓' : 'Invite'}
                </button>
              </div>
            )
          })}
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full bg-gray-700 hover:bg-gray-600 text-white py-2 rounded transition"
        >
          Done
        </button>
      </div>
    </div>
  )
}