// The household member picked on this device (the avatar in the header),
// recorded as whoever adds or buys things from this phone.
const LAST_MEMBER_KEY = 'grocery-app:last-member-id'

// storage can throw in private browsing or with site data blocked
export function getDeviceMemberId() {
  try {
    return localStorage.getItem(LAST_MEMBER_KEY) || ''
  } catch {
    return ''
  }
}

export function setDeviceMemberId(memberId) {
  try {
    if (memberId) localStorage.setItem(LAST_MEMBER_KEY, memberId)
    else localStorage.removeItem(LAST_MEMBER_KEY)
  } catch {
    // not remembered on this device; nothing else depends on it
  }
}

// Set once someone taps "Not now" on the first-run "Who's using this
// phone?" prompt, so it doesn't come back on every visit.
const PROMPT_DISMISSED_KEY = 'grocery-app:member-prompt-dismissed'

export function getMemberPromptDismissed() {
  try {
    return localStorage.getItem(PROMPT_DISMISSED_KEY) === '1'
  } catch {
    return false
  }
}

export function setMemberPromptDismissed() {
  try {
    localStorage.setItem(PROMPT_DISMISSED_KEY, '1')
  } catch {
    // the prompt may show again next visit; harmless
  }
}
