<div className="flex-1 overflow-hidden">
  {showAddFriend ? (
    <AddFriend onClose={() => setShowAddFriend(false)} />
  ) : activeTab === 'Pending' ? (
    <FriendRequests />
  ) : (
    <div className="flex-1 h-full flex items-center justify-center flex-col gap-3 text-gray-500">
      <span className="text-5xl">👥</span>
      <p className="font-bold text-white">No friends yet!</p>
      <p className="text-sm">Click Add Friend to get started.</p>
    </div>
  )}
</div>