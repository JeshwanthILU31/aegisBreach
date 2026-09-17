import 'dotenv/config'
import app from './app.js'
import { connectDatabase } from './config/db.js'

const port = process.env.PORT || 5000

try {
  await connectDatabase()
  app.listen(port, () => {
    console.log(`Server running on port ${port}`)
  })
} catch (error) {
  console.error('Server startup failed:', error.message)
  process.exit(1)
}
