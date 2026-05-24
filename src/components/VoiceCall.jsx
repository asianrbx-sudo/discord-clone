import { useEffect, useRef, useState } from 'react'
import Peer from 'peerjs'
import { db, auth } from '../firebase'
import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'

export default function VoiceCall({ friend, dmId, onEnd }) {
  const [status, setStatus] = useState('connecting')
  const [isMuted, setIsMuted] = useState(false)
  const [isDeafened, setIsDeafened] = useState(false)
  const peerRef = useRef(null)
  const callRef = useRef(null)
  const streamRef = useRef(null)
  const remoteAudioRef = useRef(null)

  const peerId = `${dmId}_${auth.currentUser.uid}`
  const friendPeerId = `${dmId}_${friend.uid}`

  useEffect(() => {
    const peer = new Peer(peerId)
    peerRef.current = peer

    peer.on('open', async () => {
      await setDoc(doc(db, 'calls', dmId), {
        callerId: auth.currentUser.uid,
        callerName: auth.currentUser.displayName || auth.currentUser.email,
        callerPhoto: auth.currentUser.photoURL || '',
        receiverId: friend.uid,
        dmId,
        status: 'calling',
        createdAt: serverTimestamp()
      })

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        streamRef.current = stream
        const call = peer.call(friendPeerId, stream)
        callRef.current = call
        call.on('stream', (remoteStream) => {
          if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = remoteStream
            remoteAudioRef.current.play()
          }
          setStatus('active')
        })
        call.on('close', () => endCall())
        call.on('error', () => endCall())
      } catch (err) {
        endCall()
      }
    })

    peer.on('call', async (call) => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        streamRef.current = stream
        call.answer(stream)
        callRef.current = call
        call.on('stream', (remoteStream) => {
          if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = remoteStream
            remoteAudioRef.current.play()
          }
          setStatus('active')
        })
        call.on('close', () => endCall())
      } catch (err) {
        endCall()
      }
    })

    return () => { endCall() }
  }, [])

  const endCall = async () => {
    callRef.current?.close()
    peerRef.current?.destroy()
    streamRef.current?.getTracks().forEach(t => t.stop())
    try { await deleteDoc(doc(db, 'calls', dmId)) } catch {}
    setStatus('ended')
    onEnd()
  }

  const toggleMute = () => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach(t => { t.enabled = !t.enabled })
      setIsMuted(!isMuted)
    }
  }

  const toggleDeafen = () => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = !remoteAudioRef.current.muted
      setIsDeafened(!isDeafened)
    }
  }

  return (
    <div className="absolute inset-0 bg-gray-700 flex flex-col z-40">

      {/* Top bar */}
      <div className="px-4 py-3 border-b border-gray-900 flex items-center gap-2 shadow-md">
        {friend.photoURL ? (
          <img src={friend.photoURL} className="w-7 h-7 rounded-full object-cover" />
        ) : (
          <div className="w-7 h-7 bg-indigo-500 rounded-full flex items-center justify-center font-bold text-xs">
            {friend.displayName?.[0]?.toUpperCase()}
          </div>
        )}
        <span className="font-bold text-white">{friend.displayName}</span>
        <span className={`ml-2 text-xs ${status === 'active' ? 'text-green-400' : 'text-yellow-400'}`}>
          {status === 'active' ? '● Voice Connected' : '● Calling...'}
        </span>
      </div>

      {/* Main call area */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        {friend.photoURL ? (
          <img src={friend.photoURL} className="w-28 h-28 rounded-full object-cover" />
        ) : (
          <div className="w-28 h-28 bg-indigo-500 rounded-full flex items-center justify-center text-5xl font-bold text-white">
            {friend.displayName?.[0]?.toUpperCase()}
          </div>
        )}
        <p className="text-white font-bold text-xl">{friend.displayName}</p>
        <p className="text-gray-400 text-sm">
          {status === 'active' ? 'Voice Connected' : 'Calling...'}
        </p>
      </div>

      {/* Controls bar */}
      <div className="flex items-center justify-center gap-3 p-6 border-t border-gray-900">
        {/* Mute */}
        <button
          onClick={toggleMute}
          title={isMuted ? 'Unmute' : 'Mute'}
          className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition ${isMuted ? 'bg-red-500 hover:bg-red-400' : 'bg-gray-600 hover:bg-gray-500'}`}
        >
          <span className="text-xl">{isMuted ? '🔇' : '🎤'}</span>
          <span className="text-xs text-white">{isMuted ? 'Unmute' : 'Mute'}</span>
        </button>

        {/* Deafen */}
        <button
          onClick={toggleDeafen}
          title={isDeafened ? 'Undeafen' : 'Deafen'}
          className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition ${isDeafened ? 'bg-red-500 hover:bg-red-400' : 'bg-gray-600 hover:bg-gray-500'}`}
        >
          <span className="text-xl">{isDeafened ? '🔕' : '🎧'}</span>
          <span className="text-xs text-white">{isDeafened ? 'Undeafen' : 'Deafen'}</span>
        </button>

        {/* End Call */}
        <button
          onClick={endCall}
          className="flex flex-col items-center gap-1 px-6 py-2 bg-red-500 hover:bg-red-400 rounded-lg transition"
        >
          <span className="text-xl">📵</span>
          <span className="text-xs text-white">End Call</span>
        </button>
      </div>

      <audio ref={remoteAudioRef} autoPlay />
    </div>
  )
}