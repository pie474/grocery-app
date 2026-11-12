// One-time card at the top of the content asking who's using this phone,
// instead of a permanent "Who are you?" chip in the header. After "Not
// now" it doesn't come back; the header avatar still lets you choose.
export default function MemberPrompt({ members, onChoose, onDismiss }) {
  return (
    <section className="member-prompt" aria-labelledby="member-prompt-title">
      <h2 id="member-prompt-title">Who's using this phone?</h2>
      <p>Things you add or buy here will show your name.</p>
      <div className="member-prompt-choices">
        {members.map((m) => (
          <button key={m.id} type="button" onClick={() => onChoose(m.id)}>
            <span className="member-avatar" aria-hidden="true">
              {m.name.trim().charAt(0).toUpperCase()}
            </span>
            {m.name}
          </button>
        ))}
      </div>
      <button type="button" className="member-prompt-dismiss" onClick={onDismiss}>
        Not now
      </button>
    </section>
  )
}
