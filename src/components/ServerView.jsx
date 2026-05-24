import { useState, useEffect, useRef } from 'react'
import { db, auth } from '../firebase'
import {
  collection, query, where, onSnapshot,
  addDoc, orderBy, serverTimestamp
} from 'firebase/firestore'

export default function ServerView({ server }) {
  const [channels, setChannels] = useState([])
  const [activeChannel, setActiveChannel] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const bottomRef = useRef(null)

  // Load channels
  useEffect(() => {
    const q = query(collection(db, 'channels'), where('serverId', '==', server.id))
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setChannels(list)
      if (list.length > 0 && !activeChannel) setActiveChannel(list[0])
    })
    return unsub
  }, [server.id])

  // Load messages
  useEffect(() => {
    if (!activeChannel) return
    const q = query(
      collection(db, 'serverMessages', activeChannel.id, 'messages'),
      orderBy('createdAt', 'asc')
    )
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return unsub
  }, [activeChannel])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || !activeChannel) return
    const text = input
    setInput('')
    await addDoc(collection(db, 'serverMessages', activeChannel.id, 'messages'), {
      text,
      uid: auth.currentUser.uid,
      displayName: auth.currentUser.displayName || auth.currentUser.email,
      photoURL: auth.currentUser.photoURL || '',
      createdAt: serverTimestamp()
    })
  }

  return (
    <div className="flex flex-1 h-full">
      {/* Channel Sidebar */}
      <div className="w-60 bg-gray-800 flex flex-col">
        {/* Server Name */}
        <div className="p-4 border-b border-gray-900 font-bold text-white shadow-md">
          {server.name}
        </div>

        {/* Channels */}
        <div className="flex-1 px-2 pt-3">
          <p className="text-gray-500 text-xs font-bold px-2 mb-1 uppercase">Text Channels</p>
          {channels.map(channel => (
            <div
              key={channel.id}
              onClick={() => setActiveChannel(channel)}
              className={`flex items-center gap-1 px-2 py-1 rounded cursor-pointer text-sm mb-0.5 ${
                activeChannel?.id === channel.id
                  ? 'bg-gray-600 text-white'
                  : 'text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <span className="text-gray-400">#</span> {channel.name}
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-900 font-bold flex items-center gap-2 shadow-md">
          <span className="text-gray-400">#</span>
          {activeChannel?.name || 'Select a channel'}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-2">
              <span className="text-4xl">#</span>
              <p className="font-bold text-white text-lg">Welcome to #{activeChannel?.name}!</p>
              <p className="text-sm">This is the start of the channel.</p>
            </div>
          )}
          {messages.map(msg => (
            <div key={msg.id} className="flex items-start gap-3 hover:bg-gray-600 p-2 rounded group">
              {msg.photoURL ? (
                <img src={msg.photoURL} className="w-9 h-9 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-9 h-9 bg-indigo-500 rounded-full flex items-center justify-center font-bold shrink-0">
                  {msg.displayName?.[0]?.toUpperCase()}
                </div>
              )}
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-sm">{msg.displayName}</span>
                  <span className="text-xs text-gray-400">
                    {msg.createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-sm text-gray-200 break-all">{msg.text}</p>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="p-4">
          <div className="flex items-center bg-gray-600 rounded-lg px-4 py-2 gap-2">
            <input
              className="flex-1 bg-transparent outline-none text-sm placeholder-gray-400"
              placeholder={`Message #${activeChannel?.name || 'channel'}`}
              value={input}
              onChange={e => e.target.value.length <= 2000 && setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
            />
            {input.length > 1800 && (
              <span className={`text-xs ${input.length > 1950 ? 'text-red-400' : 'text-yellow-400'}`}>
                {2000 - input.length}
              </span>
            )}
            <button onClick={sendMessage} className="text-gray-400 hover:text-white">➤</button>
          </div>
        </div>
      </div>
    </div>
  )
}