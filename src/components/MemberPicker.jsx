// Top-right "who's using this phone" chip, where an account button would
// usually be. The native <select> is laid invisibly over the chip so a tap
// opens the phone's own picker.
export default function MemberPicker({ members, memberId, onChange }) {
  const member = members.find((m) => m.id === memberId)

  return (
    <label className={member ? 'member-picker' : 'member-picker unset'}>
      <span className="member-avatar" aria-hidden="true">
        {member ? member.name.trim().charAt(0).toUpperCase() : '?'}
      </span>
      <span className="member-picker-name">{member ? member.name : 'Who are you?'}</span>
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
