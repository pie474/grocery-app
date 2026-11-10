// Top-right avatar for "who's using this phone", where an account button
// would usually be. The native <select> is laid invisibly over the avatar
// so a tap opens the phone's own picker.
export default function MemberPicker({ members, memberId, onChange }) {
  const member = members.find((m) => m.id === memberId)

  return (
    <label
      className={member ? 'member-picker' : 'member-picker unset'}
      title={member ? member.name : 'Who are you?'}
    >
      <span className="member-avatar" aria-hidden="true">
        {member ? member.name.trim().charAt(0).toUpperCase() : <PersonIcon />}
      </span>
      <select
        aria-label="Who's using this phone"
        value={member ? member.id : ''}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Not set</option>
        {members.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>
    </label>
  )
}

function PersonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  )
}
