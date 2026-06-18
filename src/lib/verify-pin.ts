const ADMIN_PIN = '0412'

export function verifyPin(action: string = '진행'): boolean {
  const input = window.prompt(`${action}하려면 관리 비밀번호를 입력하세요.`)
  if (input === null) return false
  if (input !== ADMIN_PIN) {
    window.alert('비밀번호가 일치하지 않습니다.')
    return false
  }
  return true
}
