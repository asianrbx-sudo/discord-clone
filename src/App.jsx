import { useState, useEffect } from 'react'
import { auth, storage, db } from './firebase'
import { onAuthStateChanged, signOut, updateProfile } from 'firebase/auth'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { doc, setDoc, getDoc, serverTimestamp, collection, query, where, onSnapshot } from 'firebase/firestore'
import Auth from './components/Auth'
import AddFriend from './components/AddFriend'
import FriendRequests from './components/FriendRequests'
import FriendsList from './components/FriendsList'
import DMChat from './components/DMChat'
import CreateServer from './components/CreateServer'
import ServerView from './components/ServerView'

const tabs = ['Online', 'All', 'Pending', 'Blocked']

const statusOptions = [
  { value: 'online', label: 'Online', color: 'bg-green-500' },
  { value: 'idle', label: 'Idle', color: 'bg-yellow-500' },
  { value: 'dnd', label: 'Do Not Disturb', color: 'bg-red-500', desc: 'You will not receive desktop notifications' },
  { value: 'offline', label: 'Invisible', color: 'bg-gray-500', desc: 'You will appear offline' },
]

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('Online')
  const [activeNav, setActiveNav] = useState('friends')
  const [showProfile, setShowProfile] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [pronouns, setPronouns] = useState('')
  const [username, setUsername] = useState('')
  const [saved, setSaved] = useState(false)
  const [status, setStatus] = useState('online')
  const [muted, setMuted] = useState(false)
  const [deafened, setDeafened] = useState(false)
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const [showAddFriend, setShowAddFriend] = useState(false)
  const [activeDM, setActiveDM] = useState(null)
  const [dmList, setDmList] = useState([])
  const [pendingCount, setPendingCount] = useState(0)
  const [servers, setServers] = useState([])
  const [activeServer, setActiveServer] = useState(null)
  const [showCreateServer, setShowCreateServer] = useState(false)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        const userDoc = await getDoc(doc(db, 'users', u.uid))
        if (!userDoc.exists()) {
          await setDoc(doc(db, 'users', u.uid), {
            username: u.email?.split('@')[0].toLowerCase(),
            displayName: u.displayName || u.email?.split('@')[0],
            email: u.email,
            photoURL: u.photoURL || '',
            lastSeen: serverTimestamp()
          })
          setUsername(u.email?.split('@')[0] || '')
        } else {
          await setDoc(doc(db, 'users', u.uid), {
            lastSeen: serverTimestamp()
          }, { merge: true })
          setUsername(userDoc.data().username || u.email?.split('@')[0] || '')
        }
        setDisplayName(u.displayName || '')
      }
      setUser(u)
      setLoading(false)
    })
    return unsub
  }, [])

  useEffect(() => {
    if (!user) return
    const q = query(
      collection(db, 'friendRequests'),
      where('to', '==', user.uid),
      where('status', '==', 'pending')
    )
    const unsub = onSnapshot(q, (snap) => {
      setPendingCount(snap.size)
    })
    return unsub
  }, [user])

  useEffect(() => {
    if (!user) return
    const q = query(
      collection(db, 'servers'),
      where('members', 'array-contains', user.uid)
    )
    const unsub = onSnapshot(q, (snap) => {
      setServers(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return unsub
  }, [user])

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const storageRef = ref(storage, `avatars/${user.uid}`)
    await uploadBytes(storageRef, file)
    const url = await getDownloadURL(storageRef)
    await updateProfile(auth.currentUser, { photoURL: url })
    setUser({ ...user, photoURL: url })
  }

  const handleSaveName = async () => {
    await updateProfile(auth.currentUser, { displayName })
    await setDoc(doc(db, 'users', user.uid), {
      displayName,
      username: username.toLowerCase(),
      pronouns
    }, { merge: true })
    setUser({ ...user, displayName })
    setSaved(true)
    setTimeout(() => { setSaved(false); setEditingName(false) }, 1500)
  }

  const handleOpenDM = (friend) => {
    const dmId = [auth.currentUser.uid, friend.uid].sort().join('_')
    setActiveDM({ friend, dmId })
    setActiveNav('dm')
    setActiveServer(null)
    setShowAddFriend(false)
    setDmList(prev => {
      if (prev.find(d => d.uid === friend.uid)) return prev
      return [...prev, friend]
    })
  }

  const handleOpenServer = (server) => {
    setActiveServer(server)
    setActiveNav('server')
    setActiveDM(null)
    setShowAddFriend(false)
  }

  const currentStatus = statusOptions.find(s => s.value === status)

  if (loading) return (
    <div className="min-h-screen bg-gray-700 flex items-center justify-center text-white text-xl">
      Loading...
    </div>
  )

  if (!user) return <Auth />

  return (
    <div
      className="flex h-screen bg-gray-700 text-white text-sm"
      onClick={() => { setShowProfile(false); setShowStatusMenu(false) }}
    >

      {/* Server Icons */}
      <div className="w-16 bg-gray-900 flex flex-col items-center py-3 gap-2 overflow-y-auto">
        <div
          onClick={(e) => { e.stopPropagation(); setActiveNav('friends'); setActiveServer(null); setActiveDM(null) }}
          className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold cursor-pointer hover:rounded-xl transition-all ${activeNav === 'friends' || activeNav === 'dm' ? 'bg-indigo-500' : 'bg-gray-700 hover:bg-indigo-500'}`}
        >
          D
        </div>
        <div className="w-8 border-t border-gray-600 my-1"></div>

        {servers.map(server => (
          <div
            key={server.id}
            onClick={(e) => { e.stopPropagation(); handleOpenServer(server) }}
            title={server.name}
            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold cursor-pointer hover:rounded-xl transition-all text-white ${activeServer?.id === server.id ? 'bg-indigo-500 rounded-xl' : 'bg-gray-700 hover:bg-indigo-500'}`}
          >
            {server.icon || server.name[0].toUpperCase()}
          </div>
        ))}

        <div
          onClick={(e) => { e.stopPropagation(); setShowCreateServer(true) }}
          className="w-10 h-10 bg-gray-700 hover:bg-green-500 rounded-full hover:rounded-xl transition-all flex items-center justify-center cursor-pointer text-green-400 hover:text-white font-bold text-lg"
        >
          +
        </div>
      </div>

      {/* DM Sidebar */}
      {activeNav !== 'server' && (
        <div className="w-60 bg-gray-800 flex flex-col">
          <div className="p-3">
            <div className="bg-gray-900 rounded px-2 py-1 text-gray-400 text-xs cursor-pointer">
              Find or start a conversation
            </div>
          </div>

          <div
            onClick={(e) => { e.stopPropagation(); setActiveNav('friends'); setShowAddFriend(false); setActiveDM(null) }}
            className={`mx-2 px-2 py-2 rounded flex items-center gap-2 cursor-pointer ${activeNav === 'friends' ? 'bg-gray-600 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}
          >
            <span>👥</span> Friends
            {pendingCount > 0 && (
              <span className="ml-auto w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </div>

          <p className="text-gray-500 text-xs font-bold px-4 mt-4 mb-1 uppercase">Direct Messages</p>
          {dmList.length === 0 && <p className="text-gray-500 text-xs px-4 mt-2">No DMs yet</p>}
          {dmList.map(friend => (
            <div
              key={friend.uid}
              onClick={(e) => { e.stopPropagation(); handleOpenDM(friend) }}
              className={`mx-2 px-2 py-1.5 rounded flex items-center gap-2 cursor-pointer ${activeDM?.friend.uid === friend.uid ? 'bg-gray-600 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}
            >
              {friend.photoURL ? (
                <img src={friend.photoURL} className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center font-bold text-xs">
                  {friend.displayName?.[0]?.toUpperCase()}
                </div>
              )}
              <div className="flex-1 overflow-hidden">
                <p className="font-medium text-white truncate text-xs">{friend.displayName}</p>
              </div>
            </div>
          ))}

          {/* Profile Card + User Panel */}
          <div className="mt-auto">
            {showProfile && (
              <div className="bg-gray-800 border border-gray-700 rounded-lg mx-2 mb-2 overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="h-12 bg-indigo-600 relative">
                  <div className="absolute -bottom-6 left-3">
                    <label className="cursor-pointer group relative block">
                      {user.photoURL ? (
                        <img src={user.photoURL} className="w-12 h-12 rounded-full border-4 border-gray-800 object-cover" />
                      ) : (
                        <div className="w-12 h-12 bg-purple-500 rounded-full border-4 border-gray-800 flex items-center justify-center text-lg font-bold">
                          {user?.email?.[0].toUpperCase()}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                        <span className="text-white text-xs">✏️</span>
                      </div>
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </label>
                  </div>
                </div>

                <div className="pt-8 px-3 pb-3">
                  {!editingName ? (
                    <>
                      <p className="font-bold text-white">{user?.displayName || 'No name set'}</p>
                      <p className="text-gray-400 text-xs">@{username}</p>
                      {pronouns && <p className="text-gray-400 text-xs">{pronouns}</p>}
                      <div className="relative mt-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); setShowStatusMenu(!showStatusMenu) }}
                          className="w-full text-left px-2 py-1.5 rounded hover:bg-gray-700 text-white text-xs flex items-center gap-2"
                        >
                          <span className={`w-2.5 h-2.5 rounded-full ${currentStatus.color}`}></span>
                          {currentStatus.label}
                          <span className="ml-auto text-gray-400">›</span>
                        </button>
                      </div>
                      <div className="border-t border-gray-700 mt-2 pt-2 flex flex-col gap-0.5">
                        <button onClick={() => setEditingName(true)} className="w-full text-left px-2 py-1.5 rounded hover:bg-gray-700 text-white text-xs flex items-center gap-2">
                          ✏️ Edit Profile
                        </button>
                        <button onClick={() => signOut(auth)} className="w-full text-left px-2 py-1.5 rounded hover:bg-gray-700 text-red-400 text-xs flex items-center gap-2">
                          ↪ Sign Out
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <label className="text-gray-400 text-xs font-bold uppercase mb-1 block">Display Name</label>
                      <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} className="w-full bg-gray-900 text-white rounded px-2 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500 mb-2 text-xs" />
                      <label className="text-gray-400 text-xs font-bold uppercase mb-1 block">Username</label>
                      <input type="text" value={username} onChange={e => setUsername(e.target.value.toLowerCase())} className="w-full bg-gray-900 text-white rounded px-2 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500 mb-2 text-xs" />
                      <label className="text-gray-400 text-xs font-bold uppercase mb-1 block">Pronouns</label>
                      <input type="text" value={pronouns} onChange={e => setPronouns(e.target.value)} placeholder="e.g. he/him" className="w-full bg-gray-900 text-white rounded px-2 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500 mb-3 text-xs" />
                      {saved && <p className="text-green-400 text-xs mb-2">✓ Saved!</p>}
                      <div className="flex gap-2">
                        <button onClick={() => setEditingName(false)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-1.5 rounded text-xs">Cancel</button>
                        <button onClick={handleSaveName} className="flex-1 bg-indigo-500 hover:bg-indigo-400 text-white font-bold py-1.5 rounded text-xs">Save</button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {showStatusMenu && (
              <div
                className="fixed bg-gray-900 rounded-lg shadow-lg overflow-hidden z-50 w-56"
                style={{ bottom: '80px', left: '245px' }}
                onClick={e => e.stopPropagation()}
              >
                {statusOptions.map(s => (
                  <button
                    key={s.value}
                    onClick={() => { setStatus(s.value); setShowStatusMenu(false) }}
                    className="w-full text-left px-3 py-2.5 hover:bg-gray-700 flex items-center gap-3 border-b border-gray-800 last:border-0"
                  >
                    <span className={`w-3 h-3 rounded-full shrink-0 ${s.color}`}></span>
                    <div>
                      <p className="text-white text-xs font-medium">{s.label}</p>
                      {s.desc && <p className="text-gray-400 text-xs">{s.desc}</p>}
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="p-2 bg-gray-900 flex items-center gap-2">
              <div
                className="relative cursor-pointer"
                onClick={(e) => { e.stopPropagation(); setShowProfile(!showProfile); setEditingName(false) }}
              >
                {user.photoURL ? (
                  <img src={user.photoURL} className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center font-bold text-xs">
                    {user.email?.[0].toUpperCase()}
                  </div>
                )}
                <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 ${currentStatus.color} rounded-full border-2 border-gray-900`}></span>
              </div>
              <div
                className="flex-1 overflow-hidden cursor-pointer"
                onClick={(e) => { e.stopPropagation(); setShowProfile(!showProfile); setEditingName(false) }}
              >
                <p className="font-bold text-xs leading-none truncate">{user.displayName || user.email}</p>
                <p className="text-xs text-gray-400">{currentStatus.label}</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setMuted(!muted)} title={muted ? 'Unmute' : 'Mute'} className={`w-7 h-7 rounded flex items-center justify-center hover:bg-gray-700 ${muted ? 'text-red-400' : 'text-gray-400 hover:text-white'}`}>
                  {muted ? '🔇' : '🎤'}
                </button>
                <button onClick={() => setDeafened(!deafened)} title={deafened ? 'Undeafen' : 'Deafen'} className={`w-7 h-7 rounded flex items-center justify-center hover:bg-gray-700 ${deafened ? 'text-red-400' : 'text-gray-400 hover:text-white'}`}>
                  {deafened ? '🔕' : '🎧'}
                </button>
                <button title="Settings" className="w-7 h-7 rounded flex items-center justify-center hover:bg-gray-700 text-gray-400 hover:text-white">⚙️</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Area */}
      <div className="flex-1 flex overflow-hidden">
        {activeNav === 'server' && activeServer ? (
          <ServerView server={activeServer} />
        ) : activeNav === 'dm' && activeDM ? (
          <DMChat friend={activeDM.friend} dmId={activeDM.dmId} />
        ) : (
          <div className="flex-1 flex flex-col">
            <div className="px-4 py-3 border-b border-gray-900 flex items-center gap-4 shadow-md">
              <span className="font-bold flex items-center gap-2">👥 Friends</span>
              <div className="flex gap-1">
                {tabs.map(tab => (
                  <button
                    key={tab}
                    onClick={() => { setActiveTab(tab); setShowAddFriend(false) }}
                    className={`px-3 py-1 rounded text-sm relative ${activeTab === tab && !showAddFriend ? 'bg-gray-600 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}
                  >
                    {tab}
                    {tab === 'Pending' && pendingCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">
                        {pendingCount}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowAddFriend(true)}
                className={`ml-auto px-3 py-1 rounded font-medium text-sm ${showAddFriend ? 'bg-gray-600 text-white' : 'bg-green-600 hover:bg-green-500 text-white'}`}
              >
                Add Friend
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              {showAddFriend ? (
                <AddFriend onClose={() => setShowAddFriend(false)} />
              ) : activeTab === 'Pending' ? (
                <FriendRequests />
              ) : activeTab === 'All' || activeTab === 'Online' ? (
                <FriendsList onOpenDM={handleOpenDM} />
              ) : (
                <div className="flex-1 h-full flex items-center justify-center flex-col gap-3 text-gray-500">
                  <span className="text-5xl">👥</span>
                  <p className="font-bold text-white">Nothing here yet!</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Create Server Modal */}
      {showCreateServer && (
        <CreateServer
          onClose={() => setShowCreateServer(false)}
          onCreated={() => setShowCreateServer(false)}
        />
      )}

    </div>
  )
}