process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0

const fs = require('fs')
const path = require('path')

const moment = require('moment')
const axios = require('axios').default

const db = require('./db')

async function main() {
  await db.connect()

  if (!db.isConnected()) return process.exit(0)
  console.log('database ready to use.')

  // load files
  const files = fs.readdirSync(path.join(process.cwd(), 'loader'))
  console.log('files: ', files)

  let i = 0
  try {
    for (const file of files) {
      const rawText = fs.readFileSync(path.join(process.cwd(), 'loader', file), 'utf-8')
      const jsonData = JSON.parse(rawText)
      console.log('length of file: ', jsonData.length)
      for(; i < jsonData.length; ++i) {
        console.log(`round: ${i}, Barcode : ${jsonData[i].items[0].barcode}`)

        if (jsonData[i]?.items.length > 1) return process.exit(1)

        const result = await db.query.select('*').from('tracking_status').where({
          tracking_no_tms: jsonData[i].items[0].barcode,
          status: jsonData[i].items[0].status,
        })

        console.log('result: ', result)
        if (result.length) {
          console.log('have status')
          continue
        }

        const headers = {
          'authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiOWVhMDkxODUtNzc3Ny00ZTFlLWE2ODctNWZmOGNmMjczZDdjIiwicHVibGljX2lkIjoic3lzdGVtQHJyLWNvbnNvbGlkYXRvci5pbyIsInB1YmxpY19pZF90eXBlIjoiZW1haWwiLCJyb2xlIjoic3lzdGVtIiwic2NvcGUiOlsiZnVsbC1hY2Nlc3MiXSwiaWF0IjoxNjkwNDQ3MTY4fQ.WwaG9mv3fTZlb5fhSr1tsa23MB-eenumC7PXfPP1cVY',
          'x-session-id': `${i}:${Date.now()}`
        }
        // const body = jsonData[i].items
        const body = {
          items: jsonData[i].items
        }

        const response = await axios.post('https://rr-consolidator.io/service-cs/api/tracking/thp/status', body, {headers})
        // console.log('response: ', response.data)
        console.log(' ================== update success. ================== ')
      }
    }
  } catch (error) {
    console.log('error round : ', i)
    console.log('error: ', error.message)
    process.exit(1)
  }
}

main()
