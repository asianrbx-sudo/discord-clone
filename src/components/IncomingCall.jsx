import { useEffect } from 'react'

export default function IncomingCall({ call, onAccept, onDecline }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-2xl p-8 w-80 flex flex-col items-center gap-4 shadow-2xl">

        {/* Avatar */}
        {call.callerPhoto ? (
          <img src={call.callerPhoto} className="w-20 h-20 rounded-full object-cover" />
        ) : (
          <div className="w-20 h-20 bg-indigo-500 rounded-full flex items-center justify-center text-3xl font-bold text-white">
            {call.callerName?.[0]?.toUpperCase()}
          </div>
        )}

        <p className="text-white font-bold text-lg">{call.callerName}</p>
        <p className="text-gray-400 text-sm">Incoming voice call...</p>

        <div className="flex gap-6 mt-2">
          <button
            onClick={onDecline}
            className="w-14 h-14 bg-red-500 hover:bg-red-400 rounded-full flex items-center justify-center text-white text-2xl"
          >
            📵
          </button>
          <button
            onClick={onAccept}
            className="w-14 h-14 bg-green-500 hover:bg-green-400 rounded-full flex items-center justify-center text-white text-2xl"
          >
            📞
          </button>
        </div>
      </div>
    </div>
  )
}