const CryptoJS = require('crypto-js')

const db = require('./db')

async function main() {
  await db.connect()

  if (!db.isConnected()) return process.exit(0)
  console.log('database ready to use.')

  const limit = 100
  
  try {
    const counts = await db.query.select().count('id').from('shipping')
    const totalItem = counts[0].count
    const totalPage = Math.round(totalItem / limit)
    console.log('totalItem: ', totalItem)
    console.log('limit: ', limit)
    console.log('totalPage: ', totalPage)
    
    for (let i = 0; i < totalPage; ++i) {
      const updateLists = []
      const offset = i * limit;
      console.log('page:', i)
      console.log('offset:', offset)
      const result = await db.query.select('id', 'order_no','shipping_zipcode').from('shipping').limit(limit).offset(offset)
      for (const data of result) {
        console.log(' =========== order_no =========== ', data.order_no);
        const partnerId = await db.query.select('partner_id').from('orders').where({ order_no: data.order_no })
        const resultPartner = await db.query.select('id', 'secret_key').from('partners').where({ id: partnerId[0].partner_id })
        const secret = getSecretByPartner(resultPartner[0].id, resultPartner[0].secret_key)
        if (/^[0-9]{5}/i.test(data.shipping_zipcode)) continue
        updateLists.push({
          id: data.id,
          shipping_zipcode: await decryptData(data.shipping_zipcode, secret)
        })
      }
      console.log('updateLists: ', updateLists);

      console.log('updating db')
      for (const updateData of updateLists) {
        await db.query.from('shipping').where({id: updateData.id }).update({
          shipping_zipcode: updateData.shipping_zipcode,
          update_dt: new Date(),
          update_by: 'script decrypt_shipping_code'
        })
        console.log('update db success')
      }
    }
  } catch (error) {
    console.log('error: ', error);
    process.exit(1)
  }
  process.exit(0)
}

function decryptData(ciphertext, secret) {
  // Convert the key to a WordArray object
  const keyWordArray = CryptoJS.enc.Utf8.parse(secret)
  // Convert the ciphertext from Base64 to a WordArray object
  const ciphertextWordArray = CryptoJS.enc.Base64.parse(ciphertext)

  // Extract the IV from the ciphertext
  const iv = ciphertextWordArray.clone()
  iv.sigBytes = 16

  // Remove the IV from the ciphertext
  ciphertextWordArray.words.splice(0, 4) // Assuming 4 words per block (e.g., 128-bit block size)
  ciphertextWordArray.sigBytes -= 16 // Assuming 16 bytes for the IV

  // Convert the ciphertext to a string representation
  const ciphertextString = CryptoJS.enc.Base64.stringify(ciphertextWordArray)

  // Decrypt the data using AES
  const decryptedData = CryptoJS.AES.decrypt(ciphertextString, keyWordArray, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
  })

  // Convert the decrypted data to a Utf8 string
  let decryptedString = decryptedData.toString(CryptoJS.enc.Utf8)
  try {
      decryptedString = JSON.parse(decryptedString)
  } catch (error) {
  }
  return decryptedString
}

function getSecretByPartner(p, s) {
  const secret = p + s
  return secret.slice(0, 24)
}

main()
