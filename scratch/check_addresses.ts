import { getAddress } from 'viem'

const addresses = [
  '0x3E325B45F72dFCc3875f75b5933A5da183Ec4225',
  '0x62B8B11039fcfE5AB0C56E502b1C372A3D2a9C7A',
  '0x43d72Ff17701B2DA814620735C39C620Ce0ea4A1',
  '0xC361A6E67822a0EDc17D899227dd9FC50BD62F42',
  '0xcfA132E353cB4E398080B9700609bb008eceB125'
]

addresses.forEach(a => {
  try {
    console.log(`${a} => ${getAddress(a)}`)
  } catch (e) {
    console.log(`${a} => INVALID`)
  }
})
