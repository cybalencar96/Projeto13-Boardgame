import dotenv from 'dotenv'

const path = process.env.NODE_ENV === 'prod' ? '.env' : '.env.test'

dotenv.config({
    path,
})