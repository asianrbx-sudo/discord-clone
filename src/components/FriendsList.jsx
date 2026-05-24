import { useState, useEffect } from 'react'
import { db, auth } from '../firebase'
import {
  collection,
  query,
  where,
  onSnapshot,
  getDoc,
  doc
} from 'firebase/firestore'

export default function FriendsList({ onOpenDM }) {
  const [friends, setFriends] = useState([])

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
          className="flex items-center gap-3 p-2 hover:bg-gray-600 rounded-lg cursor-pointer group border-t border-gray-600"
          onClick={() => onOpenDM(friend)}
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
          <button className="hidden group-hover:flex w-8 h-8 bg-gray-700 rounded-full items-center justify-center text-gray-300 hover:text-white">
            💬
          </button>
        </div>
      ))}
    </div>
  )
}