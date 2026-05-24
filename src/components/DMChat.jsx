import { useState, useEffect, useRef } from 'react'
import { db, auth } from '../firebase'
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  doc,
  deleteDoc
} from 'firebase/firestore'
import VoiceCall from './VoiceCall'
import IncomingCall from './IncomingCall'

export default function DMChat({ friend, dmId }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [inCall, setInCall] = useState(false)
  const [incomingCall, setIncomingCall] = useState(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    const q = query(
      collection(db, 'dms', dmId, 'messages'),
      orderBy('createdAt', 'asc')
    )
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return unsub
  }, [dmId])

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'calls', dmId), (snap) => {
      if (snap.exists()) {
        const data = snap.data()
        if (data.receiverId === auth.currentUser.uid && data.status === 'calling') {
          setIncomingCall(data)
        }
      } else {
        setIncomingCall(null)
      }
    })
    return unsub
  }, [dmId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim()) return
    if (input.length > 2000) return
    const text = input
    setInput('')
    await addDoc(collection(db, 'dms', dmId, 'messages'), {
      text,
      uid: auth.currentUser.uid,
      displayName: auth.currentUser.displayName || auth.currentUser.email,
      photoURL: auth.currentUser.photoURL || '',
      createdAt: serverTimestamp()
    })
  }

  return (
    <div className="flex-1 flex flex-col h-full">

      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-900 flex items-center gap-2 shadow-md">
        {friend.photoURL ? (
          <img src={friend.photoURL} className="w-7 h-7 rounded-full object-cover" />
        ) : (
          <div className="w-7 h-7 bg-indigo-500 rounded-full flex items-center justify-center font-bold text-xs">
            {friend.displayName?.[0]?.toUpperCase()}
          </div>
        )}
        <span className="font-bold">{friend.displayName}</span>
        <button
          onClick={() => setInCall(true)}
          className="ml-auto w-8 h-8 bg-gray-700 hover:bg-green-600 rounded flex items-center justify-center text-gray-300 hover:text-white transition"
          title="Voice Call"
        >
          📞
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-2">
            <div className="w-16 h-16 bg-indigo-500 rounded-full flex items-center justify-center text-2xl font-bold text-white">
              {friend.displayName?.[0]?.toUpperCase()}
            </div>
            <p className="font-bold text-white text-lg">{friend.displayName}</p>
            <p className="text-sm">This is the beginning of your DM with {friend.displayName}.</p>
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
            placeholder={`Message @${friend.displayName}`}
            value={input}
            onChange={e => e.target.value.length <= 2000 && setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            maxLength={2000}
          />
          {input.length > 1800 && (
            <span className={`text-xs ${input.length > 1950 ? 'text-red-400' : 'text-yellow-400'}`}>
              {2000 - input.length}
            </span>
          )}
          <button onClick={sendMessage} className="text-gray-400 hover:text-white">➤</button>
        </div>
      </div>

      {/* Voice Call */}
      {inCall && (
        <VoiceCall
          friend={friend}
          dmId={dmId}
          onEnd={() => setInCall(false)}
        />
      )}

      {/* Incoming Call */}
      {incomingCall && !inCall && (
        <IncomingCall
          call={incomingCall}
          onAccept={() => { setIncomingCall(null); setInCall(true) }}
          onDecline={async () => {
            await deleteDoc(doc(db, 'calls', dmId))
            setIncomingCall(null)
          }}
        />
      )}

    </div>
  )
}