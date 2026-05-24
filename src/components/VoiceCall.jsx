import { useEffect, useRef, useState } from 'react'
import Peer from 'peerjs'
import { db, auth } from '../firebase'
import { doc, setDoc, onSnapshot, deleteDoc, serverTimestamp } from 'firebase/firestore'

export default function VoiceCall({ friend, dmId, onEnd }) {
  const [status, setStatus] = useState('connecting') // connecting | active | ended
  const [isMuted, setIsMuted] = useState(false)
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
      // Signal to friend that we're calling
      await setDoc(doc(db, 'calls', dmId), {
        callerId: auth.currentUser.uid,
        callerName: auth.currentUser.displayName || auth.currentUser.email,
        callerPhoto: auth.currentUser.photoURL || '',
        receiverId: friend.uid,
        dmId,
        status: 'calling',
        createdAt: serverTimestamp()
      })

      // Get microphone
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        streamRef.current = stream

        // Call the friend
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
        setStatus('ended')
        onEnd()
      }
    })

    // Answer incoming calls
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

    return () => {
      endCall()
    }
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
      streamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled
      })
      setIsMuted(!isMuted)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-2xl p-8 w-80 flex flex-col items-center gap-4 shadow-2xl">

        {/* Avatar */}
        {friend.photoURL ? (
          <img src={friend.photoURL} className="w-20 h-20 rounded-full object-cover" />
        ) : (
          <div className="w-20 h-20 bg-indigo-500 rounded-full flex items-center justify-center text-3xl font-bold text-white">
            {friend.displayName?.[0]?.toUpperCase()}
          </div>
        )}

        <p className="text-white font-bold text-lg">{friend.displayName}</p>

        <p className="text-gray-400 text-sm">
          {status === 'connecting' ? 'Calling...' : status === 'active' ? 'Connected ✓' : 'Call ended'}
        </p>

        {/* Audio element */}
        <audio ref={remoteAudioRef} autoPlay />

        {/* Controls */}
        <div className="flex gap-4 mt-2">
          <button
            onClick={toggleMute}
            className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-xl ${isMuted ? 'bg-red-500' : 'bg-gray-600 hover:bg-gray-500'}`}
          >
            {isMuted ? '🔇' : '🎤'}
          </button>
          <button
            onClick={endCall}
            className="w-12 h-12 bg-red-500 hover:bg-red-400 rounded-full flex items-center justify-center text-white text-xl"
          >
            📵
          </button>
        </div>
      </div>
    </div>
  )
}