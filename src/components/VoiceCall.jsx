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
    <div className="absolute inset-x-0 top-0 bg-gray-800 border-b-2 border-gray-900 z-40">
      <div className="flex items-center justify-between px-6 py-3">

        {/* Left: Avatar + Name + Status */}
        <div className="flex items-center gap-3">
          {friend.photoURL ? (
            <img src={friend.photoURL} className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center text-lg font-bold text-white">
              {friend.displayName?.[0]?.toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-white font-bold text-sm">{friend.displayName}</p>
            <p className={`text-xs ${status === 'active' ? 'text-green-400' : 'text-yellow-400'}`}>
              {status === 'active' ? '● Voice Connected' : '● Calling...'}
            </p>
          </div>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            title={isMuted ? 'Unmute' : 'Mute'}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition text-white ${isMuted ? 'bg-red-500 hover:bg-red-400' : 'bg-gray-600 hover:bg-gray-500'}`}
          >
            {isMuted ? '🔇' : '🎤'}
          </button>
          <button
            onClick={toggleDeafen}
            title={isDeafened ? 'Undeafen' : 'Deafen'}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition text-white ${isDeafened ? 'bg-red-500 hover:bg-red-400' : 'bg-gray-600 hover:bg-gray-500'}`}
          >
            {isDeafened ? '🔕' : '🎧'}
          </button>
          <button
            onClick={endCall}
            title="End Call"
            className="w-9 h-9 bg-red-500 hover:bg-red-400 rounded-full flex items-center justify-center transition text-white"
          >
            📵
          </button>
        </div>
      </div>

      <audio ref={remoteAudioRef} autoPlay />
    </div>
  )
}