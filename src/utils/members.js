// The household member picked on this device (the chip in the header),
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
